import { NextResponse } from 'next/server';
import { ACCEPTED_SOUND_TYPES, MAX_SOUND_BYTES, SoundStorageUnavailableError, createSoundUploadUrl } from '../../../../lib/sounds';

type UploadUrlBody = {
    filename?: unknown;
    content_type?: unknown;
    size?: unknown;
};

// The file itself never passes through here: Vercel cuts request bodies above
// 4.5 MB, so the browser uploads straight to Supabase Storage with a signed
// URL. This only checks what the browser says it is about to send; the bucket
// enforces the size limit on the real bytes.
export async function POST(request: Request) {
    const body = await request.json().catch(() => null) as UploadUrlBody | null;
    if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'El cuerpo de la solicitud es invalido.' }, { status: 400 });
    }

    const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
    if (!filename) {
        return NextResponse.json({ error: 'El nombre del archivo es obligatorio.' }, { status: 400 });
    }

    // Some browsers append parameters (audio/webm;codecs=opus); the type alone decides.
    const contentType = typeof body.content_type === 'string' ? body.content_type.split(';')[0].trim().toLowerCase() : '';
    if (!(contentType in ACCEPTED_SOUND_TYPES)) {
        return NextResponse.json({ error: 'Formato de audio no admitido. Usa MP3, WAV, OGG, M4A, AAC o WEBM.' }, { status: 400 });
    }

    const size = body.size;
    if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
        return NextResponse.json({ error: 'El tamaño del archivo no es valido.' }, { status: 400 });
    }
    if (size > MAX_SOUND_BYTES) {
        return NextResponse.json({ error: 'El audio no puede superar 20 MB.' }, { status: 400 });
    }

    try {
        const upload = await createSoundUploadUrl(filename, contentType);
        return NextResponse.json(upload);
    } catch (error) {
        if (error instanceof SoundStorageUnavailableError) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        console.error('Error al preparar la subida del sonido', error);
        return NextResponse.json({ error: 'No se pudo preparar la subida del audio.' }, { status: 500 });
    }
}
