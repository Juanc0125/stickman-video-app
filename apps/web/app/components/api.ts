// Thin fetch wrappers around the video-studio backend API. Every function throws a plain
// Error with a Spanish message (taken from the API's own `{ error }` body when available) so
// callers can show it directly to the user.

import type { BrandTemplate, VideoTemplate } from '@shared-types/templates';
import type {
    CharacterType,
    LogoPosition,
    Platform,
    Scene,
    SceneAction,
    ScenePropType,
    Video,
} from '@shared-types/video';

export type VideoRecord = Video & { scenes: Scene[] };

async function parseJsonSafe(response: Response): Promise<unknown> {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

// The middleware answers every /api/** call with 401 once the session cookie
// is gone (expired, or signed out in another tab). Login itself can also
// answer 401 for a wrong password - that one must NOT bounce the browser,
// since the person is already on /login and needs to see the message.
interface RequestOptions extends RequestInit {
    skipAuthRedirect?: boolean;
}

function redirectToLogin(): void {
    if (typeof window === 'undefined') return;
    if (window.location.pathname === '/login') return;
    window.location.href = '/login';
}

async function request<T>(input: string, init?: RequestOptions): Promise<T> {
    const { skipAuthRedirect, ...requestInit } = init ?? {};
    const response = await fetch(input, requestInit);
    if (response.status === 401 && !skipAuthRedirect) {
        redirectToLogin();
        throw new Error('La sesión expiró. Inicia sesión de nuevo.');
    }
    const data = await parseJsonSafe(response);
    if (!response.ok) {
        const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
        const message = record && typeof record.error === 'string' ? record.error : 'Ocurrió un error inesperado.';
        throw new Error(message);
    }
    return data as T;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// The three auth endpoints, kept here so every call to the server - including
// these - goes through the one `request()` chokepoint above.
export async function login(email: string, password: string): Promise<void> {
    await request<unknown>('/api/auth/login', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ email, password }),
        skipAuthRedirect: true,
    });
}

export async function logout(): Promise<void> {
    await request<unknown>('/api/auth/logout', { method: 'POST', skipAuthRedirect: true });
}

export async function fetchSession(): Promise<{ email: string | null }> {
    return request<{ email: string | null }>('/api/auth/session', { skipAuthRedirect: true });
}

export async function fetchVideos(): Promise<VideoRecord[]> {
    const data = await request<{ videos: VideoRecord[] }>('/api/videos');
    return data.videos;
}

export async function createVideo(
    topic: string,
    platform: Platform,
    targetDurationSeconds: number,
    template: VideoTemplate = 'libre',
): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>('/api/videos', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ topic, platform, targetDurationSeconds, template }),
    });
    return data.video;
}

export interface BatchCreateFailure {
    tema: string;
    error: string;
}

// A warning names a video that IS in `creados` but came out degraded - a
// hardcoded generic script because no model answered, or no scenes. This is
// distinct from `fallidos`: the video exists and is in the list, it just
// isn't what the operator asked for yet.
// `causa` is the machine-readable half and `motivo` the sentence a person
// reads. Both come from the server: deducing the cause by matching words in
// the prose breaks silently the day that prose is reworded.
export type BatchWarningCause = 'guion_generico' | 'sin_escenas' | 'guion_generico_y_sin_escenas';

export interface BatchCreateWarning {
    tema: string;
    causa: BatchWarningCause;
    motivo: string;
}

export interface BatchCreateResult {
    creados: VideoRecord[];
    fallidos: BatchCreateFailure[];
    advertencias: BatchCreateWarning[];
}

// RF-024: several videos from several topics in one call. The server runs
// them sequentially - each is at least one model call - and a partial
// failure is a 200 with both arrays populated, not a thrown error.
export async function createVideosBatch(
    temas: string[],
    platform: Platform,
    targetDurationSeconds: number,
    template: VideoTemplate,
    conEscenas: boolean,
): Promise<BatchCreateResult> {
    return request<BatchCreateResult>('/api/videos/batch', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
            temas,
            platform,
            target_duration_seconds: targetDurationSeconds,
            template,
            con_escenas: conEscenas,
        }),
    });
}

export async function saveScript(id: string, script: string): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ script }),
    });
    return data.video;
}

export type StatusAction = 'submit' | 'approve' | 'reject' | 'publish' | 'render';

export async function transitionStatus(id: string, action: StatusAction): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ action }),
    });
    return data.video;
}

export async function generateScenes(id: string): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}/scenes`, { method: 'POST' });
    return data.video;
}

export async function regenerateScene(id: string, sceneId: string): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ regenerate: true }),
    });
    return data.video;
}

export interface ScenePatch {
    character?: CharacterType;
    action?: SceneAction;
    prop?: ScenePropType;
    description?: string;
    duration_seconds?: number;
}

export async function updateScene(id: string, sceneId: string, patch: ScenePatch): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(patch),
    });
    return data.video;
}

export async function generateVoice(id: string): Promise<{ video: VideoRecord; ttsConfigured: boolean }> {
    return request<{ video: VideoRecord; ttsConfigured: boolean }>(`/api/videos/${id}/tts`, { method: 'POST' });
}

export interface BrandingPatch {
    logo_position?: LogoPosition;
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
}

export async function updateBranding(id: string, patch: BrandingPatch): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}/branding`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(patch),
    });
    return data.video;
}

export async function uploadLogo(id: string, dataUrl: string): Promise<{ video: VideoRecord; logoUrl: string }> {
    return request<{ video: VideoRecord; logoUrl: string }>(`/api/videos/${id}/logo`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ dataUrl }),
    });
}

export async function fetchBrandTemplates(): Promise<BrandTemplate[]> {
    const data = await request<{ templates: BrandTemplate[] }>('/api/brand-templates');
    return data.templates;
}

export async function saveBrandTemplate(name: string, videoId: string): Promise<BrandTemplate> {
    const data = await request<{ template: BrandTemplate }>('/api/brand-templates', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ name, video_id: videoId }),
    });
    return data.template;
}

export async function applyBrandTemplate(id: string, templateId: string): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}/brand-template`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ template_id: templateId }),
    });
    return data.video;
}

export async function deleteBrandTemplate(templateId: string): Promise<void> {
    await request<unknown>(`/api/brand-templates/${templateId}`, { method: 'DELETE' });
}

export async function duplicateVideo(id: string, platform: Platform): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}/duplicate`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ platform }),
    });
    return data.video;
}

export async function deleteVideo(id: string): Promise<void> {
    await request<unknown>(`/api/videos/${id}`, { method: 'DELETE' });
}

export async function deleteScene(id: string, sceneId: string): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}/scenes/${sceneId}`, { method: 'DELETE' });
    return data.video;
}
