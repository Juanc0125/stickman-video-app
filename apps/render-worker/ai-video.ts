import { writeFile } from 'node:fs/promises';

// RF-004 alternative path: generate each scene with a text-to-video model
// instead of drawing it. Goes through fal.ai, which fronts several models
// (Veo, Kling, Wan, LTX...) behind one key and one queue API, so switching
// model is a config change rather than a new integration.
//
// This is entirely optional. With no FAL_KEY the worker keeps drawing scenes
// itself, which costs nothing; with a key, every scene costs real money and
// each regenerate charges again.
const FAL_KEY = process.env.FAL_KEY?.trim();
const MODEL = process.env.AI_VIDEO_MODEL?.trim() || 'fal-ai/ltx-2.3/text-to-video';
const RESOLUTION = process.env.AI_VIDEO_RESOLUTION?.trim() || '720p';
const STYLE = process.env.AI_VIDEO_STYLE?.trim()
	|| 'clean modern corporate style, warm natural lighting, shallow depth of field, professional and trustworthy, no on-screen text';

// A model run can sit in the queue before it even starts, so this ceiling is
// generous; the caller falls back to drawing the scene when it is hit.
const TIMEOUT_MS = Number(process.env.AI_VIDEO_TIMEOUT_MS ?? 5 * 60 * 1000);
const POLL_MS = 5000;

export function isAiVideoEnabled() {
	return Boolean(FAL_KEY);
}

export function aiVideoModel() {
	return MODEL;
}

const CHARACTER_SUBJECTS: Record<string, string> = {
	broker: 'a friendly professional mortgage advisor in business attire',
	cliente: 'a hopeful first-time home buyer',
	pareja: 'a young couple looking at a home together',
	hombre: 'a man in casual smart clothing',
	mujer: 'a woman in casual smart clothing',
	generico: 'a person',
};

const ACTION_VERBS: Record<string, string> = {
	hablar: 'speaking directly to camera, gesturing naturally',
	caminar: 'walking forward',
	senalar: 'pointing toward something off to the side',
	sentarse: 'sitting at a desk',
	pensar: 'thinking, hand near chin',
	telefono: 'talking on a mobile phone',
	mostrar_objeto: 'presenting something with an open hand',
};

const PROP_SCENERY: Record<string, string> = {
	casa: 'in front of a suburban house',
	carro: 'beside a car',
	banco: 'inside a bank branch',
	telefono: 'holding a phone',
	documento: 'holding paperwork',
	dinero: 'with cash on a table',
	grafico: 'beside a chart on a screen',
	oficina: 'in a bright modern office',
	ninguno: 'against a clean uncluttered background',
};

/** Builds the visual prompt. The scene description is narration, not a shot list, so it is used only as context. */
export function buildScenePrompt(scene: { character: string; action: string; prop: string; description: string }) {
	const subject = CHARACTER_SUBJECTS[scene.character] ?? CHARACTER_SUBJECTS.generico;
	const action = ACTION_VERBS[scene.action] ?? ACTION_VERBS.hablar;
	const scenery = PROP_SCENERY[scene.prop] ?? PROP_SCENERY.ninguno;
	return `${subject}, ${action}, ${scenery}. ${STYLE}. Vertical video.`;
}

async function falFetch(url: string, init?: RequestInit) {
	const response = await fetch(url, {
		...init,
		headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json', ...init?.headers },
	});
	if (!response.ok) {
		const body = await response.text().catch(() => '');
		throw new Error(`fal.ai respondio ${response.status}: ${body.slice(0, 300)}`);
	}
	return response.json() as Promise<Record<string, unknown>>;
}

function extractVideoUrl(result: Record<string, unknown>): string | null {
	// Models differ: most return { video: { url } }, some { videos: [{ url }] }.
	const video = result.video as { url?: unknown } | undefined;
	if (video && typeof video.url === 'string') return video.url;
	const videos = result.videos as Array<{ url?: unknown }> | undefined;
	if (Array.isArray(videos) && typeof videos[0]?.url === 'string') return videos[0].url;
	if (typeof result.url === 'string') return result.url;
	return null;
}

/**
 * Generates one scene and writes the MP4 to `destinationPath`.
 * Returns false when generation is unavailable or fails, so the caller can
 * fall back to drawing the scene rather than failing the whole render.
 */
export async function generateSceneVideo(
	prompt: string,
	durationSeconds: number,
	destinationPath: string,
): Promise<boolean> {
	if (!FAL_KEY) return false;

	try {
		// Models accept only a few discrete lengths; ours are the common ones.
		const duration = durationSeconds <= 6 ? '5s' : durationSeconds <= 9 ? '8s' : '10s';

		const submitted = await falFetch(`https://queue.fal.run/${MODEL}`, {
			method: 'POST',
			body: JSON.stringify({ prompt, duration, aspect_ratio: '9:16', resolution: RESOLUTION }),
		});

		const requestId = submitted.request_id;
		if (typeof requestId !== 'string') throw new Error('fal.ai no devolvio request_id.');

		const deadline = Date.now() + TIMEOUT_MS;
		let status = '';
		while (Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, POLL_MS));
			const poll = await falFetch(`https://queue.fal.run/${MODEL}/requests/${requestId}/status`);
			status = String(poll.status ?? '');
			if (status === 'COMPLETED') break;
			if (status !== 'IN_QUEUE' && status !== 'IN_PROGRESS') {
				throw new Error(`fal.ai devolvio estado ${status}.`);
			}
		}
		if (status !== 'COMPLETED') throw new Error(`fal.ai excedio el tiempo limite (${TIMEOUT_MS} ms).`);

		const result = await falFetch(`https://queue.fal.run/${MODEL}/requests/${requestId}`);
		const videoUrl = extractVideoUrl(result);
		if (!videoUrl) throw new Error('fal.ai no devolvio una URL de video.');

		const download = await fetch(videoUrl);
		if (!download.ok) throw new Error(`No se pudo descargar el video generado: HTTP ${download.status}`);
		await writeFile(destinationPath, Buffer.from(await download.arrayBuffer()));
		return true;
	} catch (error) {
		console.warn('Fallo la generacion con IA de una escena; se dibujara en su lugar.', error);
		return false;
	}
}
