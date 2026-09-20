import { createCanvas, GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import { dirname, join } from 'node:path';

export type CharacterType = 'broker' | 'cliente' | 'pareja' | 'hombre' | 'mujer' | 'generico';
export type SceneAction = 'hablar' | 'caminar' | 'senalar' | 'sentarse' | 'pensar' | 'telefono' | 'mostrar_objeto';
export type ScenePropType = 'casa' | 'carro' | 'banco' | 'telefono' | 'documento' | 'dinero' | 'grafico' | 'oficina' | 'ninguno';

export interface FrameScene {
	index: number;
	character: CharacterType;
	action: SceneAction;
	prop: ScenePropType;
	description: string;
}

export interface FrameStyle {
	width: number;
	height: number;
	background: string;
	ink: string;
	/** Brand typeface (RF-026/RF-027). Resolved through resolveFontFamily(). */
	fontFamily?: string;
}

const FONT_DIRECTORY = join(dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');

// The bundled DejaVu set covers four visually distinct families, which is what
// makes the brand typography setting mean something. Nothing proprietary can
// be shipped here, so a brand asking for Arial gets the sans, Georgia the
// serif, and so on - resolveFontFamily() does that mapping.
const FONT_FILES: Record<string, { regular: string; bold: string }> = {
	sans: { regular: 'DejaVuSans.ttf', bold: 'DejaVuSans-Bold.ttf' },
	serif: { regular: 'DejaVuSerif.ttf', bold: 'DejaVuSerif-Bold.ttf' },
	mono: { regular: 'DejaVuSansMono.ttf', bold: 'DejaVuSansMono-Bold.ttf' },
	condensed: { regular: 'DejaVuSansCondensed.ttf', bold: 'DejaVuSansCondensed-Bold.ttf' },
};

for (const [key, files] of Object.entries(FONT_FILES)) {
	GlobalFonts.registerFromPath(join(FONT_DIRECTORY, files.regular), `Stickman ${key}`);
	GlobalFonts.registerFromPath(join(FONT_DIRECTORY, files.bold), `Stickman ${key} Bold`);
}

export const FONT_CHOICES = ['sans', 'serif', 'mono', 'condensed'] as const;
export type FontChoice = (typeof FONT_CHOICES)[number];

// Accepts either one of our own names or a real-world family name, so branding
// saved before this existed ("Arial", "Georgia") keeps working.
const FONT_ALIASES: Record<string, FontChoice> = {
	arial: 'sans', helvetica: 'sans', verdana: 'sans', inter: 'sans', roboto: 'sans', 'sans-serif': 'sans',
	georgia: 'serif', times: 'serif', 'times new roman': 'serif', garamond: 'serif', serif: 'serif',
	courier: 'mono', 'courier new': 'mono', consolas: 'mono', monospace: 'mono',
	'arial narrow': 'condensed', oswald: 'condensed',
};

export function resolveFontFamily(value: unknown): FontChoice {
	const name = typeof value === 'string' ? value.trim().toLowerCase() : '';
	if ((FONT_CHOICES as readonly string[]).includes(name)) return name as FontChoice;
	return FONT_ALIASES[name] ?? 'sans';
}

function fontOf(style: FrameStyle, size: number, bold = false) {
	const family = resolveFontFamily(style.fontFamily);
	return `${size}px "Stickman ${family}${bold ? ' Bold' : ''}", sans-serif`;
}

// ---- Skeleton proportions, in canvas pixels at 1080x1920 ----
const GROUND_Y = 1430;
const THIGH = 175;
const SHIN = 170;
const LEG_TOTAL = THIGH + SHIN;
const TORSO = 300;
const UPPER_ARM = 128;
const FOREARM = 120;
const HEAD_RADIUS = 60;
const NECK = 24;
const LIMB_WIDTH = 24;
const TORSO_WIDTH = 36;

const DEG = Math.PI / 180;
// Facial features and the head outline keep their own dark tone, independent of
// the brand colours, so a face stays legible whatever the client picks.
const FACE_LINE = '#2c2620';

interface Palette {
	body: string;
	accent: string;
	hair: string | null;
	label: string;
}

// Each character reads as a different person through body colour, an accent
// (tie, scarf, collar) and hair shape - not through different proportions.
const PALETTES: Record<CharacterType, Palette> = {
	broker: { body: '#2f6fd0', accent: '#f2c744', hair: 'short', label: 'Asesor' },
	cliente: { body: '#26a269', accent: '#ffffff', hair: 'short', label: 'Cliente' },
	pareja: { body: '#e07a3f', accent: '#ffffff', hair: 'short', label: 'Pareja' },
	hombre: { body: '#8e5cd9', accent: '#ffffff', hair: 'short', label: 'Hombre' },
	mujer: { body: '#e0539b', accent: '#ffffff', hair: 'long', label: 'Mujer' },
	generico: { body: '#7d8a9c', accent: '#ffffff', hair: null, label: 'Persona' },
};

function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t;
}

function easeInOut(t: number) {
	return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Draws a limb segment from (x, y) at `angle` degrees off straight-down, returning its far end. */
function segment(ctx: SKRSContext2D, x: number, y: number, angle: number, length: number, width: number, color: string) {
	const endX = x + Math.sin(angle * DEG) * length;
	const endY = y + Math.cos(angle * DEG) * length;
	ctx.strokeStyle = color;
	ctx.lineWidth = width;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(endX, endY);
	ctx.stroke();
	return { x: endX, y: endY };
}

interface Pose {
	hipX: number;
	hipY: number;
	lean: number;
	headTilt: number;
	thighL: number; kneeL: number;
	thighR: number; kneeR: number;
	shoulderL: number; elbowL: number;
	shoulderR: number; elbowR: number;
	mouthOpen: number;
	seated: boolean;
}

/**
 * Motion that does not belong to any single action: the small involuntary
 * movement that separates a living figure from a posed mannequin. Driven by
 * absolute scene time rather than the action's loop phase, and offset per
 * figure, so two characters in the same scene never breathe or blink in
 * lockstep.
 */
interface LifeSigns {
	breath: number;   // slow chest rise, in pixels
	sway: number;     // weight shifting between the feet, in degrees of lean
	eyeOpen: number;  // 1 open, 0 fully closed
	headDrift: number;
}

function lifeSignsAt(t: number, seed: number): LifeSigns {
	const breath = 3.4 * Math.sin((t / 3.1 + seed) * Math.PI * 2);
	const sway = 1.5 * Math.sin((t / 5.3 + seed * 1.7) * Math.PI * 2);
	const headDrift = 2.2 * Math.sin((t / 4.1 + seed * 2.3) * Math.PI * 2);

	// Blinks are a fast close-open, roughly every 3.4s, offset per figure. The
	// interval is deliberately not a round number so blinks never line up with
	// the action loop.
	const blinkEvery = 3.4;
	const sinceBlink = (t + seed * blinkEvery) % blinkEvery;
	const blinkDuration = 0.13;
	const eyeOpen = sinceBlink < blinkDuration
		? Math.abs(Math.cos((sinceBlink / blinkDuration) * Math.PI))
		: 1;

	return { breath, sway, eyeOpen, headDrift };
}

/**
 * Every action is one function of `phase` (0..1 over one loop) producing joint
 * angles.
 *
 * ANGLE CONVENTION, used by every value below and by segment(): degrees off
 * straight-down, positive turning toward +x (the viewer's right). So 0 hangs
 * straight down, 90 points right, -90 points left, 180 points straight up.
 * Upper-arm and thigh angles are absolute; elbow and knee angles are relative
 * to the segment above them, so the forearm sits at shoulder + elbow.
 * The figure faces the viewer, and props are always on its +x side.
 */
function poseFor(action: SceneAction, phase: number, centerX: number): Pose {
	const w = phase * Math.PI * 2;
	const swing = Math.sin(w);

	const base: Pose = {
		hipX: centerX,
		hipY: GROUND_Y - LEG_TOTAL,
		lean: 0,
		headTilt: 0,
		thighL: -5, kneeL: 0,
		thighR: 5, kneeR: 0,
		shoulderL: -10, elbowL: -6,
		shoulderR: 10, elbowR: 6,
		mouthOpen: 0.15,
		seated: false,
	};

	switch (action) {
		case 'caminar': {
			// Legs counter-swing; the knee only bends on the leg that has passed
			// behind the body, which is what stops a walk reading as a scissor.
			// Arms counter-swing against the legs and the hips drop at the
			// widest part of the stride.
			// The small constant offsets matter: without them both legs and both
			// arms land on exactly the same angle at the crossover point twice
			// per stride and the whole figure flattens into a single line.
			const armSwing = Math.sin(w + 0.4);
			base.thighL = 25 * swing - 4;
			base.thighR = -25 * swing + 4;
			base.kneeL = Math.min(-6, 36 * swing);
			base.kneeR = Math.min(-6, -36 * swing);
			base.shoulderL = -22 * armSwing - 6;
			base.shoulderR = 22 * armSwing + 6;
			base.elbowL = -12;
			base.elbowR = 12;
			base.hipY -= 10 * Math.abs(Math.cos(w));
			base.mouthOpen = 0.1;
			break;
		}
		case 'hablar': {
			// Forearms up and out at chest height, alternating, mouth moving.
			base.shoulderL = -34 + 7 * swing;
			base.elbowL = -74 - 10 * swing;
			base.shoulderR = 34 - 7 * Math.sin(w + Math.PI / 2);
			base.elbowR = 74 + 10 * Math.sin(w + Math.PI / 2);
			base.headTilt = 2 * swing;
			base.mouthOpen = 0.25 + 0.35 * Math.abs(Math.sin(w * 2));
			base.hipY -= 3 * Math.abs(swing);
			break;
		}
		case 'senalar': {
			// Right arm out level toward the prop, pushing a little on each beat.
			base.shoulderL = -12;
			base.elbowL = -8;
			base.shoulderR = 84 - 7 * Math.abs(swing);
			base.elbowR = 4;
			base.headTilt = 3;
			base.mouthOpen = 0.2 + 0.3 * Math.abs(Math.sin(w * 2));
			break;
		}
		case 'sentarse': {
			// Thighs forward and level, shins straight down: sitting on a chair.
			base.seated = true;
			base.hipY = GROUND_Y - SHIN - 26;
			base.thighL = 74;
			base.thighR = 86;
			base.kneeL = -74;
			base.kneeR = -86;
			base.shoulderL = -16;
			base.elbowL = -34;
			base.shoulderR = 16;
			base.elbowR = 34;
			base.lean = -5;
			base.hipY -= 2 * Math.abs(swing);
			base.mouthOpen = 0.18;
			break;
		}
		case 'pensar': {
			// Right hand up at the chin, head tilted, other arm folded across.
			base.shoulderL = -14;
			base.elbowL = -22;
			base.shoulderR = 24;
			base.elbowR = 138 + 5 * swing;
			base.headTilt = -8 + 3 * swing;
			base.lean = -3;
			base.mouthOpen = 0.05;
			break;
		}
		case 'telefono': {
			// Right forearm folded up to the ear, holding a handset.
			base.shoulderL = -13;
			base.elbowL = -10;
			base.shoulderR = 30;
			base.elbowR = 140;
			base.headTilt = 5 + 3 * swing;
			base.mouthOpen = 0.2 + 0.3 * Math.abs(Math.sin(w * 2));
			break;
		}
		case 'mostrar_objeto': {
			// Right arm presents toward the prop, rising and settling.
			const raise = easeInOut((Math.sin(w) + 1) / 2);
			base.shoulderL = -13;
			base.elbowL = -10;
			base.shoulderR = lerp(64, 96, raise);
			base.elbowR = lerp(28, 2, raise);
			base.headTilt = 3;
			base.mouthOpen = 0.2 + 0.25 * Math.abs(Math.sin(w * 2));
			break;
		}
	}

	return base;
}

function drawHead(ctx: SKRSContext2D, x: number, y: number, tilt: number, palette: Palette, mouthOpen: number, eyeOpen: number) {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(tilt * DEG);

	if (palette.hair === 'long') {
		ctx.fillStyle = '#3b2a22';
		ctx.beginPath();
		ctx.ellipse(0, 6, HEAD_RADIUS + 16, HEAD_RADIUS + 26, 0, 0, Math.PI * 2);
		ctx.fill();
	}

	// Facial features use their own fixed dark tone rather than the brand ink:
	// the ink is whatever secondary_color the client set, and white eyes on a
	// skin-toned face are invisible.
	ctx.fillStyle = '#f1d3b4';
	ctx.strokeStyle = FACE_LINE;
	ctx.lineWidth = 5;
	ctx.beginPath();
	ctx.arc(0, 0, HEAD_RADIUS, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();

	if (palette.hair) {
		// Half-disc cap: a partial arc would fill back to the centre and read
		// as a wedge sticking out of the head.
		ctx.fillStyle = '#3b2a22';
		ctx.beginPath();
		ctx.arc(0, -6, HEAD_RADIUS, Math.PI, Math.PI * 2);
		ctx.closePath();
		ctx.fill();
	}

	// A blink squashes the eye vertically rather than hiding it, so the lids
	// read as closing instead of the eyes popping out of existence.
	ctx.fillStyle = FACE_LINE;
	// Sat below the hairline: the hair cap fills down to y=-6, so eyes any
	// higher get painted over by it.
	const eyeRadius = 7;
	const lidHeight = Math.max(0.9, eyeRadius * eyeOpen);
	for (const eyeX of [-20, 20]) {
		ctx.beginPath();
		ctx.ellipse(eyeX, 8, eyeRadius, lidHeight, 0, 0, Math.PI * 2);
		ctx.fill();
	}

	const mouthHeight = 4 + mouthOpen * 22;
	ctx.fillStyle = '#8c4a4a';
	ctx.beginPath();
	ctx.ellipse(0, 36, 14 + mouthOpen * 4, mouthHeight / 2, 0, 0, Math.PI * 2);
	ctx.fill();

	ctx.restore();
}

function drawFigure(
	ctx: SKRSContext2D,
	character: CharacterType,
	action: SceneAction,
	phase: number,
	t: number,
	centerX: number,
	ink: string,
	seed: number,
	mouthOverride: number | null,
) {
	const palette = PALETTES[character] ?? PALETTES.generico;
	const pose = poseFor(action, phase, centerX);
	const life = lifeSignsAt(t, seed);

	// Sitting has its own contact with the ground and walking already has its
	// own vertical rhythm, so breath and weight shift only apply where they
	// would not fight the action.
	const idle = action !== 'caminar' && action !== 'sentarse';
	const hipX = pose.hipX;
	const hipY = pose.hipY - (idle ? life.breath * 0.35 : 0);
	const lean = pose.lean + (idle ? life.sway : 0);
	const torsoLength = TORSO + (idle ? life.breath : 0);
	const shoulderX = hipX + Math.sin(lean * DEG) * torsoLength;
	const shoulderY = hipY - Math.cos(lean * DEG) * torsoLength;

	// Legs first so the torso overlaps them at the hip.
	const kneeL = segment(ctx, hipX, hipY, pose.thighL, THIGH, LIMB_WIDTH, palette.body);
	segment(ctx, kneeL.x, kneeL.y, pose.thighL + pose.kneeL, SHIN, LIMB_WIDTH, palette.body);
	const kneeR = segment(ctx, hipX, hipY, pose.thighR, THIGH, LIMB_WIDTH, palette.body);
	segment(ctx, kneeR.x, kneeR.y, pose.thighR + pose.kneeR, SHIN, LIMB_WIDTH, palette.body);

	// Torso
	ctx.strokeStyle = palette.body;
	ctx.lineWidth = TORSO_WIDTH;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(hipX, hipY);
	ctx.lineTo(shoulderX, shoulderY);
	ctx.stroke();

	// A collar/tie strip reads as clothing without adding a second silhouette.
	ctx.strokeStyle = palette.accent;
	ctx.lineWidth = 9;
	ctx.beginPath();
	ctx.moveTo(shoulderX, shoulderY + 6);
	ctx.lineTo(lerp(shoulderX, hipX, 0.42), lerp(shoulderY, hipY, 0.42));
	ctx.stroke();

	const elbowL = segment(ctx, shoulderX, shoulderY, pose.shoulderL, UPPER_ARM, LIMB_WIDTH, palette.body);
	const handL = segment(ctx, elbowL.x, elbowL.y, pose.shoulderL + pose.elbowL, FOREARM, LIMB_WIDTH, palette.body);
	const elbowR = segment(ctx, shoulderX, shoulderY, pose.shoulderR, UPPER_ARM, LIMB_WIDTH, palette.body);
	const handR = segment(ctx, elbowR.x, elbowR.y, pose.shoulderR + pose.elbowR, FOREARM, LIMB_WIDTH, palette.body);

	// The head counter-rotates slightly against the body's lean, the way a
	// person keeps their eyeline level, and drifts on its own slow cycle.
	const headAngle = pose.headTilt + lean * 0.55 + life.headDrift;
	const headX = shoulderX + Math.sin(headAngle * DEG) * (NECK + HEAD_RADIUS);
	const headY = shoulderY - Math.cos(headAngle * DEG) * (NECK + HEAD_RADIUS);
	drawHead(ctx, headX, headY, headAngle, palette, mouthOverride ?? pose.mouthOpen, life.eyeOpen);

	// A handset in the raised hand makes 'telefono' unambiguous.
	if (action === 'telefono') {
		ctx.save();
		ctx.translate(handR.x, handR.y);
		ctx.fillStyle = '#1e2732';
		ctx.strokeStyle = ink;
		ctx.lineWidth = 4;
		roundRect(ctx, -14, -26, 28, 52, 7);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}

	return { handL, handR, headX, headY, shoulderX, shoulderY };
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
	const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
	ctx.beginPath();
	ctx.moveTo(x + radius, y);
	ctx.arcTo(x + w, y, x + w, y + h, radius);
	ctx.arcTo(x + w, y + h, x, y + h, radius);
	ctx.arcTo(x, y + h, x, y, radius);
	ctx.arcTo(x, y, x + w, y, radius);
	ctx.closePath();
}

// ---- Props: each drawn as a small illustration, not a labelled box ----
function drawProp(ctx: SKRSContext2D, prop: ScenePropType, cx: number, cy: number, bob: number, ink: string) {
	if (prop === 'ninguno') return;

	ctx.save();
	ctx.translate(cx, cy + bob);
	ctx.lineWidth = 7;
	ctx.lineJoin = 'round';
	ctx.strokeStyle = ink;

	switch (prop) {
		case 'casa': {
			ctx.fillStyle = '#e8eef7';
			roundRect(ctx, -90, -30, 180, 150, 8);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#d4573f';
			ctx.beginPath();
			ctx.moveTo(-112, -30);
			ctx.lineTo(0, -128);
			ctx.lineTo(112, -30);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#7a5230';
			roundRect(ctx, -28, 36, 56, 84, 4);
			ctx.fill();
			ctx.stroke();
			break;
		}
		case 'carro': {
			ctx.fillStyle = '#3f7fd4';
			roundRect(ctx, -120, -10, 240, 80, 18);
			ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(-78, -10);
			ctx.lineTo(-48, -68);
			ctx.lineTo(56, -68);
			ctx.lineTo(84, -10);
			ctx.closePath();
			ctx.fillStyle = '#cfe0f5';
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#20262f';
			for (const wx of [-66, 66]) {
				ctx.beginPath();
				ctx.arc(wx, 74, 28, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
			}
			break;
		}
		case 'banco': {
			ctx.fillStyle = '#e8eef7';
			roundRect(ctx, -110, -20, 220, 130, 6);
			ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(-126, -20);
			ctx.lineTo(0, -96);
			ctx.lineTo(126, -20);
			ctx.closePath();
			ctx.fillStyle = '#c9d6e8';
			ctx.fill();
			ctx.stroke();
			ctx.strokeStyle = ink;
			ctx.lineWidth = 12;
			for (const px of [-72, -24, 24, 72]) {
				ctx.beginPath();
				ctx.moveTo(px, 4);
				ctx.lineTo(px, 96);
				ctx.stroke();
			}
			break;
		}
		case 'telefono': {
			ctx.fillStyle = '#1e2732';
			roundRect(ctx, -58, -104, 116, 208, 16);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#5fd0ff';
			roundRect(ctx, -44, -84, 88, 156, 8);
			ctx.fill();
			break;
		}
		case 'documento': {
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.moveTo(-72, -104);
			ctx.lineTo(36, -104);
			ctx.lineTo(76, -60);
			ctx.lineTo(76, 108);
			ctx.lineTo(-72, 108);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(36, -104);
			ctx.lineTo(36, -60);
			ctx.lineTo(76, -60);
			ctx.stroke();
			ctx.strokeStyle = '#9aa7b8';
			ctx.lineWidth = 8;
			for (let i = 0; i < 5; i += 1) {
				const ly = -26 + i * 28;
				ctx.beginPath();
				ctx.moveTo(-48, ly);
				ctx.lineTo(i === 4 ? 8 : 52, ly);
				ctx.stroke();
			}
			break;
		}
		case 'dinero': {
			ctx.fillStyle = '#2f9e63';
			roundRect(ctx, -108, -62, 216, 124, 10);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#d8f3e3';
			ctx.beginPath();
			ctx.arc(0, 0, 38, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#1d7347';
			ctx.font = '54px "Stickman sans Bold", sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText('$', 0, 2);
			break;
		}
		case 'grafico': {
			ctx.fillStyle = '#ffffff';
			roundRect(ctx, -104, -100, 208, 200, 10);
			ctx.fill();
			ctx.stroke();
			const bars = [44, 88, 130, 168];
			ctx.fillStyle = '#2f6fd0';
			bars.forEach((h, i) => {
				const bx = -76 + i * 44;
				roundRect(ctx, bx, 74 - h, 30, h, 5);
				ctx.fill();
			});
			ctx.strokeStyle = ink;
			ctx.lineWidth = 6;
			ctx.beginPath();
			ctx.moveTo(-82, 78);
			ctx.lineTo(84, 78);
			ctx.stroke();
			break;
		}
		case 'oficina': {
			ctx.fillStyle = '#cfdaea';
			roundRect(ctx, -96, -132, 192, 244, 8);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#5fa8e8';
			for (let row = 0; row < 4; row += 1) {
				for (let col = 0; col < 3; col += 1) {
					roundRect(ctx, -72 + col * 50, -108 + row * 56, 34, 36, 4);
					ctx.fill();
				}
			}
			break;
		}
	}

	ctx.restore();
}

function wrapLines(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = '';
	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		if (ctx.measureText(candidate).width <= maxWidth || !current) {
			current = candidate;
		} else {
			lines.push(current);
			current = word;
		}
	}
	if (current) lines.push(current);
	return lines;
}

function drawBackground(ctx: SKRSContext2D, style: FrameStyle) {
	const { width, height, background } = style;
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, width, height);

	// A horizon band gives the figure something to stand on instead of
	// floating in flat colour.
	const gradient = ctx.createLinearGradient(0, GROUND_Y - 320, 0, height);
	gradient.addColorStop(0, 'rgba(255,255,255,0.00)');
	gradient.addColorStop(1, 'rgba(255,255,255,0.07)');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, GROUND_Y - 320, width, height - GROUND_Y + 320);

	ctx.strokeStyle = 'rgba(255,255,255,0.18)';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(0, GROUND_Y);
	ctx.lineTo(width, GROUND_Y);
	ctx.stroke();
}

function drawShadow(ctx: SKRSContext2D, x: number, scale: number) {
	ctx.save();
	ctx.fillStyle = 'rgba(0,0,0,0.28)';
	ctx.beginPath();
	ctx.ellipse(x, GROUND_Y + 8, 96 * scale, 16, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

/**
 * Draws one complete frame of a scene. `t` is seconds elapsed inside the
 * scene, `duration` its full length; everything else is derived so the same
 * call renders any frame independently.
 */
export function drawSceneFrame(ctx: SKRSContext2D, scene: FrameScene, t: number, duration: number, style: FrameStyle, mouth: number | null = null) {
	const { width, height, ink } = style;
	const cycleSeconds = scene.action === 'caminar' ? 1.0 : 2.2;
	const phase = (t / cycleSeconds) % 1;

	drawBackground(ctx, style);

	const hasProp = scene.prop !== 'ninguno';
	const figureX = hasProp ? width * 0.33 : width * 0.5;
	const propX = width * 0.72;

	if (hasProp) {
		drawProp(ctx, scene.prop, propX, GROUND_Y - 190, Math.sin(phase * Math.PI * 2) * 6, ink);
	}

	if (scene.character === 'pareja') {
		drawShadow(ctx, figureX - 96, 0.85);
		drawShadow(ctx, figureX + 108, 0.85);
		// Only one of the two speaks, so the other listens instead of both
		// mouthing the same line.
		drawFigure(ctx, 'mujer', scene.action, (phase + 0.42) % 1, t, figureX + 108, ink, 0.57, mouth === null ? null : 0.06);
		drawFigure(ctx, 'hombre', scene.action, phase, t, figureX - 96, ink, 0.13, mouth);
	} else {
		drawShadow(ctx, figureX, 1);
		drawFigure(ctx, scene.character, scene.action, phase, t, figureX, ink, 0.31, mouth);
	}

	// Scene counter, top left.
	ctx.fillStyle = ink;
	ctx.font = fontOf(style, 38, true);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.globalAlpha = 0.85;
	ctx.fillText(`ESCENA ${scene.index + 1}`, 64, 74);
	ctx.globalAlpha = 1;

	// Subtitle block, bottom, on a panel so it stays readable over anything.
	const description = scene.description.trim();
	if (description) {
		ctx.font = fontOf(style, 44);
		const lines = wrapLines(ctx, description, width - 200);
		const lineHeight = 60;
		const blockHeight = lines.length * lineHeight;
		const top = height - 220 - blockHeight;

		ctx.fillStyle = 'rgba(0,0,0,0.42)';
		roundRect(ctx, 56, top - 32, width - 112, blockHeight + 58, 18);
		ctx.fill();

		ctx.fillStyle = ink;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		lines.forEach((line, i) => {
			ctx.fillText(line, width / 2, top + i * lineHeight);
		});
	}

	// Short fade in and out so cuts between scenes don't jar.
	const fade = 0.28;
	const alpha = Math.min(1, Math.min(t, Math.max(0, duration - t)) / fade);
	if (alpha < 1) {
		ctx.fillStyle = `rgba(0,0,0,${(1 - alpha).toFixed(3)})`;
		ctx.fillRect(0, 0, width, height);
	}
}

export function createFrameCanvas(width: number, height: number) {
	return createCanvas(width, height);
}

/**
 * The scene counter and subtitle on a transparent background, as a PNG.
 *
 * Used when the scene footage comes from an AI model instead of being drawn:
 * there are no frames of ours to write the text onto, so it is composited over
 * the generated clip with ffmpeg. Kept here so both paths lay the text out
 * identically.
 */
export function renderTextOverlayPng(scene: FrameScene, style: FrameStyle): Buffer {
	const { width, height, ink } = style;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	ctx.fillStyle = ink;
	ctx.font = fontOf(style, 38, true);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.globalAlpha = 0.85;
	ctx.fillText(`ESCENA ${scene.index + 1}`, 64, 74);
	ctx.globalAlpha = 1;

	const description = scene.description.trim();
	if (description) {
		ctx.font = fontOf(style, 44);
		const lines = wrapLines(ctx, description, width - 200);
		const lineHeight = 60;
		const blockHeight = lines.length * lineHeight;
		const top = height - 220 - blockHeight;

		ctx.fillStyle = 'rgba(0,0,0,0.55)';
		roundRect(ctx, 56, top - 32, width - 112, blockHeight + 58, 18);
		ctx.fill();

		ctx.fillStyle = ink;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		lines.forEach((line, i) => ctx.fillText(line, width / 2, top + i * lineHeight));
	}

	return canvas.toBuffer('image/png');
}
