import type { Scene, Video } from '@shared-types/video';
import { canTransition, transitions, videos as mockVideos } from '../app/api/videos/store';
import { getSupabaseClient } from './supabaseClient';
import { generateAiText } from './ai';

type VideoRecord = Video & { scenes: Scene[] };
type DatabaseRow = Record<string, unknown>;

function nullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

function toVideoRecord(video: DatabaseRow, scenes: DatabaseRow[] = []): VideoRecord {
    return {
        id: String(video.id),
        user_id: String(video.user_id ?? 'demo-user'),
        topic: String(video.topic ?? ''),
        source_url: nullableString(video.source_url),
        script: String(video.script ?? ''),
        video_url: nullableString(video.video_url),
        status: (video.status ?? 'borrador') as Video['status'],
        created_at: typeof video.created_at === 'string' ? video.created_at : new Date().toISOString(),
        scenes: (scenes ?? []).map((scene) => ({
            id: String(scene.id),
            video_id: String(scene.video_id),
            order: Number(scene.order ?? 1),
            description: String(scene.description ?? ''),
            image_url: nullableString(scene.image_url),
            audio_url: nullableString(scene.audio_url),
            duration_seconds: Number(scene.duration_seconds ?? 0),
        })).sort((a, b) => a.order - b.order),
    };
}

async function ensureDemoUser(): Promise<string | null> {
    const client = getSupabaseClient({ serviceRole: true });
    if (!client) return null;

    const demoEmail = 'demo@stickman.local';
    const { data: users, error: listError } = await client.auth.admin.listUsers();
    if (listError) {
        console.warn('No fue posible listar usuarios demo', listError.message);
        return null;
    }

    let user = users.users.find((entry) => entry.email === demoEmail);
    if (!user) {
        const demoPassword = process.env.DEMO_USER_PASSWORD;
        if (!demoPassword) {
            console.warn('DEMO_USER_PASSWORD no esta configurada; no se puede crear el usuario demo.');
            return null;
        }

        const { data: created, error: createError } = await client.auth.admin.createUser({
            email: demoEmail,
            password: demoPassword,
            email_confirm: true,
            user_metadata: { name: 'Demo user' },
        });

        if (createError || !created?.user) {
            console.warn('No fue posible crear usuario demo', createError?.message ?? 'unknown');
            return null;
        }
        user = created.user;
    }

    return user.id;
}

async function readFromSupabase(): Promise<VideoRecord[]> {
    const client = getSupabaseClient();
    if (!client) return Array.from(mockVideos.values());

    try {
        const { data: videosData, error: videosError } = await client.from('videos').select('*').order('created_at', { ascending: false });
        if (videosError) throw videosError;
        if (!videosData?.length) return [];

        const { data: scenesData, error: scenesError } = await client.from('scenes').select('*');
        if (scenesError) throw scenesError;

        return (videosData ?? []).map((video) => toVideoRecord(video, (scenesData ?? []).filter((scene) => scene.video_id === video.id)));
    } catch (error) {
        console.warn('Fallo al leer desde Supabase, usando fallback en memoria.', error);
        return Array.from(mockVideos.values());
    }
}

function buildContent(topic: string) {
    if (!/hipotec|credito|cr[eé]dito|cuota|vivienda/i.test(topic)) {
        return {
            script: `Soy tu Stickman Seller. Hoy te explico ${topic} de forma clara: compara opciones, revisa el costo total y elige una cuota que puedas sostener. Esta es una guia educativa; confirma las condiciones con una entidad autorizada.`,
            scenes: [`Stickman Seller presenta: ${topic}`, 'Stickman compara cuota, plazo y costo total entre dos opciones', 'Stickman recomienda revisar la oferta y tomar una decision informada'],
        };
    }

    return {
        script: 'Soy tu Stickman Seller. Si buscas un credito hipotecario, no mires solo la cuota mensual. Compara la tasa, el plazo, el monto financiado, los seguros y el costo total. Usa un simulador para probar distintos escenarios, verifica que la cuota sea compatible con tus ingresos y pide una oferta formal antes de decidir. Esta informacion es educativa y no reemplaza la asesoria financiera.',
        scenes: ['Stickman Seller presenta el simulador hipotecario y pregunta cuanto puedes pagar al mes', 'Stickman compara cuota, tasa, plazo, seguros y costo total', 'Stickman recomienda simular escenarios y confirmar la oferta con una entidad autorizada'],
    };
}

