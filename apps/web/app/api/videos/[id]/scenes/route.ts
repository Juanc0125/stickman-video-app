import { NextResponse } from 'next/server';
import type { CharacterType, Scene, SceneAction, ScenePropType } from '@shared-types/video';
import { generateAiText } from '../../../../../lib/ai';
import { getVideo, replaceScenes } from '../../../../../lib/video-persistence';

type RouteContext = { params: Promise<{ id: string }> };
type SceneInput = Omit<Scene, 'id' | 'video_id'>;

const CHARACTERS: CharacterType[] = ['broker', 'cliente', 'pareja', 'hombre', 'mujer', 'generico'];
const ACTIONS: SceneAction[] = ['hablar', 'caminar', 'senalar', 'sentarse', 'pensar', 'telefono', 'mostrar_objeto'];
const PROPS: ScenePropType[] = ['ninguno', 'casa', 'carro', 'banco', 'telefono', 'documento', 'dinero', 'grafico', 'oficina'];

const MIN_SCENES = 2;
const MAX_SCENES = 8;

function coerceCharacter(value: unknown): CharacterType {
    return typeof value === 'string' && (CHARACTERS as string[]).includes(value) ? (value as CharacterType) : 'generico';
}

function coerceAction(value: unknown): SceneAction {
    return typeof value === 'string' && (ACTIONS as string[]).includes(value) ? (value as SceneAction) : 'hablar';
}

function coerceProp(value: unknown): ScenePropType {
    return typeof value === 'string' && (PROPS as string[]).includes(value) ? (value as ScenePropType) : 'ninguno';
}

function coerceDuration(value: unknown, fallback: number): number {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
}

function coerceDescription(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

// Models sometimes wrap JSON in markdown fences or add stray prose; strip that defensively
// before attempting JSON.parse, and fall back to locating the first JSON-looking block.
function extractJson(text: string): unknown {
    const withoutFences = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
        return JSON.parse(withoutFences);
    } catch {
        const match = withoutFences.match(/[[{][\s\S]*[\]}]/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }
}

function buildSystemPrompt(targetDurationSeconds: number): string {
    return [
        'Eres un planificador de escenas para videos cortos de marketing de creditos hipotecarios / vivienda, protagonizados por un personaje 2D tipo "stickman" (muneco de palitos simple, en 2D, sin animacion 3D ni personajes complejos ni fotorrealistas).',
        `Divide el guion recibido en entre ${MIN_SCENES} y ${MAX_SCENES} escenas, segun lo que requiera la duracion objetivo del video.`,
        `La suma de "duration_seconds" de todas las escenas debe aproximarse a ${targetDurationSeconds} segundos en total.`,
        'Cuando encaje con el tema, apoyate en estructuras narrativas simples como una conversacion, una explicacion directa, una comparacion de opciones, una llamada telefonica o la presentacion de una propiedad/vivienda.',
        'Responde UNICAMENTE con un arreglo JSON valido (sin texto adicional, sin explicaciones, sin bloques de markdown ni comillas envolventes) de objetos, cada uno con EXACTAMENTE estas claves:',
        '- "character": uno de estos valores exactos: "broker", "cliente", "pareja", "hombre", "mujer", "generico"',
        '- "action": uno de estos valores exactos: "hablar", "caminar", "senalar", "sentarse", "pensar", "telefono", "mostrar_objeto"',
        '- "prop": uno de estos valores exactos: "ninguno", "casa", "carro", "banco", "telefono", "documento", "dinero", "grafico", "oficina" (usa "ninguno" si no aplica ningun objeto)',
        '- "description": una linea corta de narracion/subtitulo para esa escena, basada en el guion',
        '- "duration_seconds": un numero entre 2 y 10',
    ].join('\n');
}

function buildScenesFromAiJson(raw: unknown): SceneInput[] | null {
    let list: unknown = raw;
    if (!Array.isArray(list) && list && typeof list === 'object' && Array.isArray((list as Record<string, unknown>).scenes)) {
        list = (list as Record<string, unknown>).scenes;
    }
    if (!Array.isArray(list) || list.length === 0) return null;

    return list.map((item, index) => {
        const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        return {
            order: index + 1,
            character: coerceCharacter(record.character),
            action: coerceAction(record.action),
            prop: coerceProp(record.prop),
            description: coerceDescription(record.description, `Escena ${index + 1}`),
            duration_seconds: coerceDuration(record.duration_seconds, 4),
            audio_url: null,
        };
    });
}

function buildSentenceFallback(script: string, targetDurationSeconds: number): SceneInput[] {
    const sentences = script
        .split(/[.!?]+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
    const lines = sentences.length ? sentences : [script.trim() || 'Contenido del video.'];
    const safeTarget = Number.isFinite(targetDurationSeconds) && targetDurationSeconds > 0 ? targetDurationSeconds : 30;
    const rawDuration = safeTarget / lines.length;
    const clampedDuration = Math.min(10, Math.max(2, Number.isFinite(rawDuration) ? rawDuration : 4));

    return lines.map((line, index) => ({
        order: index + 1,
        character: 'generico',
        action: 'hablar',
        prop: 'ninguno',
        description: line,
        duration_seconds: clampedDuration,
        audio_url: null,
    }));
}

export async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params;

    let video;
    try {
        video = await getVideo(id);
    } catch (error) {
        console.error('Error al cargar el video', error);
        return NextResponse.json({ error: 'No se pudo cargar el video.' }, { status: 500 });
    }

    if (!video) {
        return NextResponse.json({ error: 'Video no encontrado.' }, { status: 404 });
    }

    const targetDurationSeconds = Number.isFinite(video.target_duration_seconds) && video.target_duration_seconds > 0
        ? video.target_duration_seconds
        : 30;

    let scenes: SceneInput[] | null = null;
    try {
        const result = await generateAiText(
            buildSystemPrompt(targetDurationSeconds),
            [{ role: 'user', content: `Tema: ${video.topic}\n\nGuion completo:\n${video.script}` }],
            900,
        );
        if (result?.text) {
            scenes = buildScenesFromAiJson(extractJson(result.text));
        }
    } catch (error) {
        console.warn('Fallo al generar escenas con IA, se usara el respaldo por oraciones.', error);
    }

    if (!scenes || scenes.length === 0) {
        scenes = buildSentenceFallback(video.script, targetDurationSeconds);
    }

    try {
        const updated = await replaceScenes(id, scenes);
        return NextResponse.json({ video: updated });
    } catch (error) {
        console.error('Error al guardar las escenas generadas', error);
        return NextResponse.json({ error: 'No se pudieron generar las escenas.' }, { status: 500 });
    }
}
