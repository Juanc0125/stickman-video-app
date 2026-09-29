import { NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/supabaseClient';

// Keepalive probe. The Supabase free plan pauses a project after ~1 week
// without activity, and a paused project takes the whole studio down until
// somebody un-pauses it by hand in the dashboard, so the daily cron declared
// in vercel.json calls this just to make the database do something. Daily
// leaves seven tries inside that week, so a failed run costs nothing.
//
// It is deliberately listed in PUBLIC_PATHS in apps/web/proxy.ts: a cron has
// no session, and an outside watchdog has to be able to read the HTTP status.
// Do not close it by reflex - it is public on purpose, and it answers with two
// fixed booleans, never with data, a row count, a table name or the Supabase
// error. Nothing here writes, so RF-012's human-approval gate is untouched.

// Without this a build-time prerender could freeze a 200 into the deployment
// and the cron would keep the page warm while never touching the database.
export const dynamic = 'force-dynamic';

// The reachability check is the point, not the rows: one id, one row, and the
// result is thrown away. Cheap enough that a caller hammering it costs nothing.
const PROBE_TIMEOUT_MS = 5_000;

export async function GET() {
    // A health probe needs no privileges, so the publishable key goes first
    // and the service role is only a fallback for a deployment that has just
    // the one key. Row-level security hiding every row is still a healthy
    // answer here: the database replied.
    const client = getSupabaseClient() ?? getSupabaseClient({ serviceRole: true });

    if (!client) {
        console.error('Supabase no esta configurado: el chequeo de salud no puede consultar la base.');
        return unhealthy();
    }

    try {
        // A paused or unreachable project can hang the socket instead of
        // failing; the timeout turns that into a 503 the watchdog can see.
        const { error } = await client
            .from('videos')
            .select('id')
            .limit(1)
            .abortSignal(AbortSignal.timeout(PROBE_TIMEOUT_MS));
        if (error) throw error;
    } catch (error) {
        console.error('El chequeo de salud no pudo leer de Supabase.', error);
        return unhealthy();
    }

    return healthy();
}

// no-store on both: a cached answer would report the state of some earlier
// request, which is exactly what a monitor must not be told.
function healthy() {
    return NextResponse.json({ ok: true, db: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}

function unhealthy() {
    return NextResponse.json({ ok: false, db: 'error' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
}
