import { NextResponse } from 'next/server';
import { createVideo, listVideos } from '../../../lib/video-persistence';

export async function GET() {
    const videos = await listVideos();
    return NextResponse.json({ videos });
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => null) as { topic?: unknown; referenceUrl?: unknown } | null;
    const topic = typeof body?.topic === 'string' ? body.topic.trim() : '';
    const referenceUrl = typeof body?.referenceUrl === 'string' ? body.referenceUrl.trim() : '';

    if (!topic) return NextResponse.json({ error: 'El tema es obligatorio.' }, { status: 400 });

    try {
        const record = await createVideo(topic, referenceUrl || null);
        return NextResponse.json({ video: record }, { status: 201 });
    } catch (error) {
        console.error('Error al crear video', error);
        return NextResponse.json({ error: 'No se pudo crear el video.' }, { status: 500 });
    }
}