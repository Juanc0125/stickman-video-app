import { NextResponse } from 'next/server';
import { interpret, type AssistantContext } from '../../../lib/assistant';

export async function POST(request: Request) {
    const body = await request.json().catch(() => null) as { message?: unknown; context?: unknown } | null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
        return NextResponse.json({ error: 'El mensaje es obligatorio.' }, { status: 400 });
    }

    // The browser sends a small summary of what is on screen rather than the
    // whole video list: the assistant only needs to know how much exists and
    // what is open, and the payload stays small enough to send on every turn.
    const raw = (body?.context ?? {}) as Record<string, unknown>;
    const context: AssistantContext = {
        total: Number(raw.total ?? 0),
        porEstado: (raw.porEstado ?? {}) as Record<string, number>,
        seleccionado: (raw.seleccionado ?? null) as AssistantContext['seleccionado'],
    };

    try {
        const result = await interpret(message, context);
        return NextResponse.json(result);
    } catch (error) {
        console.warn('Fallo el asistente.', error);
        return NextResponse.json({ error: 'El asistente no pudo responder.' }, { status: 500 });
    }
}
