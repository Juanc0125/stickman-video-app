export type VideoStatus = 'borrador' | 'pendiente_aprobacion' | 'aprobado' | 'publicado';
export type Platform = 'reels' | 'tiktok' | 'shorts';
export type CharacterType = 'broker' | 'cliente' | 'pareja' | 'hombre' | 'mujer' | 'generico';
export type SceneAction = 'hablar' | 'caminar' | 'senalar' | 'sentarse' | 'pensar' | 'telefono' | 'mostrar_objeto';
export type ScenePropType = 'ninguno' | 'casa' | 'carro' | 'banco' | 'telefono' | 'documento' | 'dinero' | 'grafico' | 'oficina';
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface Branding {
    logo_url: string | null;
    logo_position: LogoPosition;
    primary_color: string;   // hex, e.g. "#17202a"
    secondary_color: string; // hex, e.g. "#ffffff"
    font_family: string;     // e.g. "Arial"
}

export const DEFAULT_BRANDING: Branding = {
    logo_url: null,
    logo_position: 'top-right',
    primary_color: '#17202a',
    secondary_color: '#ffffff',
    font_family: 'Arial',
};

export interface Video {
    id: string;
    user_id: string;
    topic: string;
    platform: Platform;
    target_duration_seconds: number;
    script: string;
    status: VideoStatus;
    branding: Branding;
    video_url: string | null;
    source_video_id: string | null; // set when duplicated from another video for a different platform (content reuse)
    created_at: string;
}

export interface Scene {
    id: string;
    video_id: string;
    order: number;
    character: CharacterType;
    action: SceneAction;
    prop: ScenePropType;
    description: string; // the narration line for this scene; also doubles as the subtitle text
    duration_seconds: number;
    audio_url: string | null;
}
