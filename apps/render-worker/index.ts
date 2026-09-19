import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { access, mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';
import { createClient } from '@supabase/supabase-js';

// Bundled, redistributable font (no system fonts required). Railway's runtime
// image has no fonts installed at all - without this, libass/fontconfig
// falls back to scanning the whole system for a substitute for "Arial",
// which hung long enough to get the ffmpeg process killed in production
// (confirmed live: the render got killed mid-scene-1 with no video frames
// ever produced). Pointing the subtitles filter's fontsdir directly at this
// package's ttf/ folder skips system font discovery entirely.
const FONT_DIRECTORY = join(dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');
const FONT_FAMILY = 'DejaVu Sans';

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
const DEFAULT_BACKGROUND_COLOR = '0x17202a';
const DEFAULT_TEXT_COLOR = '0xffffff';
const HEX_COLOR_PATTERN = /^#?[0-9a-fA-F]{6}$/;

function toFfmpegHexColor(value: unknown, fallback: string): string {
	if (typeof value === 'string' && HEX_COLOR_PATTERN.test(value.trim())) {
		return `0x${value.trim().replace(/^#/, '')}`;
	}
	return fallback;
}

// ---- Canvas layout for the 1080x1920 vertical (9:16) stickman scene ----
const HEAD_SIZE = 90;
const HEAD_Y = 480;
const NECK_Y = HEAD_Y + HEAD_SIZE; // 570 - top of torso
const SHOULDER_Y = NECK_Y + 20; // 590
const TORSO_WIDTH = 12;
const TORSO_HEIGHT = 260;
const HIP_Y = NECK_Y + TORSO_HEIGHT; // 830
const HIP_WIDTH = 140;
const HIP_HEIGHT = 12;
const LEG_WIDTH = 12;
const LEG_HEIGHT = 270;
const LEG_Y = HIP_Y + HIP_HEIGHT; // 842
const ARM_THICKNESS = 12;
const ARM_LENGTH = 70;
const FOREARM_LENGTH = 70;
// Small horizontal gap so a hanging "off" arm reads as a separate limb next to
// the torso instead of visually fusing with it (both are ARM_THICKNESS wide).
const HANGING_ARM_GAP = 8;
// Horizontal offset used to draw a second, smaller-in-spirit figure next to the
// first one for character: 'pareja' so a couple genuinely reads as two figures.
const PAREJA_OFFSET_X = 190;
// The main figure is drawn left-of-center so there's always clear room on the
// right side of the frame for the prop box (RF-018), even for 'pareja' scenes.
const FIGURE_CENTER_X = 378;

// Small accent color per character type, used as a "badge" visual tag (RF-004).
// drawbox can only draw rectangles, so distinct silhouettes per type aren't
// attempted - only this badge + an uppercase drawtext label identify the type.
const CHARACTER_BADGE_COLORS: Record<CharacterType, string> = {
	broker: '0x2e86de',
	cliente: '0x27ae60',
	pareja: '0xe67e22',
	hombre: '0x8e44ad',
	mujer: '0xe84393',
	generico: '0x95a5a6',
};

const PROP_LABELS: Partial<Record<ScenePropType, string>> = {
	casa: 'CASA',
	carro: 'CARRO',
	banco: 'BANCO',
	telefono: 'TELEFONO',
	documento: 'DOCUMENTO',
	dinero: 'DINERO',
	grafico: 'GRAFICO',
	oficina: 'OFICINA',
};

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

// Inserts a literal newline every ~40 chars at a word boundary; escapeAssText()
// turns each "\n" into the ASS hard-break "\N" when the .ass file is built.
// This is a cheap nice-to-have for long subtitles, not real word wrapping.
function wrapSubtitleText(text: string, maxLineLength = 40): string {
	const words = text.split(' ').filter((word) => word.length > 0);
	if (words.length === 0) return text;

	const lines: string[] = [];
	let currentLine = '';
	for (const word of words) {
		if (currentLine.length === 0) {
			currentLine = word;
		} else if (currentLine.length + 1 + word.length <= maxLineLength) {
			currentLine += ` ${word}`;
		} else {
			lines.push(currentLine);
			currentLine = word;
		}
	}
	if (currentLine.length > 0) lines.push(currentLine);
	return lines.join('\n');
}

// ---- Text rendering via libass instead of drawtext ----
// The ffmpeg-static binary actually deployed to production does NOT have the
// drawtext filter registered (confirmed live: `ffmpeg -filters` omits it,
// despite the printed configure line listing --enable-libfreetype), even
// though libass IS present (--enable-libass). All on-screen text is
// therefore burned in via the `subtitles` filter reading a small per-scene
// .ass file, using \pos/\an/\fs/\c override tags to reproduce the exact
// same x/y positions and colors the drawtext-based version used - this is a
// rendering-mechanism swap only, not a layout change.
type TextOverlay = { text: string; x: number; y: number; fontSize: number; color: string };

function toAssColor(ffmpegHexColor: string): string {
	const hex = ffmpegHexColor.replace(/^0x/, '').padStart(6, '0');
	const r = hex.slice(0, 2);
	const g = hex.slice(2, 4);
	const b = hex.slice(4, 6);
	return `&H00${b}${g}${r}&`;
}

function formatAssTime(totalSeconds: number): string {
	const clamped = Math.max(0, totalSeconds);
	const hours = Math.floor(clamped / 3600);
	const minutes = Math.floor((clamped % 3600) / 60);
	const seconds = Math.floor(clamped % 60);
	const centiseconds = Math.round((clamped - Math.floor(clamped)) * 100);
	const pad2 = (n: number) => String(n).padStart(2, '0');
	return `${hours}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`;
}

function escapeAssText(value: string): string {
	// ASS Dialogue text is a single line: braces start override blocks, and
	// real newlines aren't valid - the wrapSubtitleText() word-wrap already
	// inserted literal "\n" characters, which become the ASS hard-break "\N".
	return value
		.replace(/[{}]/g, '')
		.replace(/\r?\n/g, '\\N');
}

function buildAssSubtitleContent(overlays: TextOverlay[], durationSeconds: number, width: number, height: number): string {
	const header = [
		'[Script Info]',
		'ScriptType: v4.00+',
		`PlayResX: ${width}`,
		`PlayResY: ${height}`,
		'ScaledBorderAndShadow: yes',
		'',
		'[V4+ Styles]',
		'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
		`Style: Default,${FONT_FAMILY},28,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,7,0,0,0,1`,
		'',
		'[Events]',
		'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
	].join('\n');

	const end = formatAssTime(durationSeconds);
	const lines = overlays.map((overlay) => {
		// \an7 anchors the position tag to the top-left corner of the text,
		// matching drawtext's x/y-is-top-left-corner semantics exactly.
		const tags = `{\\an7\\pos(${Math.round(overlay.x)},${Math.round(overlay.y)})\\fs${Math.round(overlay.fontSize)}\\c${toAssColor(overlay.color)}}`;
		return `Dialogue: 0,0:00:00.00,${end},Default,,0,0,0,,${tags}${escapeAssText(overlay.text)}`;
	});

	return `${header}\n${lines.join('\n')}\n`;
}

// ffmpeg's subtitles filter takes the file path as a filter option value,
// where ':' and '\' need escaping for the filtergraph parser (relevant on
// Windows paths during local dev; Linux production paths have no drive-
// letter colon but the escaping is harmless either way).
function toFfmpegFilterPath(path: string): string {
	return path.replace(/\\/g, '/').replace(/:/g, '\\:');
}

// One rectangle of the figure at one instant. `name` is stable for a given
// (character, action): the same parts always come back in the same order, no
// matter the phase, which is what lets the renderer label each drawbox once
// and then retarget it over time - see buildSceneCommandScript().
type NamedBox = { name: string; x: number; y: number; w: number; h: number; color: string; thickness: number | 'fill' };

const GROUND_Y = LEG_Y + LEG_HEIGHT;

/**
 * Builds a simple 2D stickman figure (RF-004: no 3D, no complex character art)
 * from drawbox primitives, with the arm/leg layout varied per SceneAction so
 * the seven RF-017 actions are visibly distinct.
 *
 * `phase` is normalized 0..1 over one full animation cycle, so the pose is
 * sampled evenly no matter how long the scene is or how often it's sampled.
 * The pose maths runs in JS rather than in ffmpeg expressions because this
 * ffmpeg-static build evaluates drawbox's x/y/w/h expressions ONCE at filter
 * init instead of per frame (confirmed live: a `t`-based expression froze at
 * -2147483648, an int32 overflow sentinel). Runtime sendcmd commands do take
 * effect per frame, so the motion is delivered that way instead.
 */
function buildFigureBoxes(prefix: string, centerX: number, action: SceneAction, phase: number, color = 'white'): NamedBox[] {
	const swing = Math.sin(2 * Math.PI * phase);

	const headX = centerX - HEAD_SIZE / 2;
	const torsoX = centerX - TORSO_WIDTH / 2;
	const hipX = centerX - HIP_WIDTH / 2;
	const legLeftX = centerX - HIP_WIDTH / 2;
	const legRightX = centerX + HIP_WIDTH / 2 - LEG_WIDTH;
	const leftShoulderX = centerX - TORSO_WIDTH / 2;
	const rightShoulderX = centerX + TORSO_WIDTH / 2;

	// The hips dip when the legs are spread and rise at mid-stride, so the
	// whole upper body shares one vertical offset and the legs absorb it by
	// shortening. That keeps the feet on the ground line instead of sliding
	// the entire figure up and down the frame.
	const dropAmplitude = action === 'caminar' ? 14 : action === 'sentarse' ? 3 : 7;
	const drop = dropAmplitude * Math.abs(swing);
	const shoulderY = SHOULDER_Y + drop;

	const boxes: NamedBox[] = [];
	const push = (name: string, x: number, y: number, w: number, h: number, thickness: number | 'fill' = 'fill') => {
		boxes.push({
			name: `${prefix}${name}`,
			x: Math.round(x),
			y: Math.round(y),
			w: Math.max(1, Math.round(w)),
			h: Math.max(1, Math.round(h)),
			color,
			thickness,
		});
	};

	// Seen head-on, a stride reads as the legs spreading apart and coming back
	// together twice per cycle (hence |swing|). The hip bar stretches to reach
	// whatever stance the legs are in, so they never look detached from it.
	const spread = action === 'caminar' ? 44 * Math.abs(swing) : 0;

	push('head', headX, HEAD_Y + drop, HEAD_SIZE, HEAD_SIZE);
	push('torso', torsoX, NECK_Y + drop, TORSO_WIDTH, TORSO_HEIGHT);
	push('hip', hipX - spread, HIP_Y + drop, HIP_WIDTH + 2 * spread, HIP_HEIGHT);

	if (action === 'sentarse') {
		// Seated silhouette: legs bent at the knee (thigh out, shin down) and
		// shorter overall than the standing legs. Deliberately still apart from
		// the shared breathing dip - a seated pose swinging its legs looks wrong.
		const thighLength = 70;
		const shinLength = 90;
		const seatY = LEG_Y + drop;
		push('legL1', legLeftX - thighLength + LEG_WIDTH, seatY, thighLength, LEG_WIDTH);
		push('legL2', legLeftX - thighLength, seatY, LEG_WIDTH, shinLength);
		push('legR1', legRightX, seatY, thighLength, LEG_WIDTH);
		push('legR2', legRightX + thighLength - LEG_WIDTH, seatY, LEG_WIDTH, shinLength);
	} else if (action === 'caminar') {
		// Whichever leg is mid-step lifts clear of the ground line.
		const legTop = LEG_Y + drop;
		push('legL', legLeftX - spread, legTop, LEG_WIDTH, GROUND_Y - legTop - 30 * Math.max(0, swing));
		push('legR', legRightX + spread, legTop, LEG_WIDTH, GROUND_Y - legTop - 30 * Math.max(0, -swing));
	} else {
		const legTop = LEG_Y + drop;
		push('legL', legLeftX, legTop, LEG_WIDTH, GROUND_Y - legTop);
		push('legR', legRightX, legTop, LEG_WIDTH, GROUND_Y - legTop);
	}

	switch (action) {
		case 'senalar': {
			// Left arm hangs neutral; right arm jabs the pointing gesture outward
			// and back on a loop, like emphasizing a point while talking.
			push('armL', leftShoulderX - ARM_THICKNESS - HANGING_ARM_GAP, shoulderY, ARM_THICKNESS, ARM_LENGTH + 20);
			const riserHeight = 40;
			push('armR1', rightShoulderX, shoulderY - riserHeight, ARM_THICKNESS, riserHeight);
			push('armR2', rightShoulderX, shoulderY - riserHeight, 70 + 60 * Math.abs(swing), ARM_THICKNESS);
			break;
		}
		case 'pensar': {
			// Left arm hangs neutral; the "thinking hand" taps near the chin.
			push('armL', leftShoulderX - ARM_THICKNESS - HANGING_ARM_GAP, shoulderY, ARM_THICKNESS, ARM_LENGTH + 20);
			const riserTopY = HEAD_Y + HEAD_SIZE - 10 + drop;
			push('armR1', rightShoulderX, riserTopY, ARM_THICKNESS, shoulderY - riserTopY);
			push('armR2', centerX - 10 + 12 * swing, riserTopY + 10 * Math.abs(swing), 20, 14);
			break;
		}
		case 'telefono': {
			// Left arm hangs neutral; the phone rectangle held to the ear rocks
			// with the nodding of an ongoing call.
			push('armL', leftShoulderX - ARM_THICKNESS - HANGING_ARM_GAP, shoulderY, ARM_THICKNESS, ARM_LENGTH + 20);
			const riserTopY = HEAD_Y + 30 + drop;
			push('armR1', rightShoulderX, riserTopY, ARM_THICKNESS, shoulderY - riserTopY);
			push('phone', centerX + HEAD_SIZE / 2 - 6 + 8 * swing, HEAD_Y + 10 + drop, 22, 34);
			break;
		}
		case 'mostrar_objeto': {
			// Left arm neutral; right arm raises and lowers as if presenting
			// something held up for the viewer to see.
			push('armL1', leftShoulderX - ARM_LENGTH, shoulderY, ARM_LENGTH, ARM_THICKNESS);
			push('armL2', leftShoulderX - ARM_LENGTH, shoulderY, ARM_THICKNESS, FOREARM_LENGTH);
			const raiseY = shoulderY - 45 * Math.abs(swing);
			push('armR1', rightShoulderX, raiseY, ARM_LENGTH, ARM_THICKNESS);
			push('armR2', rightShoulderX + ARM_LENGTH - ARM_THICKNESS, raiseY, ARM_THICKNESS, FOREARM_LENGTH);
			break;
		}
		case 'caminar': {
			// Arms pump in opposite phase to each other. The upper segment stays
			// anchored at the shoulder and changes length instead of sliding
			// sideways - drawbox can only draw axis-aligned rectangles, so a
			// swinging arm that kept its length would tear away from the torso.
			const reachLeft = ARM_LENGTH + 26 * swing;
			const reachRight = ARM_LENGTH - 26 * swing;
			push('armL1', leftShoulderX - reachLeft, shoulderY, reachLeft, ARM_THICKNESS);
			push('armL2', leftShoulderX - reachLeft, shoulderY, ARM_THICKNESS, FOREARM_LENGTH);
			push('armR1', rightShoulderX, shoulderY, reachRight, ARM_THICKNESS);
			push('armR2', rightShoulderX + reachRight - ARM_THICKNESS, shoulderY, ARM_THICKNESS, FOREARM_LENGTH);
			break;
		}
		case 'hablar':
		default: {
			// Standing neutral pose with both arms gesturing while talking.
			const talkSway = 16 * swing;
			push('armL1', leftShoulderX - ARM_LENGTH, shoulderY + talkSway, ARM_LENGTH, ARM_THICKNESS);
			push('armL2', leftShoulderX - ARM_LENGTH, shoulderY + talkSway, ARM_THICKNESS, FOREARM_LENGTH);
			push('armR1', rightShoulderX, shoulderY - talkSway, ARM_LENGTH, ARM_THICKNESS);
			push('armR2', rightShoulderX + ARM_LENGTH - ARM_THICKNESS, shoulderY - talkSway, ARM_THICKNESS, FOREARM_LENGTH);
			break;
		}
	}

	return boxes;
}

// RF-018: simple 2D visual elements. drawbox only draws rectangles, so each
// prop is a labeled outline box placed to the side of the character(s).
// Returns the box separately from its text label (a TextOverlay, rendered via
// the libass path - see above).
function buildPropVisual(prop: ScenePropType, accentColor: string, canvasWidth: number): { box: NamedBox | null; overlays: TextOverlay[] } {
	const label = prop === 'ninguno' ? undefined : PROP_LABELS[prop];
	if (!label) return { box: null, overlays: [] };

	const boxSize = 180;
	const boxX = canvasWidth - boxSize - 90;
	const boxY = HEAD_Y;

	return {
		box: { name: 'prop', x: boxX, y: boxY, w: boxSize, h: boxSize, color: accentColor, thickness: 4 },
		overlays: [{ text: label, x: boxX, y: boxY + boxSize + 12, fontSize: 26, color: accentColor }],
	};
}

// Every box drawn for a scene at one instant: the figure(s), the character
// badge and the prop outline. Text is intentionally not here - it's built once
// per scene by buildSceneTextOverlays() and burned in via libass, since
// labels and subtitles don't move with the figure.
function buildSceneBoxes(scene: RenderScene, phase: number, width: number, textColor: string): NamedBox[] {
	const boxes = buildFigureBoxes('f0', FIGURE_CENTER_X, scene.action, phase);
	if (scene.character === 'pareja') {
		// The partner is deliberately out of step so the two figures read as two
		// people rather than one mirrored object.
		boxes.push(...buildFigureBoxes('f1', FIGURE_CENTER_X + PAREJA_OFFSET_X, scene.action, (phase + 0.35) % 1));
	}

	// Rides along with the head's vertical offset so the badge never detaches.
	const headDrop = boxes[0].y - HEAD_Y;
	boxes.push({
		name: 'badge',
		x: Math.round(FIGURE_CENTER_X + HEAD_SIZE / 2 + 10),
		y: Math.round(HEAD_Y - 10 + headDrop),
		w: 30,
		h: 30,
		color: CHARACTER_BADGE_COLORS[scene.character] ?? CHARACTER_BADGE_COLORS.generico,
		thickness: 'fill',
	});

	const prop = buildPropVisual(scene.prop, textColor, width).box;
	if (prop) boxes.push(prop);

	return boxes;
}

// How often the pose is resampled, and how long one full animation cycle
// (e.g. one complete stride) lasts.
const ANIMATION_FPS = 12;
const ANIMATION_CYCLE_SECONDS = 1.1;

function boxToFilter(box: NamedBox): string {
	const thickness = box.thickness === 'fill' ? 'fill' : String(box.thickness);
	return `drawbox@${box.name}=x=${box.x}:y=${box.y}:w=${box.w}:h=${box.h}:color=${box.color}:t=${thickness}`;
}

// Samples the pose ANIMATION_FPS times a second and emits a sendcmd script
// that retargets only the box parameters that actually changed since the
// previous sample. Unlike drawbox's own x/y/w/h expressions (init-only on this
// build), sendcmd commands are applied while the filtergraph runs, so this is
// what actually produces motion.
function buildSceneCommandScript(scene: RenderScene, durationSeconds: number, width: number, textColor: string): string {
	const lines: string[] = [];
	let previous = buildSceneBoxes(scene, 0, width, textColor);

	for (let sample = 1; sample / ANIMATION_FPS < durationSeconds; sample += 1) {
		const time = sample / ANIMATION_FPS;
		const current = buildSceneBoxes(scene, (time / ANIMATION_CYCLE_SECONDS) % 1, width, textColor);

		const commands: string[] = [];
		current.forEach((box, boxIndex) => {
			const before = previous[boxIndex];
			if (box.x !== before.x) commands.push(`drawbox@${box.name} x ${box.x}`);
			if (box.y !== before.y) commands.push(`drawbox@${box.name} y ${box.y}`);
			if (box.w !== before.w) commands.push(`drawbox@${box.name} w ${box.w}`);
			if (box.h !== before.h) commands.push(`drawbox@${box.name} h ${box.h}`);
		});

		if (commands.length > 0) lines.push(`${time.toFixed(3)} ${commands.join(', ')};`);
		previous = current;
	}

	return lines.join('\n');
}

function buildSceneTextOverlays(index: number, scene: RenderScene, description: string, width: number, height: number, textColor: string): TextOverlay[] {
	const overlays: TextOverlay[] = [];
	overlays.push(...buildPropVisual(scene.prop, textColor, width).overlays);

	const characterLabel = String(scene.character || 'generico').toUpperCase();
	overlays.push({ text: `ESCENA ${index + 1}`, x: 50, y: 45, fontSize: 34, color: textColor });
	overlays.push({ text: characterLabel, x: 50, y: 95, fontSize: 24, color: textColor });
	overlays.push({ text: description, x: 50, y: Math.round(height * 0.86), fontSize: 30, color: textColor });

	return overlays;
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

async function render(job: RenderJob) {
	if (!Array.isArray(job.scenes) || job.scenes.length === 0) {
		throw new Error('El trabajo necesita al menos una escena.');
	}

	const jobId = job.id ?? randomUUID();
	const jobDirectory = join(renderDirectory, jobId);
	await mkdir(jobDirectory, { recursive: true });

	const branding = job.branding ?? DEFAULT_BRANDING;
	const backgroundColor = toFfmpegHexColor(branding.primary_color, DEFAULT_BACKGROUND_COLOR);
	const textColor = toFfmpegHexColor(branding.secondary_color, DEFAULT_TEXT_COLOR);
	const { width, height } = PLATFORM_DIMENSIONS[job.platform] ?? PLATFORM_DIMENSIONS.reels;

	try {
		const clips: string[] = [];
		const scenes = [...job.scenes].sort((first, second) => first.order - second.order);

		for (let index = 0; index < scenes.length; index += 1) {
			const scene = scenes[index];
			const duration = Math.max(1, Math.min(60, Number(scene.duration_seconds) || 1));
			// No drawtext-oriented escaping needed anymore - text goes through
			// the ASS subtitle path now, escaped separately in escapeAssText().
			const description = wrapSubtitleText(scene.description || `Escena ${index + 1}`);
			const clipPath = join(jobDirectory, `scene-${index + 1}.mp4`);

			// The figure is drawn once as labeled drawbox instances holding the
			// pose at phase 0; the sendcmd script then retargets those same boxes
			// as the clip plays, which is what animates them.
			const boxFilters = buildSceneBoxes(scene, 0, width, textColor).map(boxToFilter);
			const commandScript = buildSceneCommandScript(scene, duration, width, textColor);
			const filterParts: string[] = [];
			if (commandScript.length > 0) {
				const commandPath = join(jobDirectory, `scene-${index + 1}.cmd`);
				await writeFile(commandPath, `${commandScript}\n`, 'utf8');
				filterParts.push(`sendcmd=f='${toFfmpegFilterPath(commandPath)}'`);
			}
			filterParts.push(...boxFilters);

			const overlays = buildSceneTextOverlays(index, scene, description, width, height, textColor);
			const assPath = join(jobDirectory, `scene-${index + 1}.ass`);
			await writeFile(assPath, buildAssSubtitleContent(overlays, duration, width, height), 'utf8');
			filterParts.push(`subtitles='${toFfmpegFilterPath(assPath)}':fontsdir='${toFfmpegFilterPath(FONT_DIRECTORY)}'`);

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

			await runFfmpeg([
				'-y',
				'-f', 'lavfi',
				'-i', `color=c=${backgroundColor}:s=${width}x${height}:r=30:d=${duration}`,
				...audioInputArgs,
				'-vf', filterParts.join(','),
				'-map', '0:v',
				'-map', '1:a',
				'-c:v', 'libx264',
				'-threads', String(ENCODER_THREADS),
				'-c:a', 'aac',
				'-shortest',
				'-pix_fmt', 'yuv420p',
				'-movflags', '+faststart',
				clipPath,
			]);
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
