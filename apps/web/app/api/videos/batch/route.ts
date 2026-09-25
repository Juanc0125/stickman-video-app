import { NextResponse } from 'next/server';
import { getTemplate } from '@shared-types/templates';
import type { Platform } from '@shared-types/video';
import { POST as planScenesRoute } from '../[id]/scenes/route';
import { createVideo } from '../../../../lib/video-persistence';
import type { VideoRecord } from '../store';

const PLATFORMS: Platform[] = ['reels', 'tiktok', 'shorts'];

// RF-024, priority "baja": bulk creation of drafts, nothing more. Each topic
// is at least one model call (the script) and two when con_escenas is asked
// for (script + scene plan), so the cap keeps one request from queueing more
// work than the free model tier can take.
const MAX_TOPICS = 8;

const INTERNAL_URL = 'http://batch.local/api';

interface BatchFailure {
    tema: string;
    error: string;
}

// The scene planner - its JSON coercion and its sentence fallback - lives only
// in [id]/scenes/route.ts. This calls that handler in process, the same way
// copilot.ts does, instead of keeping a second copy of any of it.
async function planScenes(id: string): Promise<VideoRecord> {
    const response = await planScenesRoute(new Request(INTERNAL_URL, { method: 'POST' }), { params: Promise.resolve({ id }) });
    const payload = await response.json().catch(() => null) as { video?: VideoRecord; error?: string } | null;
    if (!response.ok || !payload?.video) {
        throw new Error(payload?.error ?? 'No se pudieron generar las escenas.');
    }
    return payload.video;
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => null) as {
        temas?: unknown;
        platform?: unknown;
        target_duration_seconds?: unknown;
        template?: unknown;
        con_escenas?: unknown;
    } | null;

    const rawTopics = Array.isArray(body?.temas) ? body.temas : null;
    if (!rawTopics || rawTopics.length === 0) {
        return NextResponse.json({ error: 'Debes indicar al menos un tema.' }, { status: 400 });
    }
    if (rawTopics.length > MAX_TOPICS) {
        return NextResponse.json({ error: `No se pueden pedir mas de ${MAX_TOPICS} temas por lote.` }, { status: 400 });
    }

    // Same defaults and the same rejection as POST /api/videos: a platform the
    // client did not send becomes 'reels', one it sent but misspelled is a 4xx.
    const rawPlatform = typeof body?.platform === 'string' ? body.platform : 'reels';
    const platform = (PLATFORMS as string[]).includes(rawPlatform) ? rawPlatform as Platform : null;
    if (!platform) {
        return NextResponse.json({ error: 'La plataforma debe ser reels, tiktok o shorts.' }, { status: 400 });
    }

    const rawDuration = body?.target_duration_seconds;
    const targetDurationSeconds = rawDuration === undefined || rawDuration === null
        ? 30
        : (typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null);
    if (targetDurationSeconds === null) {
        return NextResponse.json({ error: 'La duracion objetivo debe ser un numero positivo.' }, { status: 400 });
    }

    // Unknown template names fall back to 'libre' rather than failing the whole
    // batch over one field, same as POST /api/videos.
    const template = getTemplate(body?.template).id;
    const conEscenas = body?.con_escenas === true;

    // Blank and repeated topics are not a mistake worth reporting back, so they
    // are dropped quietly instead of becoming an entry in `fallidos`.
    const seen = new Set<string>();
    const temas: string[] = [];
    for (const raw of rawTopics) {
        const tema = typeof raw === 'string' ? raw.trim() : '';
        if (!tema || seen.has(tema.toLowerCase())) continue;
        seen.add(tema.toLowerCase());
        temas.push(tema);
    }
    if (temas.length === 0) {
        return NextResponse.json({ error: 'Debes indicar al menos un tema.' }, { status: 400 });
    }

    const creados: VideoRecord[] = [];
    const fallidos: BatchFailure[] = [];

    // Sequential, not Promise.all: Groq's free tier is roughly 7000 tokens a
    // minute, and firing every script (plus every scene plan) at once trades a
    // useful partial result for a wall of rate-limit failures. Sequential also
    // means a failure partway through never costs the videos already created.
    for (const tema of temas) {
        try {
            const video = await createVideo(tema, platform, targetDurationSeconds, template);
            if (!conEscenas) {
                creados.push(video);
                continue;
            }
            try {
                creados.push(await planScenes(video.id));
            } catch (sceneError) {
                // The draft itself already saved with a real script; discarding it
                // because the optional scene step failed would throw away working
                // output over something the operator can retry from the panel.
                console.warn(`Fallo al generar escenas para "${tema}" dentro del lote.`, sceneError);
                creados.push(video);
            }
        } catch (error) {
            fallidos.push({ tema, error: error instanceof Error ? error.message : 'Error desconocido.' });
        }
    }

    return NextResponse.json({ creados, fallidos });
}
