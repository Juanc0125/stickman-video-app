import type { Platform, SceneAction, ScenePropType, CharacterType } from '@shared-types/video';
import { generateAiText } from './ai';

// The assistant turns a spoken sentence into one operation the studio already
// supports. It only *decides*; the browser runs the action through the same API
// client the buttons use, so there is no second copy of the workflow here.
export type AssistantAction =
    | { kind: 'responder' }
    | { kind: 'listar' }
    | { kind: 'crear'; topic: string; platform: Platform; durationSeconds: number }
    | { kind: 'generar_escenas' }
    | { kind: 'generar_voz' }
    | { kind: 'editar_escena'; sceneNumber: number; character?: CharacterType; action?: SceneAction; prop?: ScenePropType }
    | { kind: 'enviar_aprobacion' }
    | { kind: 'renderizar' }
    | { kind: 'rechazado'; reason: string };

export interface AssistantReply {
    reply: string;
    action: AssistantAction;
}

export interface AssistantContext {
    total: number;
    porEstado: Record<string, number>;
    seleccionado: { topic: string; status: string; scenes: number; renderStatus: string } | null;
}

// Approving and publishing are deliberately absent from AssistantAction and are
// refused here as well. RF-012 exists because this is regulated financial
// marketing: the point of the gate is that a person looked at the content. An
// assistant that can approve its own output removes the only control there is.
const FORBIDDEN = /\b(aprob|public|autoriz)\w*/i;

const PLATFORM_WORDS: Record<string, Platform> = {
    reels: 'reels', instagram: 'reels', insta: 'reels',
    tiktok: 'tiktok', 'tik tok': 'tiktok',
    shorts: 'shorts', youtube: 'shorts', short: 'shorts',
};

const CHARACTER_WORDS: Record<string, CharacterType> = {
    broker: 'broker', asesor: 'broker', agente: 'broker',
    cliente: 'cliente', pareja: 'pareja', hombre: 'hombre', mujer: 'mujer', generico: 'generico',
};

const ACTION_WORDS: Record<string, SceneAction> = {
    hablar: 'hablar', hable: 'hablar', hablando: 'hablar',
    caminar: 'caminar', camine: 'caminar', caminando: 'caminar',
    senalar: 'senalar', 'señalar': 'senalar', 'señale': 'senalar', apuntar: 'senalar',
    sentarse: 'sentarse', siente: 'sentarse', sentado: 'sentarse',
    pensar: 'pensar', piense: 'pensar', pensando: 'pensar',
    telefono: 'telefono', 'teléfono': 'telefono', llamando: 'telefono',
    mostrar: 'mostrar_objeto', 'mostrar objeto': 'mostrar_objeto', presentar: 'mostrar_objeto',
};

const PROP_WORDS: Record<string, ScenePropType> = {
    casa: 'casa', vivienda: 'casa', carro: 'carro', auto: 'carro', coche: 'carro',
    banco: 'banco', telefono: 'telefono', 'teléfono': 'telefono',
    documento: 'documento', papeles: 'documento', dinero: 'dinero', plata: 'dinero',
    grafico: 'grafico', 'gráfico': 'grafico', oficina: 'oficina', ninguno: 'ninguno', nada: 'ninguno',
};

function findWord<T>(text: string, table: Record<string, T>): T | undefined {
    for (const [word, value] of Object.entries(table)) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(text)) return value;
    }
    return undefined;
}

/**
 * Recognises the common commands without calling the model. Two reasons this is
 * not premature: the LLM quota runs out and the assistant has to keep working,
 * and "genera el video" should not cost a round trip to answer.
 * Returns null when the sentence needs real interpretation.
 */
