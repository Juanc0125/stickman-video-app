import { NextResponse } from 'next/server';
import { getVideo, updateBranding } from '../../../../../lib/video-persistence';
import { getSupabaseClient } from '../../../../../lib/supabaseClient';

type RouteContext = { params: Promise<{ id: string }> };

const BUCKET_NAME = 'branding-logos';
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB
const DATA_URL_PATTERN = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/;

const MIME_EXTENSIONS: Record<string, string> = {
    png: 'png',
    jpeg: 'jpg',
    jpg: 'jpg',
    webp: 'webp',
    'svg+xml': 'svg',
};

const MIME_CONTENT_TYPES: Record<string, string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    webp: 'image/webp',
    'svg+xml': 'image/svg+xml',
};

export async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params;
    const body = await request.json().catch(() => null) as { dataUrl?: unknown } | null;
    const dataUrl = typeof body?.dataUrl === 'string' ? body.dataUrl : '';

    const match = dataUrl.match(DATA_URL_PATTERN);
    if (!match) {
        return NextResponse.json(
            { error: 'El logo debe enviarse como una URL de datos base64 (data:image/png|jpeg|jpg|webp|svg+xml;base64,...).' },
            { status: 400 },
        );
    }

    const mimeSubtype = match[1];
    const base64Payload = dataUrl.slice(match[0].length);
    const buffer = Buffer.from(base64Payload, 'base64');

    if (buffer.byteLength > MAX_LOGO_BYTES) {
        return NextResponse.json({ error: 'El logo no puede superar 2MB.' }, { status: 400 });
    }

    const video = await getVideo(id);
    if (!video) {
        return NextResponse.json({ error: 'Video no encontrado.' }, { status: 404 });
    }

    const serviceClient = getSupabaseClient({ serviceRole: true });
    if (!serviceClient) {
        return NextResponse.json(
            { error: 'La carga de logos requiere que Supabase Storage este configurado.' },
            { status: 500 },
        );
    }

    try {
        const { data: buckets, error: listBucketsError } = await serviceClient.storage.listBuckets();
        if (listBucketsError) throw listBucketsError;

        const bucketExists = (buckets ?? []).some((bucket) => bucket.name === BUCKET_NAME);
        if (!bucketExists) {
            const { error: createBucketError } = await serviceClient.storage.createBucket(BUCKET_NAME, { public: true });
            if (createBucketError) throw createBucketError;
        }

        const extension = MIME_EXTENSIONS[mimeSubtype] ?? 'png';
        const contentType = MIME_CONTENT_TYPES[mimeSubtype] ?? 'image/png';
        const filename = `${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await serviceClient.storage.from(BUCKET_NAME).upload(filename, buffer, {
            contentType,
            upsert: true,
        });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = serviceClient.storage.from(BUCKET_NAME).getPublicUrl(filename);
        const logoUrl = publicUrlData?.publicUrl;
        if (!logoUrl) throw new Error('No se obtuvo una URL publica del logo.');

        const updated = await updateBranding(id, { logo_url: logoUrl });
        return NextResponse.json({ video: updated, logoUrl }, { status: 201 });
    } catch (error) {
        console.error('Error al subir el logo', error);
        const message = error instanceof Error ? error.message : 'Error desconocido';
        const status = message === 'Video no encontrado.' ? 404 : 500;
        return NextResponse.json(
            { error: status === 404 ? message : 'No se pudo subir el logo.' },
            { status },
        );
    }
}
