import { randomUUID } from 'node:crypto';

// Sends a failed render to Sentry when SENTRY_DSN is set; does nothing without it.
//
// Why not @sentry/node: measured on 15-Oct-2026, loading it costs ~54 MB of RSS
// even with tracing and every default integration off (OpenTelemetry comes in
// with the import itself), and this worker lives in 1 GB with renders peaking
// at 0.81 GB. Reporting an error is one documented HTTP call - the "envelope"
// endpoint - so that is all this does, at no memory cost.
//
// Only what the catch blocks hand over gets reported. A container killed for
// memory ("Killed" in the Railway log) never reaches here; the uptime monitor
// on /health is what catches that.
type Dsn = { url: string; key: string; raw: string };

const dsn = parseDsn(process.env.SENTRY_DSN?.trim());
const environment = process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? 'development';
const release = process.env.RAILWAY_GIT_COMMIT_SHA;

function parseDsn(value: string | undefined): Dsn | null {
	if (!value) return null;
	try {
		// https://<key>@<host>[/<path>]/<projectId>
		const url = new URL(value);
		const segments = url.pathname.split('/').filter(Boolean);
		const projectId = segments.pop();
		if (!url.username || !projectId) throw new Error('missing key or project');
		const prefix = segments.length ? `/${segments.join('/')}` : '';
		return { url: `${url.protocol}//${url.host}${prefix}/api/${projectId}/envelope/`, key: url.username, raw: value };
	} catch {
		console.error('SENTRY_DSN no es valido; los errores del worker no se reportan.');
		return null;
	}
}

export function errorReportingStatus(): string {
	return dsn ? 'sentry' : 'sin SENTRY_DSN';
}

// V8 stack lines ("at fn (file:line:col)" or "at file:line:col") into Sentry
// frames, oldest call first as Sentry expects.
function stackFrames(stack: string | undefined) {
	const frames = [];
	for (const line of (stack ?? '').split('\n')) {
		const match = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/.exec(line);
		if (!match) continue;
		const [, fn, file, lineno, colno] = match;
		frames.push({
			function: fn ?? '?',
			filename: file,
			lineno: Number(lineno),
			colno: Number(colno),
			in_app: !file.includes('node_modules') && !file.startsWith('node:'),
		});
	}
	return frames.reverse();
}

// Never throws and never delays the caller beyond a short timeout: a reporting
// failure must not turn into a second failure of the render it is reporting.
export async function reportError(error: unknown, context: Record<string, unknown> = {}): Promise<void> {
	if (!dsn) return;
	const err = error instanceof Error ? error : new Error(String(error));
	const eventId = randomUUID().replace(/-/g, '');
	const event = {
		event_id: eventId,
		timestamp: Date.now() / 1000,
		platform: 'node',
		level: 'error',
		environment,
		release,
		server_name: 'render-worker',
		tags: { service: 'render-worker' },
		extra: context,
		exception: { values: [{ type: err.name, value: err.message, stacktrace: { frames: stackFrames(err.stack) } }] },
	};
	const body = [
		JSON.stringify({ event_id: eventId, dsn: dsn.raw, sent_at: new Date().toISOString() }),
		JSON.stringify({ type: 'event' }),
		JSON.stringify(event),
	].join('\n');
	try {
		const response = await fetch(dsn.url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-sentry-envelope',
				'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=stickman-render-worker/1.0`,
			},
			body,
			signal: AbortSignal.timeout(5000),
		});
		if (!response.ok) console.error(`Sentry rechazo el reporte: ${response.status}`);
	} catch (reportFailure) {
		console.error('No se pudo reportar el error a Sentry:', reportFailure);
	}
}
