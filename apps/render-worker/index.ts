import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';
import { createClient } from '@supabase/supabase-js';

type RenderScene = {
	order: number;
	description: string;
	duration_seconds: number;
};

type RenderJob = {
	id?: string;
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
		return data.publicUrl;
	} catch (error) {
		console.warn('Fallo al subir el render a Supabase Storage, se conserva en disco local.', error);
		return null;
	}
}

function escapeFilterText(value: string) {
	return value.replace(/[\\':]/g, '\\$&').replace(/\r?\n/g, ' ');
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

async function render(job: RenderJob) {
	if (!Array.isArray(job.scenes) || job.scenes.length === 0) {
		throw new Error('El trabajo necesita al menos una escena.');
	}

	const jobId = job.id ?? randomUUID();
	const jobDirectory = join(renderDirectory, jobId);
	await mkdir(jobDirectory, { recursive: true });

	try {
		const clips: string[] = [];
		const scenes = [...job.scenes].sort((first, second) => first.order - second.order);

		for (let index = 0; index < scenes.length; index += 1) {
			const scene = scenes[index];
			const duration = Math.max(1, Math.min(60, Number(scene.duration_seconds) || 1));
			const description = escapeFilterText(scene.description || `Escena ${index + 1}`);
			const clipPath = join(jobDirectory, `scene-${index + 1}.mp4`);
			const filter = [
				'drawbox=x=600:y=210:w=12:h=180:color=white:t=fill',
				'drawbox=x=540:y=390:w=130:h=12:color=white:t=fill',
				'drawbox=x=540:y=390:w=12:h=150:color=white:t=fill',
				'drawbox=x=658:y=390:w=12:h=150:color=white:t=fill',
				'drawbox=x=560:y=115:w=90:h=90:color=white:t=fill',
				`drawtext=text='ESCENA ${index + 1}':fontcolor=white:fontsize=34:x=50:y=45`,
				`drawtext=text='${description}':fontcolor=white:fontsize=28:x=50:y=650`,
			].join(',');

			await runFfmpeg([
				'-y',
				'-f', 'lavfi',
				'-i', `color=c=0x17202a:s=1280x720:r=30:d=${duration}`,
				'-vf', filter,
				'-an',
				'-c:v', 'libx264',
				'-pix_fmt', 'yuv420p',
				'-movflags', '+faststart',
				clipPath,
			]);
			clips.push(clipPath);
		}

		const concatPath = join(jobDirectory, 'concat.txt');
		await writeFile(concatPath, clips.map((clip) => `file '${clip.replace(/'/g, "'\\''")}'`).join('\n'), 'utf8');
		const outputPath = join(renderDirectory, `${jobId}.mp4`);

		await runFfmpeg([
			'-y',
			'-f', 'concat',
			'-safe', '0',
			'-i', concatPath,
			'-c', 'copy',
			'-movflags', '+faststart',
			outputPath,
		]);

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
		sendJson(response, 200, { ok: true, service: 'render-worker' });
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
