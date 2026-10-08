// Generates the base sound library (RF-010): three background tracks and four
// short effects, synthesised from scratch with ffmpeg. Synthesised rather than
// downloaded for the same reason the backdrop art is drawn: a sound the project
// made itself has no licence to trace, and no binary has to live in git.
//
//   npm run sounds:library                    -> writes the .m4a files to <tmp>/stickman-sounds
//   npm run sounds:library -- --out <dir>     -> somewhere else
//   npm run sounds:library -- --upload        -> also upserts them to Storage: sounds/biblioteca/<slug>.m4a
//
// The slugs are a contract with packages/shared-types (SOUND_LIBRARY): the web
// app builds each public URL from the slug, so renaming one here breaks it.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegStatic from 'ffmpeg-static';

const FFMPEG = process.env.FFMPEG_PATH || ffmpegStatic || 'ffmpeg';
// 48 kHz, not 44.1: AAC codes 1024-sample frames, and 32 s at 48 kHz is exactly
// 1500 of them. At 44.1 kHz the last frame is padded with ~20 ms of silence
// that decoders keep, which is an audible click every time the music loops.
const SAMPLE_RATE = 48000;
const BUCKET = 'sounds';
const LICENSE = 'Propia del proyecto (CC0)';

const args = process.argv.slice(2);
const upload = args.includes('--upload');
const outFlag = args.indexOf('--out');
const outDir = outFlag >= 0 && args[outFlag + 1] ? args[outFlag + 1] : join(tmpdir(), 'stickman-sounds');

// ---- Music synthesis --------------------------------------------------------
//
// Every track is exactly LOOP seconds and must loop with no click at the seam,
// because the render loops it under videos of any length. Three things make
// that hold:
// - every frequency is rounded to a multiple of 1/LOOP Hz, so each sinusoid
//   completes a whole number of cycles per loop and ends where it began;
// - every envelope (chord crossfades, plucks, tremolo) has a period that
//   divides LOOP, and chords only change where their envelope is at zero;
// - filters with memory (lowpass, echo) would start the file from silence, so
//   three loops are rendered and only the middle one is kept: by then the
//   filters are in their steady state and the end flows into the start.
const LOOP = 32;
const CHORD_SECONDS = 8; // four chords per loop
const snap = (frequency) => Math.round(frequency * LOOP) / LOOP;

// Nested if() picking one of four values by an index expression.
function pick(index, values) {
	return values.slice(0, -1).reduceRight(
		(rest, value, position) => `if(eq(${index},${position}),${value},${rest})`,
		String(values[values.length - 1]),
	);
}

// Two pad layers crossfading with sin^2/cos^2 envelopes (which sum to 1, so
// the level never dips): layer A changes chord on multiples of 8 s, layer B
// half a chord later, each exactly when its own envelope is silent.
// Variables: 0 = chord index A, 1 = chord index B, 2 = envelope A,
// 3 = envelope B, 4/5 = scratch frequencies, 6 = accumulator, 7 = pluck phase.
function padPrelude() {
	return [
		`st(0,floor(mod(t,${LOOP})/${CHORD_SECONDS}))`,
		`st(1,floor(mod(t+${LOOP - CHORD_SECONDS / 2},${LOOP})/${CHORD_SECONDS}))`,
		`st(2,pow(sin(PI*mod(t,${CHORD_SECONDS})/${CHORD_SECONDS}),2))`,
		`st(3,pow(cos(PI*mod(t,${CHORD_SECONDS})/${CHORD_SECONDS}),2))`,
		'st(6,0)',
	];
}

// One warm pad partial set: fundamental plus a little 2nd and 3rd harmonic.
const padVoice = (f) => `(sin(2*PI*${f}*t)+0.22*sin(4*PI*${f}*t)+0.06*sin(6*PI*${f}*t))`;

// chords: four chords of N notes each, as Hz. detune shifts one stereo side by
// a whole multiple of 1/LOOP so the slow beating between sides also loops.
function padTerms(chords, detune, level) {
	const terms = [];
	for (let note = 0; note < chords[0].length; note += 1) {
		const column = chords.map((chord) => snap(chord[note]) + detune);
		terms.push(`st(4,${pick('ld(0)', column)})`);
		terms.push(`st(5,${pick('ld(1)', column)})`);
		terms.push(`st(6,ld(6)+${level}*(ld(2)*${padVoice('ld(4)')}+ld(3)*${padVoice('ld(5)')}))`);
	}
	return terms;
}

