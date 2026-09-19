import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';
import { createClient } from '@supabase/supabase-js';
import { createFrameCanvas, drawSceneFrame } from './drawing';

// Frames are drawn with a real 2D graphics context and piped to ffmpeg, so
// this is the animation's frame rate as well as the output's.
const FRAME_RATE = 24;

// Containers on Railway (and similar platforms) commonly report the HOST's
// full CPU count via nproc/sysconf even though a much stricter cgroup
// limit actually applies - x264's default thread count follows that
// reported count (e.g. "threads=60" was observed live), which can over-
// allocate encoder buffers/threads and get the process OOM-killed almost
// immediately (confirmed live: ffmpeg was killed by signal within ~6s).
// Pinning a small explicit thread count avoids this regardless of what
// the container reports.
const ENCODER_THREADS = Number(process.env.FFMPEG_THREADS ?? 2);

type CharacterType = 'broker' | 'cliente' | 'pareja' | 'hombre' | 'mujer' | 'generico';
type SceneAction = 'hablar' | 'caminar' | 'senalar' | 'sentarse' | 'pensar' | 'telefono' | 'mostrar_objeto';
type ScenePropType = 'ninguno' | 'casa' | 'carro' | 'banco' | 'telefono' | 'documento' | 'dinero' | 'grafico' | 'oficina';
type Platform = 'reels' | 'tiktok' | 'shorts';
type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type RenderScene = {
	order: number;
	character: CharacterType;
	action: SceneAction;
	prop: ScenePropType;
	description: string;
	duration_seconds: number;
	audio_url: string | null;
};

type Branding = {
	logo_url: string | null;
	logo_position: LogoPosition;
	primary_color: string;
	secondary_color: string;
	font_family: string;
};

type RenderJob = {
	id?: string;
	platform: Platform;
	branding: Branding;
	scenes: RenderScene[];
};

const port = Number(process.env.PORT ?? 8080);
const renderDirectory = join(process.cwd(), 'renders');
const storageBucket = process.env.SUPABASE_RENDERS_BUCKET ?? 'renders';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const storageClient = supabaseUrl && supabaseServiceRoleKey
	? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
	: null;

if (!storageClient) {
	console.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no configuradas: los MP4 solo se guardaran en el filesystem local (no sobreviven un redeploy).');
}

// Surfaced on /health so it's possible to tell "storage was never configured"
// apart from "storage is configured but uploads are failing" without shell
// access to the container. Never holds credential values.
let lastStorageError: string | null = null;

// ---- Platform output dimensions (RF-014) ----
// Reels, TikTok and Shorts are all vertical short-form video with no real
// dimension difference between them, so all three map to the same 9:16 canvas.
const PLATFORM_DIMENSIONS: Record<Platform, { width: number; height: number }> = {
	reels: { width: 1080, height: 1920 },
	tiktok: { width: 1080, height: 1920 },
	shorts: { width: 1080, height: 1920 },
};

const DEFAULT_BRANDING: Branding = {
	logo_url: null,
	logo_position: 'top-left',
	primary_color: '#17202a',
	secondary_color: '#ffffff',
	font_family: 'Arial',
};

// ---- Branding colors (RF-026/RF-027 application, not capture) ----
// Frames are drawn on a canvas now, so these are CSS colors, not ffmpeg's
// 0xRRGGBB form - an invalid CSS color is ignored silently by the canvas and
// would paint the brand background black.
const DEFAULT_BACKGROUND_COLOR = '#17202a';
const DEFAULT_TEXT_COLOR = '#ffffff';
const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/;

function toCssHexColor(value: unknown, fallback: string): string {
	if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value.trim())) {
		return `#${value.trim().replace(/^#/, '')}`;
	}
	return fallback;
}

async function uploadToSupabase(filePath: string, filename: string): Promise<string | null> {
	if (!storageClient) return null;

	try {
		const fileBuffer = await readFile(filePath);
		const { error: uploadError } = await storageClient.storage.from(storageBucket).upload(filename, fileBuffer, {
			contentType: 'video/mp4',
			upsert: true,
		});
		if (uploadError) throw uploadError;

		const { data } = storageClient.storage.from(storageBucket).getPublicUrl(filename);
		if (!data?.publicUrl) throw new Error('No se obtuvo una URL publica del bucket.');

		await unlink(filePath).catch(() => undefined);
		lastStorageError = null;
		return data.publicUrl;
	} catch (error) {
		lastStorageError = error instanceof Error ? error.message : String(error);
		console.warn('Fallo al subir el render a Supabase Storage, se conserva en disco local.', error);
		return null;
	}
}

