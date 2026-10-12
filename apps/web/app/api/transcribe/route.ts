import { NextResponse } from 'next/server';

// Dictation for browsers without the Web Speech API (Firefox, Brave, some
// Safari setups): the assistant records the phrase itself and sends the audio
// here, and Groq's Whisper turns it into text. Same free Groq key the copilot
// already uses; no new provider, no new bill.
//
// Open like the rest of the studio (proxy.ts). The size cap keeps one request
// to a spoken phrase - the assistant stops recording after 30 s anyway - and
// under Vercel's 4.5 MB body limit.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const STT_URL = process.env.GROQ_STT_URL ?? 'https://api.groq.com/openai/v1/audio/transcriptions';
const STT_MODEL = process.env.GROQ_STT_MODEL ?? 'whisper-large-v3-turbo';

const EXTENSIONS: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
};

export async function POST(request: Request) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'El dictado no esta configurado en el servidor. Escribeme mientras tanto.' }, { status: 503 });
    }

    // "audio/webm;codecs=opus" -> "audio/webm"
    const contentType = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const extension = EXTENSIONS[contentType];
    if (!extension) {
        return NextResponse.json({ error: 'Formato de audio no soportado.' }, { status: 400 });
    }

    const audio = await request.arrayBuffer();
    if (audio.byteLength === 0) {
        return NextResponse.json({ text: '' });
    }
    if (audio.byteLength > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: 'El audio es demasiado largo. Habla en frases mas cortas.' }, { status: 413 });
    }

    const form = new FormData();
    form.append('file', new Blob([audio], { type: contentType }), `dictado.${extension}`);
    form.append('model', STT_MODEL);
    // The language is pinned, not detected: short clips of Spanish get
    // misdetected often enough to come back translated or garbled.
    form.append('language', 'es');
    form.append('response_format', 'json');
    form.append('temperature', '0');

    try {
        const response = await fetch(STT_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            console.error(`Groq STT respondio ${response.status}: ${detail.slice(0, 300)}`);
            return NextResponse.json({ error: 'No pude entender el audio. Intenta de nuevo o escribeme.' }, { status: 502 });
        }
        const data = await response.json() as { text?: unknown };
        return NextResponse.json({ text: typeof data.text === 'string' ? data.text.trim() : '' });
    } catch (error) {
        console.error('Fallo la transcripcion.', error);
        return NextResponse.json({ error: 'No pude entender el audio. Intenta de nuevo o escribeme.' }, { status: 502 });
    }
}
