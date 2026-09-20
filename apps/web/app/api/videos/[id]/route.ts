import { NextResponse } from 'next/server';
import { deleteVideo, renderVideo, updateScript, updateVideoStatus } from '../../../../lib/video-persistence';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { action?: unknown; script?: unknown } | null;

    // RF-008: manual script edit, identified by presence of `script` instead of `action`.
    if (typeof body?.script === 'string') {
        try {
            const updated = await updateScript(id, body.script);
            return NextResponse.json({ video: updated });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            const status = message === 'Video no encontrado.' ? 404 : 500;
            return NextResponse.json({ error: message }, { status });
        }
    }

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

export async function DELETE(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    try {
        await deleteVideo(id);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        const status = message === 'Video no encontrado.' ? 404 : 500;
        return NextResponse.json({ error: message }, { status });
    }
}
