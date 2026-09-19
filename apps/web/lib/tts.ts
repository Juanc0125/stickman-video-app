import { getSupabaseClient } from './supabaseClient';

const TTS_BUCKET = 'tts-audio';

/**
 * This assumes a generic REST TTS API that returns raw audio bytes for a
 * POST { text }. Swap the request/response handling here to match whichever
 * real TTS vendor (ElevenLabs, Azure, Google, etc.) is chosen later — this
 * is the one function that needs to change (RNF-004).
 */
export async function synthesizeSpeech(text: string): Promise<{ audioUrl: string; durationSeconds: number } | null> {
    const apiUrl = process.env.TTS_API_URL;
    const apiKey = process.env.TTS_API_KEY;
    if (!apiUrl || !apiKey) return null;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ text }),
            signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) return null;

        const audioBuffer = Buffer.from(await response.arrayBuffer());

        const client = getSupabaseClient({ serviceRole: true });
        if (!client) return null;

        const { data: buckets, error: listBucketsError } = await client.storage.listBuckets();
        if (listBucketsError) throw listBucketsError;

        const bucketExists = (buckets ?? []).some((bucket) => bucket.name === TTS_BUCKET);
        if (!bucketExists) {
            const { error: createBucketError } = await client.storage.createBucket(TTS_BUCKET, { public: true });
            if (createBucketError) throw createBucketError;
        }

        const filename = `${crypto.randomUUID()}.mp3`;
        const { error: uploadError } = await client.storage.from(TTS_BUCKET).upload(filename, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
        });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = client.storage.from(TTS_BUCKET).getPublicUrl(filename);

        // Estimate the narration length from the text instead of decoding the
        // actual audio bytes — decoding real duration without an audio-parsing
        // library is non-trivial for V1. Assumes ~150 spoken words per minute.
        // A real implementation would probe the actual audio duration (e.g. via
        // ffprobe) once a concrete TTS vendor is chosen (RNF-004).
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        const durationSeconds = Math.max(2, (wordCount / 150) * 60);

        return { audioUrl: publicUrlData.publicUrl, durationSeconds };
    } catch (error) {
        console.warn('Fallo la sintesis de voz (TTS); se omite el audio para esta escena.', error);
        return null;
    }
}
