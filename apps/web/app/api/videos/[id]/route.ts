import { NextResponse } from 'next/server';
import { canTransition, transitions, videos } from '../store';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const video = videos.get(id);
    const body = await request.json().catch(() => null) as { action?: unknown } | null;
    const action = typeof body?.action === 'string' ? body.action : '';
    const nextStatus = transitions[action];

    if (!video) return NextResponse.json({ error: 'Video no encontrado.' }, { status: 404 });
    if (!nextStatus || !canTransition(video.status, nextStatus)) {
        return NextResponse.json({ error: `Transicion no permitida desde ${video.status}.` }, { status: 409 });
    }

    const updated = { ...video, status: nextStatus };
    videos.set(id, updated);
    return NextResponse.json({ video: updated });
}