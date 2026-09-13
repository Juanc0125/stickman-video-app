import { NextResponse } from 'next/server';
import { renderVideo, updateVideoStatus } from '../../../../lib/video-persistence';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { action?: unknown } | null;
    const action = typeof body?.action === 'string' ? body.action : '';

    if (!action) {
        return NextResponse.json({ error: 'La accion es obligatoria.' }, { status: 400 });
    }

    try {
        if (action === 'render') {
            const video = await renderVideo(id);
            return NextResponse.json({ video });
        }
        const updated = await updateVideoStatus(id, action);
        return NextResponse.json({ video: updated });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        const status = message === 'Video no encontrado.' ? 404 : 409;
        return NextResponse.json({ error: message }, { status });
    }
}