type GeneratedContent = { script: string; scenes: string[] };

async function generateContent(topic: string, sourceUrl: string | null): Promise<GeneratedContent> {
    const result = await generateAiText('Eres un guionista de videos breves de Stickman Seller. Crea contenido educativo, claro y responsable sobre finanzas. Devuelve solo JSON valido con las claves script (string) y scenes (array de exactamente 3 strings). No prometas aprobaciones ni hagas recomendaciones financieras personalizadas.', [{ role: 'user', content: `Tema: ${topic}\nPagina de referencia editorial: ${sourceUrl ?? 'ninguna'}\nCrea un guion de 15 segundos donde Stickman presenta el problema, compara opciones y cierra con una accion prudente.` }], 700);
    if (!result) return buildContent(topic);
    const rawContent = result.text;
    const parsed = JSON.parse(rawContent) as { script?: unknown; scenes?: unknown };
    if (typeof parsed.script !== 'string' || !Array.isArray(parsed.scenes) || parsed.scenes.length !== 3 || !parsed.scenes.every((scene) => typeof scene === 'string')) {
        throw new Error('El modelo devolvio un formato de escenas invalido.');
    }
    return { script: parsed.script, scenes: parsed.scenes };
}

async function createInSupabase(topic: string, sourceUrl: string | null): Promise<VideoRecord> {
    const content = await generateContent(topic, sourceUrl);
    const client = getSupabaseClient();
    if (!client) {
        const id = crypto.randomUUID();
        const video: Video = {
            id,
            user_id: 'demo-user',
            topic,
            source_url: sourceUrl,
            script: content.script,
            video_url: null,
            status: 'borrador',
            created_at: new Date().toISOString(),
        };
        const record: VideoRecord = {
            ...video, scenes: content.scenes.map((description, index) => ({ id: crypto.randomUUID(), video_id: id, order: index + 1, description, image_url: null, audio_url: null, duration_seconds: index === 1 ? 6 : 5 }))
        };
        mockVideos.set(id, record);
        return record;
    }

    const serviceClient = getSupabaseClient({ serviceRole: true });
    if (!serviceClient) {
        throw new Error('No hay servicio de Supabase configurado para crear el video.');
    }

    const userId = await ensureDemoUser();
    if (!userId) {
        throw new Error('No fue posible preparar el usuario demo para Supabase.');
    }

    const script = content.script;
    const { data: videoData, error: videoError } = await serviceClient.from('videos').insert({
        user_id: userId,
        topic,
        source_url: sourceUrl,
        script,
        status: 'borrador',
    }).select().single();

    if (videoError || !videoData) {
        throw videoError ?? new Error('No se pudo crear el video.');
    }

    const scenes = content.scenes.map((description, index) => ({ video_id: videoData.id, order: index + 1, description, image_url: null, audio_url: null, duration_seconds: index === 1 ? 6 : 5 }));

    const { data: scenesData, error: scenesError } = await serviceClient.from('scenes').insert(scenes).select();
    if (scenesError) {
        console.warn('Video creado, pero no fueron guardadas las escenas.', scenesError.message);
    }

    return toVideoRecord(videoData, scenesData ?? []);
}

