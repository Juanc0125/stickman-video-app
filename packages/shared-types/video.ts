export type VideoStatus =
    | 'borrador'
    | 'pendiente_aprobacion'
    | 'aprobado'
    | 'publicado';

export interface Video {
    id: string;
    user_id: string;
    topic: string;
    script: string;
    video_url: string | null;
    status: VideoStatus;
    created_at: string;
}

export interface Scene {
    id: string;
    video_id: string;
    order: number;
    description: string;
    image_url: string | null;
    audio_url: string | null;
    duration_seconds: number;
}