function getLogoOverlayPosition(position: LogoPosition | undefined): string {
	switch (position) {
		case 'top-right': return 'W-w-24:24';
		case 'bottom-left': return '24:H-h-24';
		case 'bottom-right': return 'W-w-24:H-h-24';
		case 'top-left':
		default: return '24:24';
	}
}

// Applies the brand logo (RF-026 application) as an overlay on the final,
// already-concatenated video. If the logo URL is unreachable or ffmpeg fails
// on it, this degrades gracefully to the un-logo'd video instead of failing
// the whole render, matching this file's existing resilience-over-hard-failure
// convention (see uploadToSupabase above).
async function applyLogoOverlayOrFallback(sourcePath: string, destinationPath: string, branding: Branding): Promise<void> {
	const logoUrl = typeof branding.logo_url === 'string' && branding.logo_url.trim().length > 0
		? branding.logo_url.trim()
		: null;

	if (!logoUrl) {
		await rename(sourcePath, destinationPath);
		return;
	}

	try {
		const overlayPosition = getLogoOverlayPosition(branding.logo_position);
		await runFfmpeg([
			'-y',
			'-i', sourcePath,
			'-i', logoUrl,
			'-filter_complex', `[1:v]scale=160:-1[logo];[0:v][logo]overlay=${overlayPosition}[outv]`,
			'-map', '[outv]',
			'-map', '0:a',
			'-c:v', 'libx264',
			'-threads', String(ENCODER_THREADS),
			'-c:a', 'copy',
			'-pix_fmt', 'yuv420p',
			'-movflags', '+faststart',
			destinationPath,
		]);
	} catch (error) {
		console.warn('Fallo al aplicar el logo de marca sobre el render final, se conserva el video sin logo.', error);
		await unlink(destinationPath).catch(() => undefined);
		await rename(sourcePath, destinationPath);
	}
}

function runFfmpeg(args: string[]) {
	return new Promise<void>((resolve, reject) => {
		const childProcess = spawn(process.env.FFMPEG_PATH ?? ffmpegPath ?? 'ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
		let errorOutput = '';

		childProcess.stderr.on('data', (chunk: Buffer) => {
			errorOutput += chunk.toString();
		});
		childProcess.on('error', (error) => reject(error));
		childProcess.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`FFmpeg termino con codigo ${code}: ${errorOutput.slice(-2000)}`));
		});
	});
}

// Same as runFfmpeg, but feeds ffmpeg raw RGBA frames on stdin instead of
// giving it an input file. renderFrame() must return exactly width*height*4
// bytes; the buffer is handed straight to the pipe, respecting backpressure so
// a long scene can't buffer the whole uncompressed video in memory.
function runFfmpegWithFrames(args: string[], frameCount: number, renderFrame: (frameIndex: number) => Buffer) {
	return new Promise<void>((resolve, reject) => {
		const childProcess = spawn(process.env.FFMPEG_PATH ?? ffmpegPath ?? 'ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
		let errorOutput = '';
		let settled = false;

		const fail = (error: Error) => {
			if (settled) return;
			settled = true;
			childProcess.kill();
			reject(error);
		};

		childProcess.stderr.on('data', (chunk: Buffer) => {
			errorOutput += chunk.toString();
		});
		childProcess.on('error', fail);
		childProcess.on('close', (code) => {
			if (settled) return;
			settled = true;
			if (code === 0) resolve();
			else reject(new Error(`FFmpeg termino con codigo ${code}: ${errorOutput.slice(-2000)}`));
		});

		// EPIPE is expected if ffmpeg dies first - the 'close' handler above
		// reports the real reason, so don't let it surface as an unhandled error.
		childProcess.stdin.on('error', () => undefined);

		void (async () => {
			for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
				if (settled || childProcess.stdin.destroyed) return;
				if (!childProcess.stdin.write(renderFrame(frameIndex))) {
					await once(childProcess.stdin, 'drain');
				}
			}
			childProcess.stdin.end();
		})().catch((error) => fail(error instanceof Error ? error : new Error(String(error))));
	});
}

