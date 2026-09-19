import { NextResponse } from 'next/server';
import { getVideo, updateScene } from '../../../../../lib/video-persistence';
import { synthesizeSpeech } from '../../../../../lib/tts';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
    const { id } = await context.params;

    const video = await getVideo(id);
    if (!video) {
        return NextResponse.json({ error: 'Video no encontrado.' }, { status: 404 });
    }

    for (const scene of video.scenes) {
        const result = await synthesizeSpeech(scene.description);
        if (result) {
            await updateScene(video.id, scene.id, {
                audio_url: result.audioUrl,
                duration_seconds: result.durationSeconds,
            });
        }
    }

    const finalRecord = await getVideo(id);
    const ttsConfigured = Boolean(process.env.TTS_API_URL && process.env.TTS_API_KEY);

    return NextResponse.json({ video: finalRecord, ttsConfigured }, { status: 200 });
}
