import type { Branding, Platform, Scene, Video } from '@shared-types/video';
import { DEFAULT_BRANDING } from '@shared-types/video';
import { canTransition, transitions, videos as mockVideos } from '../app/api/videos/store';
import { getSupabaseClient } from './supabaseClient';
import { generateAiText } from './ai';

type VideoRecord = Video & { scenes: Scene[] };
type SceneInput = Omit<Scene, 'id' | 'video_id'>;
type DatabaseRow = Record<string, unknown>;

function nullableString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

function toBranding(value: unknown): Branding {
    if (!value || typeof value !== 'object') return { ...DEFAULT_BRANDING };
    const source = value as Record<string, unknown>;
    return {
        logo_url: nullableString(source.logo_url),
        logo_position: (typeof source.logo_position === 'string' ? source.logo_position : DEFAULT_BRANDING.logo_position) as Branding['logo_position'],
        primary_color: typeof source.primary_color === 'string' ? source.primary_color : DEFAULT_BRANDING.primary_color,
        secondary_color: typeof source.secondary_color === 'string' ? source.secondary_color : DEFAULT_BRANDING.secondary_color,
        font_family: typeof source.font_family === 'string' ? source.font_family : DEFAULT_BRANDING.font_family,
    };
}

function toScene(scene: DatabaseRow): Scene {
    return {
        id: String(scene.id),
        video_id: String(scene.video_id),
        order: Number(scene.order ?? 1),
        character: (scene.character ?? 'generico') as Scene['character'],
        action: (scene.action ?? 'hablar') as Scene['action'],
        prop: (scene.prop ?? 'ninguno') as Scene['prop'],
        description: String(scene.description ?? ''),
        duration_seconds: Number(scene.duration_seconds ?? 0),
        audio_url: nullableString(scene.audio_url),
    };
}

