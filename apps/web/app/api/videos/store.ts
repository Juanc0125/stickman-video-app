import type { Scene, Video, VideoStatus } from '@shared-types/video';

export type VideoRecord = Video & { scenes: Scene[] };

const globalStore = globalThis as typeof globalThis & {
    __stickmanVideos?: Map<string, VideoRecord>;
};

export const videos = globalStore.__stickmanVideos ??= new Map<string, VideoRecord>();

export const transitions: Record<string, VideoStatus> = {
    submit: 'pendiente_aprobacion',
    approve: 'aprobado',
    publish: 'publicado',
    reject: 'borrador',
};

export function canTransition(current: VideoStatus, next: VideoStatus): boolean {
    if (current === 'borrador' && next === 'pendiente_aprobacion') return true;
    if (current === 'pendiente_aprobacion' && next === 'aprobado') return true;
    if (current === 'pendiente_aprobacion' && next === 'borrador') return true;
    return current === 'aprobado' && next === 'publicado';
}