async function render(job: RenderJob) {
	if (!Array.isArray(job.scenes) || job.scenes.length === 0) {
		throw new Error('El trabajo necesita al menos una escena.');
	}

	const jobId = job.id ?? randomUUID();
	const jobDirectory = join(renderDirectory, jobId);
	await mkdir(jobDirectory, { recursive: true });

	const branding = job.branding ?? DEFAULT_BRANDING;
	const backgroundColor = toCssHexColor(branding.primary_color, DEFAULT_BACKGROUND_COLOR);
	const textColor = toCssHexColor(branding.secondary_color, DEFAULT_TEXT_COLOR);
	const { width, height } = PLATFORM_DIMENSIONS[job.platform] ?? PLATFORM_DIMENSIONS.reels;

	try {
		const clips: string[] = [];
		const scenes = [...job.scenes].sort((first, second) => first.order - second.order);

		for (let index = 0; index < scenes.length; index += 1) {
			const scene = scenes[index];
			const duration = Math.max(1, Math.min(60, Number(scene.duration_seconds) || 1));
			const clipPath = join(jobDirectory, `scene-${index + 1}.mp4`);

			const audioUrl = typeof scene.audio_url === 'string' && scene.audio_url.trim().length > 0
				? scene.audio_url.trim()
				: null;

			// Every clip gets both a video AND an audio stream - real audio when
			// available, otherwise a silent anullsrc track of the same duration -
			// so the concat demuxer below sees a uniform stream layout across all
			// clips regardless of which scenes had TTS audio.
			const audioInputArgs = audioUrl
				? ['-i', audioUrl]
				: ['-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo:d=${duration}`];

			const canvas = createFrameCanvas(width, height);
			const context = canvas.getContext('2d');
			const frameScene = {
				index,
				character: scene.character,
				action: scene.action,
				prop: scene.prop,
				description: scene.description || `Escena ${index + 1}`,
			};
			const frameStyle = { width, height, background: backgroundColor, ink: textColor };
			const frameCount = Math.max(1, Math.round(duration * FRAME_RATE));

			await runFfmpegWithFrames([
				'-y',
				'-f', 'rawvideo',
				'-pix_fmt', 'rgba',
				'-s', `${width}x${height}`,
				'-r', String(FRAME_RATE),
				'-i', 'pipe:0',
				...audioInputArgs,
				'-map', '0:v',
				'-map', '1:a',
				'-c:v', 'libx264',
				'-threads', String(ENCODER_THREADS),
				'-preset', 'veryfast',
				'-crf', '20',
				'-c:a', 'aac',
				'-shortest',
				'-pix_fmt', 'yuv420p',
				'-movflags', '+faststart',
				clipPath,
			], frameCount, (frameIndex) => {
				drawSceneFrame(context, frameScene, frameIndex / FRAME_RATE, duration, frameStyle);
				return Buffer.from(context.getImageData(0, 0, width, height).data);
			});

			clips.push(clipPath);
		}

		const concatPath = join(jobDirectory, 'concat.txt');
		await writeFile(concatPath, clips.map((clip) => `file '${clip.replace(/'/g, "'\\''")}'`).join('\n'), 'utf8');
		const concatOutputPath = join(jobDirectory, 'concat-output.mp4');

		await runFfmpeg([
			'-y',
			'-f', 'concat',
			'-safe', '0',
			'-i', concatPath,
			'-c', 'copy',
			'-movflags', '+faststart',
			concatOutputPath,
		]);

		const outputPath = join(renderDirectory, `${jobId}.mp4`);
		await applyLogoOverlayOrFallback(concatOutputPath, outputPath, branding);

		const filename = `${jobId}.mp4`;
		const uploadedUrl = await uploadToSupabase(outputPath, filename);
		return { job_id: jobId, filename, output_path: outputPath, url: uploadedUrl, persisted: uploadedUrl !== null };
	} finally {
		await rm(jobDirectory, { recursive: true, force: true });
	}
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
	response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
	response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of request) chunks.push(Buffer.from(chunk));
	return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = createServer(async (request, response) => {
	if (request.method === 'GET' && request.url === '/health') {
		sendJson(response, 200, {
			ok: true,
			service: 'render-worker',
			storage: storageClient ? 'supabase' : 'local-disk',
			bucket: storageBucket,
			last_storage_error: lastStorageError,
		});
		return;
	}

	if (request.method === 'GET' && request.url?.startsWith('/renders/')) {
		const filename = request.url.slice('/renders/'.length);
		if (!/^[a-zA-Z0-9-]+\.mp4$/.test(filename)) {
			sendJson(response, 400, { error: 'Nombre de archivo no valido.' });
			return;
		}

		const filePath = join(renderDirectory, filename);
		try {
			await access(filePath);
		} catch {
			sendJson(response, 404, { error: 'Video no encontrado.' });
			return;
		}

		response.writeHead(200, { 'content-type': 'video/mp4', 'cache-control': 'public, max-age=3600' });
		createReadStream(filePath).pipe(response);
		return;
	}

	if (request.method !== 'POST' || request.url !== '/render') {
		sendJson(response, 404, { error: 'Ruta no encontrada.' });
		return;
	}

	try {
		const job = await readJson(request) as RenderJob;
		const result = await render(job);
		sendJson(response, 201, result);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Error de render desconocido.';
		sendJson(response, 400, { error: message });
	}
});

mkdir(renderDirectory, { recursive: true }).then(() => {
	server.listen(port, () => console.log(`render worker escuchando en http://localhost:${port}`));
});