// A soft pluck retriggered every `period` seconds on the current chord (layer
// A's index, which only changes on a pluck boundary). The envelope rises from
// zero and is forced back to zero at the end of its period, so retriggering
// never jumps.
function pluckTerms({ chords, period, octave, decay, level, arpeggio }) {
	const terms = [`st(7,mod(t,${period}))`];
	const envelope = `(1-exp(-ld(7)*120))*exp(-ld(7)*${decay})*(1-pow(ld(7)/${period},6))`;
	if (arpeggio) {
		// One chord tone per pulse, walking up the chord.
		const toneIndex = `mod(floor(t/${period}),${chords[0].length})`;
		const perChord = chords.map((chord) => pick(toneIndex, chord.map((f) => snap(f * octave))));
		terms.push(`st(4,${pick('ld(0)', perChord)})`);
		terms.push(`st(6,ld(6)+${level}*${envelope}*(sin(2*PI*ld(4)*t)+0.3*exp(-ld(7)*8)*sin(4*PI*ld(4)*t)))`);
	} else {
		for (let note = 0; note < chords[0].length; note += 1) {
			const column = chords.map((chord) => snap(chord[note] * octave));
			terms.push(`st(4,${pick('ld(0)', column)})`);
			terms.push(`st(6,ld(6)+${level}*${envelope}*(sin(2*PI*ld(4)*t)+0.35*exp(-ld(7)*6)*sin(4*PI*ld(4)*t)))`);
		}
	}
	return terms;
}

// Bass root on a slow pulse, same retrigger rules as the plucks.
function bassTerms(roots, period, level) {
	const column = roots.map(snap);
	return [
		'st(7,mod(t,' + period + '))',
		`st(4,${pick('ld(0)', column)})`,
		`st(6,ld(6)+${level}*(1-exp(-ld(7)*60))*exp(-ld(7)*3)*(1-pow(ld(7)/${period},6))*sin(2*PI*ld(4)*t))`,
	];
}

// Tremolo period 16 s: two whole cycles per loop.
const TREMOLO = `(1+0.12*sin(2*PI*t/16))`;

function channel(parts) {
	return [...parts, `ld(6)*${TREMOLO}`].join(';');
}

const MUSIC = [
	{
		slug: 'calma',
		name: 'Calma (pad suave)',
		// Cmaj7 - Am7 - Fmaj7 - G6: no tension, nothing that pulls attention.
		build() {
			const chords = [
				[130.81, 196.0, 246.94, 329.63],
				[110.0, 164.81, 196.0, 261.63],
				[87.31, 130.81, 220.0, 329.63],
				[98.0, 146.83, 246.94, 329.63],
			];
			const left = channel([...padPrelude(), ...padTerms(chords, 0, 0.25)]);
			const right = channel([...padPrelude(), ...padTerms(chords, 2 / LOOP, 0.25)]);
			return { expression: `${left}|${right}`, filters: 'lowpass=f=1100,aecho=0.8:0.6:90|170:0.22|0.14' };
		},
	},
	{
		slug: 'confianza',
		name: 'Confianza (acordes cálidos)',
		// F - Dm7 - Bbmaj7 - C: warm major progression with a soft
		// "piano" chord every 2 s over the pad.
		build() {
			const chords = [
				[87.31, 130.81, 174.61, 220.0],
				[73.42, 146.83, 174.61, 261.63],
				[116.54, 146.83, 174.61, 220.0],
				[65.41, 130.81, 164.81, 196.0],
			];
			const plucks = pluckTerms({ chords, period: 2, octave: 2, decay: 1.6, level: 0.16 });
			const left = channel([...padPrelude(), ...padTerms(chords, 0, 0.16), ...plucks]);
			const right = channel([...padPrelude(), ...padTerms(chords, 2 / LOOP, 0.16), ...plucks]);
			return { expression: `${left}|${right}`, filters: 'lowpass=f=2200,aecho=0.8:0.55:110|190:0.2|0.12' };
		},
	},
	{
		slug: 'impulso',
		name: 'Impulso (pulso ligero)',
		// D - Bm - G - A at 120 bpm: an eighth-note arpeggio and a quarter-
		// note bass give motion without drums, which would fight the voice.
		build() {
			const chords = [
				[146.83, 185.0, 220.0, 293.66],
				[123.47, 146.83, 185.0, 246.94],
				[98.0, 146.83, 196.0, 246.94],
				[110.0, 138.59, 164.81, 220.0],
			];
			const roots = [73.42, 61.74, 49.0, 55.0];
			const arpeggio = pluckTerms({ chords, period: 0.25, octave: 2, decay: 9, level: 0.2, arpeggio: true });
			const bass = bassTerms(roots, 0.5, 0.35);
			const left = channel([...padPrelude(), ...padTerms(chords, 0, 0.09), ...arpeggio, ...bass]);
			const right = channel([...padPrelude(), ...padTerms(chords, 2 / LOOP, 0.09), ...arpeggio, ...bass]);
			return { expression: `${left}|${right}`, filters: 'lowpass=f=2600,aecho=0.8:0.5:125|250:0.18|0.1' };
		},
	},
];