async function patchInSupabase(id: string, action: string): Promise<VideoRecord> {
    const client = getSupabaseClient();
    if (!client) {
        const video = mockVideos.get(id);
        if (!video) throw new Error('Video no encontrado.');
        if (action === 'publish' && !video.video_url) throw new Error('Genera el video antes de publicarlo.');
        const nextStatus = transitions[action];
        if (!nextStatus || !canTransition(video.status, nextStatus)) {
            throw new Error(`Transicion no permitida desde ${video.status}.`);
        }
        const updated = { ...video, status: nextStatus };
        mockVideos.set(id, updated);
        return updated;
    }

    const { data: videoData, error: fetchError } = await client.from('videos').select('*').eq('id', id).single();
    if (fetchError || !videoData) {
        throw new Error('Video no encontrado.');
    }
    if (action === 'publish' && !videoData.video_url) throw new Error('Genera el video antes de publicarlo.');

    const nextStatus = transitions[action];
    if (!nextStatus || !canTransition(videoData.status, nextStatus)) {
        throw new Error(`Transicion no permitida desde ${videoData.status}.`);
    }

    const { data: updated, error: updateError } = await client.from('videos').update({ status: nextStatus }).eq('id', id).select('*').single();
    if (updateError || !updated) {
        throw updateError ?? new Error('No se pudo actualizar el estado.');
    }

    const { data: scenesData } = await client.from('scenes').select('*').eq('video_id', id);
    return toVideoRecord(updated, scenesData ?? []);
}

export async function listVideos() {
    return readFromSupabase();
}

export async function createVideo(topic: string, sourceUrl: string | null = null) {
    try {
        return await createInSupabase(topic, sourceUrl);
    } catch (error) {
        console.warn('Fallo en Supabase, usando fallback en memoria.', error);
        const id = crypto.randomUUID();
        const content = buildContent(topic);
        const video: Video = {
            id,
            user_id: 'demo-user',
            topic,
            source_url: sourceUrl,
            script: content.script,
            video_url: null,
            status: 'borrador',
            created_at: new Date().toISOString(),
        };
        const record: VideoRecord = {
            ...video, scenes: content.scenes.map((description, index) => ({ id: crypto.randomUUID(), video_id: id, order: index + 1, description, image_url: null, audio_url: null, duration_seconds: index === 1 ? 6 : 5 }))
        };
        mockVideos.set(id, record);
        return record;
    }
}

export async function updateVideoStatus(id: string, action: string) {
    try {
        return await patchInSupabase(id, action);
    } catch (error) {
        console.warn('Fallo al actualizar estado en Supabase, usando fallback en memoria.', error);
        const video = mockVideos.get(id);
        if (!video) throw new Error('Video no encontrado.');
        if (action === 'publish' && !video.video_url) throw new Error('Genera el video antes de publicarlo.');
        const nextStatus = transitions[action];
        if (!nextStatus || !canTransition(video.status, nextStatus)) {
            throw new Error(`Transicion no permitida desde ${video.status}.`);
        }
        const updated = { ...video, status: nextStatus };
        mockVideos.set(id, updated);
        return updated;
    }
}

export async function renderVideo(id: string) {
    const video = (await listVideos()).find((entry) => entry.id === id);
    if (!video) throw new Error('Video no encontrado.');
    if (video.status !== 'aprobado') throw new Error('Solo se pueden generar videos aprobados.');

    const configuredWorkerUrl = process.env.RENDER_WORKER_URL?.trim();
    if (!configuredWorkerUrl && process.env.NODE_ENV === 'production') {
        throw new Error('RENDER_WORKER_URL es obligatoria en produccion.');
    }
    const workerUrl = (configuredWorkerUrl || 'http://localhost:8080').replace(/\/+$/, '');
    const response = await fetch(`${workerUrl}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, scenes: video.scenes }),
    });
    const result = await response.json() as { filename?: unknown; url?: unknown; error?: unknown };
    if (!response.ok || typeof result.filename !== 'string') {
        throw new Error(typeof result.error === 'string' ? result.error : 'No se pudo generar el video.');
    }

    const videoUrl = typeof result.url === 'string'
        ? result.url
        : `${workerUrl}/renders/${encodeURIComponent(result.filename)}`;
    const databaseClient = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
    if (databaseClient) {
        const { data: updated, error } = await databaseClient.from('videos').update({ video_url: videoUrl }).eq('id', id).select('*').single();
        if (error || !updated) throw error ?? new Error('No se pudo guardar el video generado.');
        return { ...video, ...toVideoRecord(updated, video.scenes as unknown as DatabaseRow[]) };
    }

    const updated = { ...video, video_url: videoUrl };
    mockVideos.set(id, updated);
    return updated;
}
