import { NextResponse } from 'next/server';
import type { Platform } from '@shared-types/video';
import { duplicateForPlatform, getVideo } from '../../../../../lib/video-persistence';

type RouteContext = { params: Promise<{ id: string }> };

const PLATFORMS: Platform[] = ['reels', 'tiktok', 'shorts'];

export async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { platform?: unknown } | null;
    const rawPlatform = typeof body?.platform === 'string' ? body.platform : '';

    if (!(PLATFORMS as string[]).includes(rawPlatform)) {
        return NextResponse.json({ error: 'La plataforma debe ser reels, tiktok o shorts.' }, { status: 400 });
    }
    const platform = rawPlatform as Platform;

    const video = await getVideo(id);
    if (!video) {
        return NextResponse.json({ error: 'Video no encontrado.' }, { status: 404 });
    }

    try {
        const record = await duplicateForPlatform(id, platform);
        return NextResponse.json({ video: record }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        const status = message === 'Video no encontrado.' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
