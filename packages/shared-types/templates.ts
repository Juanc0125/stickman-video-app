import type { Branding, CharacterType, SceneAction, ScenePropType } from './video';

export type VideoTemplate = 'libre' | 'conversacion' | 'explicacion' | 'comparacion' | 'llamada' | 'presentacion';

/** One scene's casting inside a template: who is on screen and what they are doing. */
export interface TemplateBeat {
    character: CharacterType;
    action: SceneAction;
    prop: ScenePropType;
}

export interface TemplateDefinition {
    id: VideoTemplate;
    label: string;
    /** Shown in the picker, so it says what the video will feel like. */
    description: string;
    /** Added to the scene-planner prompt to shape what the model produces. */
    guidance: string;
    /**
     * The casting used when the model is unavailable, and the fallback when it
     * returns fewer beats than the template has. Cycled if the video needs more
     * scenes than the pattern defines.
     */
    beats: TemplateBeat[];
}

// The five named in RF-019, plus "libre" for no template at all.
export const VIDEO_TEMPLATES: TemplateDefinition[] = [
    {
        id: 'libre',
        label: 'Libre',
        description: 'Sin estructura fija. La IA decide como contar el tema.',
        guidance: '',
        beats: [],
    },
    {
        id: 'conversacion',
        label: 'Conversacion',
        description: 'Dos personas hablando. El cliente pregunta, el asesor responde.',
        guidance: 'Montalo como una conversacion entre dos personas: el cliente plantea la duda y el asesor responde. Alterna estrictamente entre ambos en escenas consecutivas, y escribe cada descripcion como la frase que esa persona dice en voz alta.',
        beats: [
            { character: 'cliente', action: 'hablar', prop: 'ninguno' },
            { character: 'broker', action: 'hablar', prop: 'ninguno' },
            { character: 'cliente', action: 'pensar', prop: 'documento' },
            { character: 'broker', action: 'senalar', prop: 'grafico' },
            { character: 'pareja', action: 'hablar', prop: 'casa' },
        ],
    },
    {
        id: 'explicacion',
        label: 'Explicacion',
        description: 'Un asesor explica un concepto de principio a fin, a camara.',
        guidance: 'Montalo como una explicacion directa a camara de una sola persona, el asesor. Empieza con la pregunta que la gente se hace, desarrolla la respuesta en pasos y cierra con la accion prudente. Sin dialogo entre personajes.',
        beats: [
            { character: 'broker', action: 'hablar', prop: 'ninguno' },
            { character: 'broker', action: 'senalar', prop: 'grafico' },
            { character: 'broker', action: 'mostrar_objeto', prop: 'documento' },
            { character: 'broker', action: 'senalar', prop: 'dinero' },
            { character: 'broker', action: 'hablar', prop: 'casa' },
        ],
    },
    {
        id: 'comparacion',
        label: 'Comparacion',
        description: 'Dos opciones enfrentadas, y en que se diferencian de verdad.',
        guidance: 'Montalo como una comparacion entre dos opciones. Presenta la primera, presenta la segunda, senala la diferencia que de verdad importa y cierra diciendo como elegir. Usa el objeto "grafico" cuando se contrasten cifras.',
        beats: [
            { character: 'broker', action: 'hablar', prop: 'ninguno' },
            { character: 'broker', action: 'mostrar_objeto', prop: 'documento' },
            { character: 'broker', action: 'mostrar_objeto', prop: 'dinero' },
            { character: 'broker', action: 'senalar', prop: 'grafico' },
            { character: 'cliente', action: 'pensar', prop: 'ninguno' },
        ],
    },
    {
        id: 'llamada',
        label: 'Llamada telefonica',
        description: 'Una llamada que resuelve una duda urgente.',
        guidance: 'Montalo como una llamada telefonica. El cliente llama con una urgencia o un susto, el asesor contesta y lo resuelve, y se cierra con el cliente tranquilo. Usa la accion "telefono" en las escenas de la llamada.',
        beats: [
            { character: 'cliente', action: 'telefono', prop: 'telefono' },
            { character: 'broker', action: 'telefono', prop: 'oficina' },
            { character: 'cliente', action: 'pensar', prop: 'documento' },
            { character: 'broker', action: 'hablar', prop: 'grafico' },
            { character: 'pareja', action: 'hablar', prop: 'casa' },
        ],
    },
    {
        id: 'presentacion',
        label: 'Presentacion de propiedad',
        description: 'Se muestra una vivienda y lo que hace falta para acceder a ella.',
        guidance: 'Montalo como la presentacion de una vivienda: se muestra la casa, se explica que hace falta para acceder a ella, se aterriza en numeros y se cierra con la pareja frente a la casa. Usa el objeto "casa" en la primera y la ultima escena.',
        beats: [
            { character: 'broker', action: 'senalar', prop: 'casa' },
            { character: 'pareja', action: 'caminar', prop: 'casa' },
            { character: 'broker', action: 'mostrar_objeto', prop: 'documento' },
            { character: 'broker', action: 'senalar', prop: 'dinero' },
            { character: 'pareja', action: 'hablar', prop: 'casa' },
        ],
    },
];

export function getTemplate(id: unknown): TemplateDefinition {
    const found = VIDEO_TEMPLATES.find((template) => template.id === id);
    return found ?? VIDEO_TEMPLATES[0];
}

/**
 * RF-028: a saved visual identity (logo, colors, typeface) that can be applied
 * to any video. Unlike the narrative templates above these are invented by the
 * business, so they live in a table instead of in code.
 */
export interface BrandTemplate {
    id: string;
    name: string;
    branding: Branding;
    created_at: string;
}