// ---- Effects ------------------------------------------------------------------
//
// Each one starts from silence (an attack ramp rather than a step) and ends
// with a fade, so none of them clicks when it is dropped into the mix.

// Inharmonic bell partials (ratio, amplitude, decay per second).
const BELL = [
	[0.5, 0.3, 1.2], [1, 1, 2.2], [1.183, 0.55, 2.8], [1.506, 0.4, 3.2],
	[2, 0.35, 3.8], [2.514, 0.22, 4.6], [2.662, 0.14, 5.2], [3.011, 0.09, 6.4],
];

const EFFECTS = [
	{
		slug: 'transicion',
		name: 'Transición (barrido)',
		duration: 1.1,
		// Band-limited pink noise that swells and fades, with a phaser for the
		// sense of movement a "whoosh" needs.
		input: ['-f', 'lavfi', '-i', `anoisesrc=d=1.1:c=pink:a=0.6:r=${SAMPLE_RATE}:s=7`],
		filters: 'highpass=f=350,lowpass=f=5000,aphaser=type=t:speed=1.6:decay=0.5,afade=t=in:d=0.6:curve=qsin,afade=t=out:st=0.6:d=0.5:curve=qsin',
	},
	{
		slug: 'campana',
		name: 'Campana',
		duration: 1.9,
		expression: '(1-exp(-t*300))*(' + BELL
			.map(([ratio, amplitude, decay]) => `${amplitude}*exp(-t*${decay})*sin(2*PI*${(784 * ratio).toFixed(3)}*t)`)
			.join('+') + ')',
		filters: 'afade=t=out:st=1.5:d=0.4',
	},
	{
		slug: 'pop',
		name: 'Pop',
		duration: 0.25,
		// A sine whose pitch drops fast from ~680 Hz to 180 Hz; the phase is
		// the integral of that frequency curve, so the sweep is continuous.
		expression: '(1-exp(-t*900))*exp(-t*26)*sin(2*PI*(180*t+500*(1-exp(-45*t))/45))',
		filters: 'afade=t=out:st=0.18:d=0.07',
	},
	{
		slug: 'notificacion',
		name: 'Notificación',
		duration: 1.1,
		// Two-note rising chime, C6 then G6.
		expression: '(1-exp(-t*500))*exp(-t*6)*(sin(2*PI*1046.5*t)+0.2*sin(4*PI*1046.5*t))'
			+ '+gt(t,0.14)*(1-exp(-(t-0.14)*500))*exp(-(t-0.14)*5)*(sin(2*PI*1568*t)+0.2*sin(4*PI*1568*t))',
		filters: 'afade=t=out:st=0.85:d=0.25',
	},
];

// ---- ffmpeg plumbing ---------------------------------------------------------

function ffmpeg(ffmpegArgs) {
	return new Promise((resolve, reject) => {
		const child = spawn(FFMPEG, ['-hide_banner', '-nostdin', ...ffmpegArgs], { stdio: ['ignore', 'ignore', 'pipe'] });
		let stderr = '';
		child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
		child.on('error', reject);
		child.on('close', (code) => {
			if (code === 0) resolve(stderr);
			else reject(new Error(`ffmpeg termino con codigo ${code}: ${stderr.slice(-1500)}`));
		});
	});
}

async function levels(path) {
	const report = await ffmpeg(['-i', path, '-af', 'volumedetect', '-f', 'null', '-']);
	const mean = Number(report.match(/mean_volume:\s*(-?[\d.]+) dB/)?.[1]);
	const max = Number(report.match(/max_volume:\s*(-?[\d.]+) dB/)?.[1]);
	return { mean, max };
}

async function durationOf(path) {
	const report = await ffmpeg(['-i', path, '-f', 'null', '-']);
	// The last "time=" is the decoded length, which is what a player hears.
	const times = [...report.matchAll(/time=(\d+):(\d+):([\d.]+)/g)];
	const last = times[times.length - 1];
	return last ? Number(last[1]) * 3600 + Number(last[2]) * 60 + Number(last[3]) : NaN;
}

// Music sits at a fixed loudness (the render scales it down again under the
// voice); effects are peak-normalised, since they are too short for an average
// to mean much.
const MUSIC_MEAN_DB = -18;
const MUSIC_PEAK_DB = -1;
const EFFECT_PEAK_DB = -3;

