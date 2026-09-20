import type {
    CharacterType,
    LogoPosition,
    Platform,
    SceneAction,
    ScenePropType,
    VideoStatus,
} from '@shared-types/video';

export const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
    { value: 'reels', label: 'Instagram Reels' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'shorts', label: 'YouTube Shorts' },
];

export const PLATFORM_LABELS: Record<Platform, string> = {
    reels: 'Instagram Reels',
    tiktok: 'TikTok',
    shorts: 'YouTube Shorts',
};

export const CHARACTER_OPTIONS: { value: CharacterType; label: string }[] = [
    { value: 'broker', label: 'Asesor / broker' },
    { value: 'cliente', label: 'Cliente' },
    { value: 'pareja', label: 'Pareja' },
    { value: 'hombre', label: 'Hombre' },
    { value: 'mujer', label: 'Mujer' },
    { value: 'generico', label: 'Genérico' },
];

export const ACTION_OPTIONS: { value: SceneAction; label: string }[] = [
    { value: 'hablar', label: 'Hablar' },
    { value: 'caminar', label: 'Caminar' },
    { value: 'senalar', label: 'Señalar' },
    { value: 'sentarse', label: 'Sentarse' },
    { value: 'pensar', label: 'Pensar' },
    { value: 'telefono', label: 'Hablar por teléfono' },
    { value: 'mostrar_objeto', label: 'Mostrar objeto' },
];

export const PROP_OPTIONS: { value: ScenePropType; label: string }[] = [
    { value: 'ninguno', label: 'Ninguno' },
    { value: 'casa', label: 'Casa' },
    { value: 'carro', label: 'Carro' },
    { value: 'banco', label: 'Banco' },
    { value: 'telefono', label: 'Teléfono' },
    { value: 'documento', label: 'Documento' },
    { value: 'dinero', label: 'Dinero' },
    { value: 'grafico', label: 'Gráfico' },
    { value: 'oficina', label: 'Oficina' },
];

export const LOGO_POSITION_OPTIONS: { value: LogoPosition; label: string }[] = [
    { value: 'top-left', label: 'Superior izquierda' },
    { value: 'top-right', label: 'Superior derecha' },
    { value: 'bottom-left', label: 'Inferior izquierda' },
    { value: 'bottom-right', label: 'Inferior derecha' },
];

export const STATUS_LABELS: Record<VideoStatus, string> = {
    borrador: 'Borrador',
    pendiente_aprobacion: 'Pendiente de aprobación',
    aprobado: 'Aprobado',
    publicado: 'Publicado',
};

export const STATUS_BADGE_CLASSES: Record<VideoStatus, string> = {
    borrador: 'bg-gray-200 text-gray-700',
    pendiente_aprobacion: 'bg-amber-100 text-amber-800',
    aprobado: 'bg-blue-100 text-blue-800',
    publicado: 'bg-green-100 text-green-800',
};

// The four typefaces the renderer actually bundles. A brand can only pick from
// these, so the field is a select rather than free text.
export const FONT_OPTIONS = [
    { value: 'sans', label: 'Sans (neutra, tipo Arial)' },
    { value: 'serif', label: 'Serif (clásica, tipo Georgia)' },
    { value: 'condensed', label: 'Condensada (estrecha, titulares)' },
    { value: 'mono', label: 'Monoespaciada (técnica)' },
] as const;