function matchKnownCommand(message: string): AssistantReply | null {
    const text = message.toLowerCase().trim();

    if (FORBIDDEN.test(text)) {
        return {
            reply: 'No puedo aprobar ni publicar videos. Esa decision tiene que tomarla una persona revisando el contenido, porque es marketing financiero regulado. Te dejo el video listo y tu decides.',
            action: { kind: 'rechazado', reason: 'aprobacion humana obligatoria' },
        };
    }

    if (/\b(cuantos|cuántos|que hay|qué hay|lista|listar|estado|resumen|pendiente)\b/.test(text)) {
        return { reply: '', action: { kind: 'listar' } };
    }

    const crear = text.match(/\b(crea|crear|nuevo video|haz un video|genera un video)\b(.*)/);
    if (crear) {
        const rest = crear[2] ?? '';
        const topic = rest
            .replace(/^.*?\bsobre\b/i, '')
            .replace(/\b(para|en)\s+(reels|tiktok|tik tok|shorts|instagram|youtube)\b.*/i, '')
            .replace(/\bde\s+\d+\s*segundos?\b/i, '')
            .trim();
        if (topic.length >= 3) {
            const durationMatch = text.match(/\b(\d{1,3})\s*segundos?\b/);
            return {
                reply: '',
                action: {
                    kind: 'crear',
                    topic: topic.charAt(0).toUpperCase() + topic.slice(1),
                    platform: findWord(text, PLATFORM_WORDS) ?? 'reels',
                    durationSeconds: durationMatch ? Number(durationMatch[1]) : 30,
                },
            };
        }
    }

    if (/\bescenas?\b/.test(text) && /\b(genera|generar|crea|crear)\b/.test(text)) {
        return { reply: '', action: { kind: 'generar_escenas' } };
    }

    if (/\bvoz\b/.test(text) && /\b(genera|generar|pon|añade|anade)\b/.test(text)) {
        return { reply: '', action: { kind: 'generar_voz' } };
    }

    if (/\b(renderiza|renderizar|genera el video|generar el video|arma el video)\b/.test(text)) {
        return { reply: '', action: { kind: 'renderizar' } };
    }

    if (/\b(envia|enviar|manda|mandar)\b/.test(text) && /\brevisi|aprobaci/.test(text)) {
        return { reply: '', action: { kind: 'enviar_aprobacion' } };
    }

    // "en la escena 2 que el broker camine con una casa"
    const sceneMatch = text.match(/\bescena\s+(\d{1,2})\b/);
    if (sceneMatch) {
        const character = findWord(text, CHARACTER_WORDS);
        const action = findWord(text, ACTION_WORDS);
        const prop = findWord(text, PROP_WORDS);
        if (character || action || prop) {
            return {
                reply: '',
                action: { kind: 'editar_escena', sceneNumber: Number(sceneMatch[1]), character, action, prop },
            };
        }
    }

    return null;
}

function describeContext(context: AssistantContext) {
    const estados = Object.entries(context.porEstado).map(([k, v]) => `${v} ${k}`).join(', ') || 'ninguno';
    const sel = context.seleccionado
        ? `Video abierto: "${context.seleccionado.topic}", estado ${context.seleccionado.status}, ${context.seleccionado.scenes} escenas, render ${context.seleccionado.renderStatus}.`
        : 'No hay ningun video abierto.';
    return `Hay ${context.total} videos (${estados}). ${sel}`;
}

const SYSTEM = `Eres el asistente de Stickman, una herramienta interna que produce videos cortos de marketing hipotecario.
Respondes en español, en una o dos frases, con tono directo y sin adornos. Te van a escuchar por voz, asi que nada de listas ni markdown.

Puedes pedir una de estas acciones devolviendo JSON:
{"reply":"<lo que dices en voz alta>","action":{"kind":"responder"}}
{"reply":"...","action":{"kind":"listar"}}
{"reply":"...","action":{"kind":"crear","topic":"...","platform":"reels|tiktok|shorts","durationSeconds":30}}
{"reply":"...","action":{"kind":"generar_escenas"}}
{"reply":"...","action":{"kind":"generar_voz"}}
{"reply":"...","action":{"kind":"editar_escena","sceneNumber":2,"character":"broker","action":"caminar","prop":"casa"}}
{"reply":"...","action":{"kind":"enviar_aprobacion"}}
{"reply":"...","action":{"kind":"renderizar"}}

Valores validos. character: broker, cliente, pareja, hombre, mujer, generico. action: hablar, caminar, senalar, sentarse, pensar, telefono, mostrar_objeto. prop: casa, carro, banco, telefono, documento, dinero, grafico, oficina, ninguno.

NUNCA apruebes ni publiques un video, y no ofrezcas hacerlo: esa decision es de una persona porque el contenido es financiero regulado. Si te lo piden, explicalo y usa kind "responder".
Si la peticion no encaja con ninguna accion, usa kind "responder" y contesta con lo que sabes del proyecto.
Devuelve solo el JSON, sin texto alrededor.`;

function parseModelJson(raw: string): AssistantReply | null {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
        const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<AssistantReply>;
        const kind = (parsed.action as { kind?: unknown } | undefined)?.kind;
        if (typeof parsed.reply !== 'string' || typeof kind !== 'string') return null;
        // The model is told not to approve, but the guarantee cannot rest on the
        // prompt: anything outside the known set becomes a plain answer.
        const allowed = ['responder', 'listar', 'crear', 'generar_escenas', 'generar_voz', 'editar_escena', 'enviar_aprobacion', 'renderizar'];
        if (!allowed.includes(kind)) return { reply: parsed.reply, action: { kind: 'responder' } };
        return { reply: parsed.reply, action: parsed.action as AssistantAction };
    } catch {
        return null;
    }
}

export async function interpret(message: string, context: AssistantContext): Promise<AssistantReply> {
    const known = matchKnownCommand(message);
    if (known) return known;

    const result = await generateAiText(
        SYSTEM,
        [{ role: 'user', content: `${describeContext(context)}\n\nEl usuario dice: "${message}"` }],
        300,
    );

    const parsed = result ? parseModelJson(result.text) : null;
    if (parsed) return parsed;

    return {
        reply: 'No entendi eso, y ahora mismo no puedo consultar el modelo de lenguaje. Prueba con algo como "crea un video sobre tasas fijas", "genera las escenas" o "cuantos videos hay".',
        action: { kind: 'responder' },
    };
}
