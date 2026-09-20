import { createWriteStream } from 'node:fs';
import { access, mkdir, rename, rm } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import bz2 from 'unbzip2-stream';
import { extract } from 'tar-stream';

// RF-003: the narration voice. Runs locally through sherpa-onnx, which ships
// as WebAssembly rather than a native binary - so unlike every other native
// piece in this worker, it behaves identically on Windows and on Railway's
// Linux container. No API key and no per-video cost.
//
// The voice model is ~67MB and is not in the repo, so it is fetched once per
// container into VOICE_CACHE_DIR. Rendering waits on that download the first
// time; every later render reuses it.
const MODEL_NAME = process.env.VOICE_MODEL ?? 'vits-piper-es_MX-claude-high';
const MODEL_FILE = process.env.VOICE_MODEL_FILE ?? 'es_MX-claude-high.onnx';
const MODEL_URL = `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${MODEL_NAME}.tar.bz2`;
const CACHE_DIR = process.env.VOICE_CACHE_DIR ?? join(process.cwd(), '.voice-cache');
const SPEAKING_RATE = Number(process.env.VOICE_SPEED ?? 1);

export interface Speech {
	samples: Float32Array;
	sampleRate: number;
	durationSeconds: number;
}

let modelPromise: Promise<string | null> | null = null;
let ttsInstance: { generate: (options: { text: string; sid: number; speed: number }) => { samples: Float32Array; sampleRate: number } } | null = null;

async function exists(path: string) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function downloadModel(): Promise<string | null> {
	const modelDirectory = join(CACHE_DIR, MODEL_NAME);
	if (await exists(join(modelDirectory, MODEL_FILE))) return modelDirectory;

	// Extract into a staging directory and rename on success, so an interrupted
	// download can never leave a half-written model that looks complete.
	const staging = `${modelDirectory}.partial`;
	await rm(staging, { recursive: true, force: true });
	await mkdir(staging, { recursive: true });

	console.log(`Descargando el modelo de voz ${MODEL_NAME} (unica vez por contenedor)...`);
	const response = await fetch(MODEL_URL);
	if (!response.ok || !response.body) throw new Error(`No se pudo descargar el modelo de voz: HTTP ${response.status}`);

	const archive = extract();
	archive.on('entry', (header, stream, next) => {
		// Archive paths are prefixed with the model folder; strip it so the
		// layout under the staging directory matches what sherpa-onnx expects.
		const relative = header.name.replace(/^[^/]+\/?/, '');
		if (!relative || header.type === 'directory') {
			stream.resume();
			stream.on('end', next);
			return;
		}
		const target = join(staging, relative);
		mkdir(join(target, '..'), { recursive: true })
			.then(() => pipeline(stream, createWriteStream(target)))
			.then(() => next())
			.catch((error) => archive.destroy(error));
	});

	await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]), bz2(), archive);
	await rm(modelDirectory, { recursive: true, force: true });
	await rename(staging, modelDirectory);
	console.log('Modelo de voz listo.');
	return modelDirectory;
}

/** Downloads the voice model if needed. Safe to call repeatedly; only runs once. */
export function ensureVoiceModel(): Promise<string | null> {
	if (!modelPromise) {
		modelPromise = downloadModel().catch((error) => {
			console.warn('No se pudo preparar el modelo de voz; los videos saldran sin narracion.', error);
			// Cleared so a later render can retry rather than being stuck with
			// a failure cached for the life of the container.
			modelPromise = null;
			return null;
		});
	}
	return modelPromise;
}

async function getTts() {
	if (ttsInstance) return ttsInstance;
	const modelDirectory = await ensureVoiceModel();
	if (!modelDirectory) return null;

	// Required lazily: loading the WASM runtime costs ~1.5s, which is wasted on
	// a worker that only ever serves /health.
	const sherpa = require('sherpa-onnx');
	ttsInstance = sherpa.createOfflineTts({
		model: {
			vits: {
				model: join(modelDirectory, MODEL_FILE),
				tokens: join(modelDirectory, 'tokens.txt'),
				dataDir: join(modelDirectory, 'espeak-ng-data'),
				noiseScale: 0.667,
				noiseScaleW: 0.8,
				lengthScale: 1,
			},
			numThreads: 1,
			debug: 0,
			provider: 'cpu',
		},
		maxNumSentences: 1,
	});
	return ttsInstance;
}

/** Narrates one line. Returns null when the voice is unavailable - never throws. */
export async function speak(text: string): Promise<Speech | null> {
	const trimmed = text.trim();
	if (!trimmed) return null;

	try {
		const tts = await getTts();
		if (!tts) return null;
		const audio = tts.generate({ text: trimmed, sid: 0, speed: SPEAKING_RATE });
		return {
			samples: audio.samples,
			sampleRate: audio.sampleRate,
			durationSeconds: audio.samples.length / audio.sampleRate,
		};
	} catch (error) {
		console.warn('Fallo la sintesis de voz para una escena; esa escena quedara en silencio.', error);
		return null;
	}
}

/**
 * Per-frame mouth opening (0..1) taken from the loudness of the narration, so
 * the mouth actually follows the words rather than flapping on a timer.
 * Uses RMS over each frame's slice of audio, normalised against the loudest
 * frame so quiet voices still animate, with a little smoothing so the jaw
 * doesn't chatter between frames.
 */
export function mouthEnvelope(speech: Speech, frameRate: number, frameCount: number): number[] {
	const samplesPerFrame = speech.sampleRate / frameRate;
	const raw: number[] = [];

	for (let frame = 0; frame < frameCount; frame += 1) {
		const start = Math.floor(frame * samplesPerFrame);
		const end = Math.min(speech.samples.length, Math.floor((frame + 1) * samplesPerFrame));
		let sum = 0;
		for (let i = start; i < end; i += 1) sum += speech.samples[i] * speech.samples[i];
		raw.push(end > start ? Math.sqrt(sum / (end - start)) : 0);
	}

	const loudest = Math.max(...raw, 1e-6);
	let previous = 0;
	return raw.map((value) => {
		// sqrt pulls quiet syllables up so the mouth reads on soft speech too.
		const target = Math.min(1, Math.sqrt(value / loudest));
		previous = previous * 0.45 + target * 0.55;
		return previous;
	});
}

export function voiceModelName() {
	return MODEL_NAME;
}
