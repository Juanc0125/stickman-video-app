// Thin fetch wrappers around the video-studio backend API. Every function throws a plain
// Error with a Spanish message (taken from the API's own `{ error }` body when available) so
// callers can show it directly to the user.

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

async function request<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await fetch(input, init);
    const data = await parseJsonSafe(response);
    if (!response.ok) {
        const record = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
        const message = record && typeof record.error === 'string' ? record.error : 'Ocurrió un error inesperado.';
        throw new Error(message);
    }
    return data as T;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function fetchVideos(): Promise<VideoRecord[]> {
    const data = await request<{ videos: VideoRecord[] }>('/api/videos');
    return data.videos;
}

export async function createVideo(topic: string, platform: Platform, targetDurationSeconds: number): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>('/api/videos', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ topic, platform, targetDurationSeconds }),
    });
    return data.video;
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

export async function duplicateVideo(id: string, platform: Platform): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}/duplicate`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ platform }),
    });
    return data.video;
}

export async function deleteVideo(id: string): Promise<void> {
    const response = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? 'No se pudo eliminar el video.');
    }
}

export async function deleteScene(id: string, sceneId: string): Promise<VideoRecord> {
    const data = await request<{ video: VideoRecord }>(`/api/videos/${id}/scenes/${sceneId}`, { method: 'DELETE' });
    return data.video;
}