async function generate(workDir) {
	const results = [];

	for (const track of MUSIC) {
		const { expression, filters } = track.build();
		const raw = join(workDir, `${track.slug}.wav`);
		await ffmpeg([
			'-y', '-f', 'lavfi', '-i', `aevalsrc='${expression}':s=${SAMPLE_RATE}:d=${LOOP * 3}`,
			'-af', `${filters},atrim=start=${LOOP}:end=${LOOP * 2},asetpts=PTS-STARTPTS`,
			'-c:a', 'pcm_s16le', raw,
		]);
		const { mean, max } = await levels(raw);
		const gain = Math.min(MUSIC_MEAN_DB - mean, MUSIC_PEAK_DB - max);
		results.push({ ...track, kind: 'musica', raw, gain, bitrate: '160k' });
	}

	for (const effect of EFFECTS) {
		const raw = join(workDir, `${effect.slug}.wav`);
		const input = effect.input ?? ['-f', 'lavfi', '-i', `aevalsrc='${effect.expression}':s=${SAMPLE_RATE}:d=${effect.duration}`];
		await ffmpeg(['-y', ...input, '-af', `${effect.filters},aformat=channel_layouts=stereo`, '-c:a', 'pcm_s16le', raw]);
		const { max } = await levels(raw);
		results.push({ ...effect, kind: 'efecto', raw, gain: EFFECT_PEAK_DB - max, bitrate: '128k' });
	}

	const files = [];
	for (const sound of results) {
		const path = join(outDir, `${sound.slug}.m4a`);
		await ffmpeg([
			'-y', '-i', sound.raw,
			'-af', `volume=${sound.gain.toFixed(2)}dB,aformat=channel_layouts=stereo`,
			'-ar', String(SAMPLE_RATE), '-c:a', 'aac', '-b:a', sound.bitrate,
			'-movflags', '+faststart', path,
		]);
		const { mean, max } = await levels(path);
		files.push({ slug: sound.slug, kind: sound.kind, name: sound.name, path, seconds: await durationOf(path), mean, max });
	}
	return files;
}

// ---- Upload -------------------------------------------------------------------

// Same env loading as scripts/e2e.mjs: secrets live in .env.local files, later
// files win, the repo root last.
function loadEnv() {
	const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
	const candidates = [
		join(root, 'apps', 'render-worker', '.env.local'),
		join(root, 'apps', 'web', '.env.local'),
		join(root, '.env.local'),
	];
	for (const file of candidates) {
		let text;
		try { text = readFileSync(file, 'utf8'); } catch { continue; }
		for (const line of text.split('\n')) {
			const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
			if (match && match[2].trim()) process.env[match[1]] = match[2].trim();
		}
	}
}

async function uploadAll(files) {
	loadEnv();
	const url = process.env.SUPABASE_URL;
	const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_ROLE_KEY) en .env.local.');

	const { createClient } = await import('@supabase/supabase-js');
	const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

	// Created lazily and public, same as the web app does for branding-logos.
	const { data: buckets, error: listError } = await client.storage.listBuckets();
	if (listError) throw listError;
	if (!(buckets ?? []).some((bucket) => bucket.name === BUCKET)) {
		const { error } = await client.storage.createBucket(BUCKET, { public: true });
		if (error) throw error;
		console.log(`Bucket "${BUCKET}" creado (publico).`);
	}

	for (const file of files) {
		const objectPath = `biblioteca/${file.slug}.m4a`;
		const { error } = await client.storage.from(BUCKET).upload(objectPath, readFileSync(file.path), {
			contentType: 'audio/mp4',
			upsert: true,
		});
		if (error) throw new Error(`No se pudo subir ${objectPath}: ${error.message}`);
		console.log(`Subido ${BUCKET}/${objectPath} -> ${client.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl}`);
	}
}

// ---- Main ---------------------------------------------------------------------

mkdirSync(outDir, { recursive: true });
const workDir = join(outDir, '.work');
mkdirSync(workDir, { recursive: true });

try {
	const files = await generate(workDir);
	console.log(`Biblioteca generada en ${outDir} (licencia: ${LICENSE})`);
	for (const file of files) {
		console.log(`  ${file.slug.padEnd(13)} ${file.kind.padEnd(7)} ${file.seconds.toFixed(2).padStart(6)} s  media ${file.mean} dB  pico ${file.max} dB  ${file.name}`);
	}
	if (upload) await uploadAll(files);
	else console.log('Sin --upload: no se subio nada a Supabase.');
} finally {
	rmSync(workDir, { recursive: true, force: true });
}
