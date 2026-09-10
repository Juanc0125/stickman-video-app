import { NextResponse } from 'next/server';
import type { Scene, Video } from '@shared-types/video';
import { videos } from './store';

export async function GET() {
    return NextResponse.json({ videos: Array.from(videos.values()) });
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => null) as { topic?: unknown } | null;
    const topic = typeof body?.topic === 'string' ? body.topic.trim() : '';

    if (!topic) return NextResponse.json({ error: 'El tema es obligatorio.' }, { status: 400 });

    const id = crypto.randomUUID();
    const video: Video = {
        id,
        user_id: 'demo-user',
        topic,
        script: `Guion preliminar sobre ${topic}. Este texto simula la respuesta del LLM.`,
        video_url: null,
        status: 'borrador',
        created_at: new Date().toISOString(),
    };
    const scenes: Scene[] = [
        { id: crypto.randomUUID(), video_id: id, order: 1, description: `Introduccion a ${topic}`, image_url: null, audio_url: null, duration_seconds: 4 },
        { id: crypto.randomUUID(), video_id: id, order: 2, description: 'Idea financiera principal', image_url: null, audio_url: null, duration_seconds: 5 },
        { id: crypto.randomUUID(), video_id: id, order: 3, description: 'Cierre con llamada a la accion', image_url: null, audio_url: null, duration_seconds: 4 },
    ];

    const record = { ...video, scenes };
    videos.set(id, record);
    return NextResponse.json({ video: record }, { status: 201 });
}