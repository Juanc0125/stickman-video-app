import { NextResponse } from 'next/server';

// The assistant's voice, from HeyGen, when it is configured: the same voice
// the videos use (HEYGEN_VOICE_ID), so the studio and its videos sound like
// one person. Billed per request against HeyGen's API wallet, which is why
// proxy.ts keeps this route behind a session.
//
// It never fails the conversation: anything short of a playable audio URL -
// no key, no balance (402), a timeout - answers 204, and the browser speaks
// the reply with its own built-in voice instead.
const API_KEY = process.env.HEYGEN_API_KEY?.trim();
const VOICE_ID = process.env.HEYGEN_VOICE_ID?.trim();
// A spoken reply is a sentence or three; the cap keeps one request from
// costing like a script read-out.
const MAX_CHARS = 600;

function silent() {
    return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
    if (!API_KEY || !VOICE_ID) return silent();

    const body = await request.json().catch(() => null) as { text?: unknown } | null;
    const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_CHARS) : '';
    if (!text) return silent();

    try {
        const response = await fetch('https://api.heygen.com/v3/voices/speech', {
            method: 'POST',
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ text, voice_id: VOICE_ID, speed: 1.05 }),
            signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            console.warn(`HeyGen TTS respondio ${response.status}; el navegador hablara con su voz. ${detail.slice(0, 200)}`);
            return silent();
        }
        const data = (await response.json() as { data?: { audio_url?: unknown; word_timestamps?: unknown } }).data;
        if (typeof data?.audio_url !== 'string') return silent();

        // Word starts in seconds, so the assistant's figure can pulse on each
        // word the way it does with the browser voice's boundary events.
        const words = Array.isArray(data.word_timestamps)
            ? data.word_timestamps
                .map((entry) => Number((entry as { start?: unknown }).start))
                .filter((start) => Number.isFinite(start) && start >= 0)
            : [];
        return NextResponse.json({ audio_url: data.audio_url, word_starts: words });
    } catch (error) {
        console.warn('Fallo HeyGen TTS; el navegador hablara con su voz.', error);
        return silent();
    }
}
