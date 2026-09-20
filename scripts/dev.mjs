// Starts the web app and the render worker together, so `npm run dev` is the
// only command needed to run Stickman locally.
//
// Both processes read their configuration from a single .env.local at the repo
// root. Next.js would normally only look inside apps/web, which meant keeping
// two copies of the same secrets; loading it here keeps one file for both.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = join(repoRoot, '.env.local');

if (existsSync(envFile)) {
	try {
		process.loadEnvFile(envFile);
		console.log('[stickman] configuracion cargada desde .env.local');
	} catch (error) {
		console.warn('[stickman] no se pudo leer .env.local:', error.message);
	}
} else {
	console.log('[stickman] sin .env.local - se usara almacenamiento en memoria (los videos se pierden al reiniciar)');
}

const WORKER_PORT = process.env.WORKER_PORT ?? '8080';
const WEB_PORT = process.env.WEB_PORT ?? '3000';

// Point the web app at the worker we are about to start, unless the developer
// deliberately aimed it somewhere else.
const workerUrl = process.env.RENDER_WORKER_URL ?? `http://localhost:${WORKER_PORT}`;

const children = [];
let shuttingDown = false;

function start(name, color, command, args, cwd, extraEnv) {
	const child = spawn(command, args, {
		cwd,
		env: { ...process.env, ...extraEnv },
		shell: process.platform === 'win32',
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	const prefix = `\x1b[${color}m[${name}]\x1b[0m`;
	const relay = (stream) => {
		stream.setEncoding('utf8');
		let buffer = '';
		stream.on('data', (chunk) => {
			buffer += chunk;
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';
			for (const line of lines) if (line.trim()) console.log(`${prefix} ${line}`);
		});
	};
	relay(child.stdout);
	relay(child.stderr);

	child.on('exit', (code) => {
		if (shuttingDown) return;
		console.log(`${prefix} termino con codigo ${code}`);
		shutdown(code ?? 1);
	});

	children.push(child);
	return child;
}

function shutdown(code) {
	if (shuttingDown) return;
	shuttingDown = true;
	for (const child of children) child.kill();
	process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

start('worker', '36', 'npm', ['run', 'dev', '--workspace', '@stickman-video-app/render-worker'], repoRoot, {
	PORT: WORKER_PORT,
});

start('web', '35', 'npm', ['run', 'dev', '--workspace', 'web'], repoRoot, {
	PORT: WEB_PORT,
	RENDER_WORKER_URL: workerUrl,
});

console.log(`\n[stickman] worker en http://localhost:${WORKER_PORT}`);
console.log(`[stickman] abre la app en \x1b[1mhttp://localhost:${WEB_PORT}\x1b[0m\n`);
