// Generates the app's background art. Drawn rather than downloaded: this is a
// financial product, and a generated image has no licence to trace.
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'backdrop');
mkdirSync(OUT, { recursive: true });

const W = 1920;
const H = 1200;

function mulberry(seed) {
	return () => {
		seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const rand = mulberry(20260922);

// Deep base, a shade off pure black so the glows have something to sit on.
const base = ctx.createLinearGradient(0, 0, W, H);
base.addColorStop(0, '#0a0f18');
base.addColorStop(0.5, '#101a28');
base.addColorStop(1, '#0a121c');
ctx.fillStyle = base;
ctx.fillRect(0, 0, W, H);

// Colour fields. Kept to the brand blue with one warm counterweight so the
// screen has a direction of light instead of an even wash.
const blooms = [
	{ x: 0.18, y: 0.22, r: 0.55, color: '47,111,208', alpha: 0.42 },
	{ x: 0.82, y: 0.15, r: 0.45, color: '95,208,255', alpha: 0.22 },
	{ x: 0.70, y: 0.85, r: 0.60, color: '31,72,150', alpha: 0.38 },
	{ x: 0.42, y: 0.62, r: 0.40, color: '242,199,68', alpha: 0.10 },
];
for (const bloom of blooms) {
	const g = ctx.createRadialGradient(bloom.x * W, bloom.y * H, 0, bloom.x * W, bloom.y * H, bloom.r * W);
	g.addColorStop(0, `rgba(${bloom.color},${bloom.alpha})`);
	g.addColorStop(1, `rgba(${bloom.color},0)`);
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, W, H);
}

// A faint constellation: nodes joined to their nearest neighbours. It is the
// same shape as the codebase graph, which is a nicer reason to draw it than
// decoration for its own sake.
const points = Array.from({ length: 70 }, () => ({ x: rand() * W, y: rand() * H }));
ctx.lineWidth = 1;
for (let i = 0; i < points.length; i += 1) {
	for (let j = i + 1; j < points.length; j += 1) {
		const dx = points[i].x - points[j].x;
		const dy = points[i].y - points[j].y;
		const dist = Math.hypot(dx, dy);
		if (dist > 230) continue;
		ctx.strokeStyle = `rgba(120,170,235,${(0.16 * (1 - dist / 230)).toFixed(3)})`;
		ctx.beginPath();
		ctx.moveTo(points[i].x, points[i].y);
		ctx.lineTo(points[j].x, points[j].y);
		ctx.stroke();
	}
}
for (const p of points) {
	const r = 1 + rand() * 2.2;
	ctx.fillStyle = `rgba(160,205,255,${(0.18 + rand() * 0.4).toFixed(3)})`;
	ctx.beginPath();
	ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
	ctx.fill();
}

// Grain, so the large flat gradients do not band on cheap panels.
const image = ctx.getImageData(0, 0, W, H);
const data = image.data;
for (let i = 0; i < data.length; i += 4) {
	const n = (rand() - 0.5) * 7;
	data[i] = Math.max(0, Math.min(255, data[i] + n));
	data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
	data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
}
ctx.putImageData(image, 0, 0);

const buffer = canvas.toBuffer('image/jpeg', 82);
writeFileSync(join(OUT, 'space.jpg'), buffer);
console.log(`backdrop escrito: ${(buffer.length / 1024).toFixed(0)} KB`);