function toVideoRecord(video: DatabaseRow, scenes: DatabaseRow[] = []): VideoRecord {
    return {
        id: String(video.id),
        user_id: String(video.user_id ?? 'demo-user'),
        topic: String(video.topic ?? ''),
        platform: (video.platform ?? 'reels') as Video['platform'],
        target_duration_seconds: Number(video.target_duration_seconds ?? 30),
        script: String(video.script ?? ''),
        status: (video.status ?? 'borrador') as Video['status'],
        branding: toBranding(video.branding),
        video_url: nullableString(video.video_url),
        source_video_id: nullableString(video.source_video_id),
        created_at: typeof video.created_at === 'string' ? video.created_at : new Date().toISOString(),
        render_status: (video.render_status ?? 'inactivo') as Video['render_status'],
        render_progress: Number(video.render_progress ?? 0),
        render_error: nullableString(video.render_error),
        scenes: (scenes ?? []).map(toScene).sort((a, b) => a.order - b.order),
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
    // Reads use the service-role client too: this is an internal tool with a
    // single shared demo user and no per-request Supabase auth session, so the
    // "auth.uid() = user_id" RLS select policy would otherwise block every
    // read (0 rows, not an error) even though the rows genuinely exist -
    // access control for this app happens at the Next.js API route layer, not
    // via Supabase RLS.
    const client = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
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

async function findVideoRecord(id: string): Promise<VideoRecord | null> {
    const client = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
    if (client) {
        try {
            const { data: videoData, error: videoError } = await client.from('videos').select('*').eq('id', id).single();
            if (videoError || !videoData) throw videoError ?? new Error('Video no encontrado.');
            const { data: scenesData, error: scenesError } = await client.from('scenes').select('*').eq('video_id', id);
            if (scenesError) throw scenesError;
            return toVideoRecord(videoData, scenesData ?? []);
        } catch (error) {
            console.warn('Fallo al leer el video desde Supabase, usando fallback en memoria.', error);
        }
    }
    return mockVideos.get(id) ?? null;
}

// Used whenever the model is unavailable - which, with the API quota
// exhausted, is most of the time. It follows the same telenovela beats the
// prompt asks the model for, so the format is visible even without the LLM.
// Each sentence becomes one scene, so the line breaks here matter.
function buildFallbackScript(topic: string): string {
    const general = [
        `Llevo semanas dandole vueltas a ${topic} y no me decido.`,
        'Mi cuñado dice una cosa, el vecino dice otra, y yo cada dia entiendo menos.',
        'Entonces aparecio el asesor y me hizo una sola pregunta: ¿comparaste el costo total, o solo la cuota?',
        'Me quede helada. Solo habia mirado la cuota.',
        'Compara el costo total, revisa el plazo y pide siempre una oferta formal antes de firmar.',
        'Esta historia es educativa: confirma cada condicion con una entidad autorizada.',
    ];

    const mortgage = [
        'Encontramos la casa perfecta. Y entonces llego la carta del banco.',
        'La cuota parecia baja, pero nadie nos hablo de los seguros ni del plazo real.',
        'Llame al asesor casi llorando. Me dijo: tranquila, todavia no has firmado nada.',
        'Me explico que la cuota mensual no es el precio: el precio es el costo total.',
        'Comparamos tasa, plazo y seguros en un simulador, y salieron numeros muy distintos.',
        'Pedimos la oferta formal, la leimos entera, y esta vez firmamos sabiendo que firmabamos.',
        'Esta historia es educativa y no reemplaza la asesoria financiera.',
    ];

    return (/hipotec|credito|cr[eé]dito|cuota|vivienda|casa|banco/i.test(topic) ? mortgage : general).join(' ');
}

async function generateScript(topic: string): Promise<string> {
    // Telenovela structure on purpose: the client wants the "frutinovela" format
    // that works on TikTok - conflict, characters with a stake, a hook - rather
    // than the explainer tone this used to produce. The compliance limits are
    // unchanged; drama applies to the situation, never to the numbers.
    const result = await generateAiText(
        [
            'Eres guionista de mini-telenovelas verticales para redes, al estilo de las "frutinovelas" virales, aplicadas a marketing de credito hipotecario y vivienda.',
            'Escribe una historia corta con conflicto real entre personas: alguien quiere comprar o refinanciar, algo se interpone, y aparece quien lo aclara.',
            'Estructura: gancho en la primera linea, conflicto, giro, y cierre con una accion prudente. Tono de telenovela: emocional, con dialogo, un punto exagerado, nunca aburrido.',
            'Frases cortas, habladas, sin tecnicismos. Todo en español neutro.',
            'LIMITES QUE NO PUEDES CRUZAR: no prometas aprobaciones ni tasas concretas, no des recomendaciones financieras personalizadas, no inventes cifras ni nombres de entidades. El drama esta en la situacion de los personajes, jamas en los numeros.',
            'Devuelve solo el guion en texto plano, sin JSON, sin comillas envolventes y sin encabezados.',
        ].join('\n'),
        [{ role: 'user', content: `Tema: ${topic}\nEscribe la mini-telenovela.` }],
        500,
    );
    if (!result || !result.text.trim()) return buildFallbackScript(topic);
    return result.text.trim();
}

async function createInSupabase(topic: string, platform: Platform, targetDurationSeconds: number, script: string): Promise<VideoRecord> {
    const serviceClient = getSupabaseClient({ serviceRole: true });
    if (!serviceClient) {
        throw new Error('No hay servicio de Supabase configurado para crear el video.');
    }

    const userId = await ensureDemoUser();
    if (!userId) {
        throw new Error('No fue posible preparar el usuario demo para Supabase.');
    }

    const { data: videoData, error: videoError } = await serviceClient.from('videos').insert({
        user_id: userId,
        topic,
        platform,
        target_duration_seconds: targetDurationSeconds,
        script,
        status: 'borrador',
        branding: DEFAULT_BRANDING,
    }).select().single();

    if (videoError || !videoData) {
        throw videoError ?? new Error('No se pudo crear el video.');
    }

    return toVideoRecord(videoData, []);
}

function buildLocalVideoRecord(topic: string, platform: Platform, targetDurationSeconds: number, script: string): VideoRecord {
    const id = crypto.randomUUID();
    const video: Video = {
        id,
        user_id: 'demo-user',
        topic,
        platform,
        target_duration_seconds: targetDurationSeconds,
        script,
        status: 'borrador',
        branding: { ...DEFAULT_BRANDING },
        video_url: null,
        source_video_id: null,
        render_status: 'inactivo',
        render_progress: 0,
        render_error: null,
        created_at: new Date().toISOString(),
    };
    return { ...video, scenes: [] };
}

export async function listVideos(): Promise<VideoRecord[]> {
    return readFromSupabase();
}

export async function getVideo(id: string): Promise<VideoRecord | null> {
    return findVideoRecord(id);
}

export async function createVideo(topic: string, platform: Platform, targetDurationSeconds: number): Promise<VideoRecord> {
    const script = await generateScript(topic);

    try {
        return await createInSupabase(topic, platform, targetDurationSeconds, script);
    } catch (error) {
        console.warn('Fallo en Supabase, usando fallback en memoria.', error);
        const record = buildLocalVideoRecord(topic, platform, targetDurationSeconds, script);
        mockVideos.set(record.id, record);
        return record;
    }
}

export async function updateScript(id: string, script: string): Promise<VideoRecord> {
    const client = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
    if (client) {
        try {
            const { data: updated, error } = await client.from('videos').update({ script }).eq('id', id).select('*').single();
            if (error || !updated) throw error ?? new Error('No se pudo actualizar el guion.');
            const { data: scenesData } = await client.from('scenes').select('*').eq('video_id', id);
            return toVideoRecord(updated, scenesData ?? []);
        } catch (error) {
            console.warn('Fallo al actualizar el guion en Supabase, usando fallback en memoria.', error);
        }
    }

    const video = mockVideos.get(id);
    if (!video) throw new Error('Video no encontrado.');
    const updated = { ...video, script };
    mockVideos.set(id, updated);
    return updated;
}

export async function replaceScenes(id: string, scenes: SceneInput[]): Promise<VideoRecord> {
    const client = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
    if (client) {
        try {
            const { data: videoData, error: videoError } = await client.from('videos').select('*').eq('id', id).single();
            if (videoError || !videoData) throw videoError ?? new Error('Video no encontrado.');

            const { error: deleteError } = await client.from('scenes').delete().eq('video_id', id);
            if (deleteError) throw deleteError;

            if (scenes.length) {
                const rows = scenes.map((scene) => ({
                    video_id: id,
                    order: scene.order,
                    character: scene.character,
                    action: scene.action,
                    prop: scene.prop,
                    description: scene.description,
                    duration_seconds: scene.duration_seconds,
                    audio_url: scene.audio_url,
                }));
                const { error: insertError } = await client.from('scenes').insert(rows);
                if (insertError) throw insertError;
            }

            const { data: scenesData, error: scenesError } = await client.from('scenes').select('*').eq('video_id', id);
            if (scenesError) throw scenesError;
            return toVideoRecord(videoData, scenesData ?? []);
        } catch (error) {
            console.warn('Fallo al reemplazar escenas en Supabase, usando fallback en memoria.', error);
        }
    }

    const video = mockVideos.get(id);
    if (!video) throw new Error('Video no encontrado.');
    const newScenes: Scene[] = scenes.map((scene) => ({ ...scene, id: crypto.randomUUID(), video_id: id }));
    const updated = { ...video, scenes: newScenes };
    mockVideos.set(id, updated);
    return updated;
}

export async function updateScene(id: string, sceneId: string, patch: Partial<SceneInput>): Promise<VideoRecord> {
    const client = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
    if (client) {
        try {
            const { error: updateError } = await client.from('scenes').update(patch).eq('id', sceneId).eq('video_id', id);
            if (updateError) throw updateError;

            const { data: videoData, error: videoError } = await client.from('videos').select('*').eq('id', id).single();
            if (videoError || !videoData) throw videoError ?? new Error('Video no encontrado.');
            const { data: scenesData, error: scenesError } = await client.from('scenes').select('*').eq('video_id', id);
            if (scenesError) throw scenesError;
            return toVideoRecord(videoData, scenesData ?? []);
        } catch (error) {
            console.warn('Fallo al actualizar la escena en Supabase, usando fallback en memoria.', error);
        }
    }

    const video = mockVideos.get(id);
    if (!video) throw new Error('Video no encontrado.');
    const scenes = video.scenes.map((scene) => (scene.id === sceneId ? { ...scene, ...patch } : scene));
    const updated = { ...video, scenes };
    mockVideos.set(id, updated);
    return updated;
}

export async function updateBranding(id: string, branding: Partial<Branding>): Promise<VideoRecord> {
    const current = await findVideoRecord(id);
    if (!current) throw new Error('Video no encontrado.');
    const mergedBranding: Branding = { ...current.branding, ...branding };

    const client = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
    if (client) {
        try {
            const { data: updated, error } = await client.from('videos').update({ branding: mergedBranding }).eq('id', id).select('*').single();
            if (error || !updated) throw error ?? new Error('No se pudo actualizar el branding.');
            const { data: scenesData } = await client.from('scenes').select('*').eq('video_id', id);
            return toVideoRecord(updated, scenesData ?? []);
        } catch (error) {
            console.warn('Fallo al actualizar branding en Supabase, usando fallback en memoria.', error);
        }
    }

    const video = mockVideos.get(id);
    if (!video) throw new Error('Video no encontrado.');
    const updated = { ...video, branding: mergedBranding };
    mockVideos.set(id, updated);
    return updated;
}

export async function duplicateForPlatform(id: string, platform: Platform): Promise<VideoRecord> {
    const original = await findVideoRecord(id);
    if (!original) throw new Error('Video no encontrado.');

    const sceneInputs: SceneInput[] = original.scenes.map((scene) => ({
        order: scene.order,
        character: scene.character,
        action: scene.action,
        prop: scene.prop,
        description: scene.description,
        duration_seconds: scene.duration_seconds,
        audio_url: scene.audio_url,
    }));

    const client = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
    if (client) {
        try {
            const { data: videoData, error: videoError } = await client.from('videos').insert({
                user_id: original.user_id,
                topic: original.topic,
                platform,
                target_duration_seconds: original.target_duration_seconds,
                script: original.script,
                status: 'borrador',
                branding: original.branding,
                source_video_id: original.id,
            }).select().single();
            if (videoError || !videoData) throw videoError ?? new Error('No se pudo duplicar el video.');

            const newId = String(videoData.id);
            if (sceneInputs.length) {
                const rows = sceneInputs.map((scene) => ({
                    video_id: newId,
                    order: scene.order,
                    character: scene.character,
                    action: scene.action,
                    prop: scene.prop,
                    description: scene.description,
                    duration_seconds: scene.duration_seconds,
                    audio_url: scene.audio_url,
                }));
                const { error: insertError } = await client.from('scenes').insert(rows);
                if (insertError) throw insertError;
            }

            const { data: scenesData, error: scenesError } = await client.from('scenes').select('*').eq('video_id', newId);
            if (scenesError) throw scenesError;
            return toVideoRecord(videoData, scenesData ?? []);
        } catch (error) {
            console.warn('Fallo al duplicar el video en Supabase, usando fallback en memoria.', error);
        }
    }

    const newId = crypto.randomUUID();
    const video: Video = {
        id: newId,
        user_id: original.user_id,
        topic: original.topic,
        platform,
        target_duration_seconds: original.target_duration_seconds,
        script: original.script,
        status: 'borrador',
        branding: { ...original.branding },
        video_url: null,
        source_video_id: original.id,
        render_status: 'inactivo',
        render_progress: 0,
        render_error: null,
        created_at: new Date().toISOString(),
    };
    const record: VideoRecord = {
        ...video,
        scenes: sceneInputs.map((scene) => ({ ...scene, id: crypto.randomUUID(), video_id: newId })),
    };
    mockVideos.set(newId, record);
    return record;
}

async function patchInSupabase(id: string, action: string): Promise<VideoRecord> {
    const client = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
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

export async function updateVideoStatus(id: string, action: string): Promise<VideoRecord> {
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

export async function deleteVideo(id: string): Promise<void> {
    const video = await findVideoRecord(id);
    if (!video) throw new Error('Video no encontrado.');

    const client = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
    if (client) {
        try {
            // Scenes first: they reference the video, and deleting the parent
            // while children exist fails unless the foreign key cascades.
            const { error: scenesError } = await client.from('scenes').delete().eq('video_id', id);
            if (scenesError) throw scenesError;
            const { error } = await client.from('videos').delete().eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.warn('Fallo al eliminar el video en Supabase, usando fallback en memoria.', error);
        }
    }

    mockVideos.delete(id);
}

export async function renderVideo(id: string): Promise<VideoRecord> {
    const video = await findVideoRecord(id);
    if (!video) throw new Error('Video no encontrado.');
    if (video.status !== 'aprobado') throw new Error('Solo se pueden generar videos aprobados.');

    const configuredWorkerUrl = process.env.RENDER_WORKER_URL?.trim();
    if (!configuredWorkerUrl && process.env.NODE_ENV === 'production') {
        throw new Error('RENDER_WORKER_URL es obligatoria en produccion.');
    }
    const workerUrl = (configuredWorkerUrl || 'http://localhost:8080').replace(/\/+$/, '');
    const sortedScenes = [...video.scenes].sort((a, b) => a.order - b.order);

    // The worker answers 202 as soon as it has accepted the job and then
    // reports progress on the video row, so this only has to confirm the job
    // was queued. A render can run for minutes once scenes come from an AI
    // model - far longer than this request may stay open.
    const response = await fetch(`${workerUrl}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id,
            platform: video.platform,
            branding: video.branding,
            scenes: sortedScenes.map((scene) => ({
                order: scene.order,
                character: scene.character,
                action: scene.action,
                prop: scene.prop,
                description: scene.description,
                duration_seconds: scene.duration_seconds,
                audio_url: scene.audio_url,
            })),
        }),
    });

    if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: unknown };
        throw new Error(typeof result.error === 'string' ? result.error : 'No se pudo encolar la generacion del video.');
    }

    const queued = {
        render_status: 'procesando' as const,
        render_progress: 0,
        render_error: null,
    };

    const databaseClient = getSupabaseClient({ serviceRole: true }) ?? getSupabaseClient();
    if (databaseClient) {
        try {
            const { data: updated, error } = await databaseClient.from('videos').update(queued).eq('id', id).select('*').single();
            if (error || !updated) throw error ?? new Error('No se pudo marcar el video como en proceso.');
            return toVideoRecord(updated, video.scenes as unknown as DatabaseRow[]);
        } catch (error) {
            console.warn('Fallo al marcar el render como en proceso en Supabase, usando fallback en memoria.', error);
        }
    }

    const updated = { ...video, ...queued };
    mockVideos.set(id, updated);
    return updated;
}
