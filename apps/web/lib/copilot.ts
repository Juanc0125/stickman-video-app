// The copilot: the operator describes what they want and the model operates the
// studio through tool calls. Every tool lands in the same persistence functions
// and route handlers the panels already use, so each rule has exactly one
// implementation and the copilot cannot drift from what the buttons do.

import { getTemplate, VIDEO_TEMPLATES } from '@shared-types/templates';
import type { CharacterType, Platform, Scene, SceneAction, ScenePropType } from '@shared-types/video';
import { POST as applyBrandTemplateRoute } from '../app/api/videos/[id]/brand-template/route';
import { PATCH as patchSceneRoute } from '../app/api/videos/[id]/scenes/[sceneId]/route';
import { POST as planScenesRoute } from '../app/api/videos/[id]/scenes/route';
import { POST as duplicateRoute } from '../app/api/videos/[id]/duplicate/route';
import { POST as ttsRoute } from '../app/api/videos/[id]/tts/route';
import type { VideoRecord } from '../app/api/videos/store';
import { ACTION_OPTIONS, CHARACTER_OPTIONS, PLATFORM_LABELS, PLATFORM_OPTIONS, PROP_OPTIONS, STATUS_LABELS } from '../app/components/constants';
import { generateWithFallback, isCopilotConfigured, type ChatMessage, type ToolCall, type ToolSchema } from './ai-provider';
import { FORBIDDEN, interpret, type AssistantAction, type AssistantContext, type BrandPatch } from './assistant';
import { listBrandTemplates } from './brand-templates';
import { createVideo, deleteScene, deleteVideo, getVideo, listVideos, updateBranding, updateScene, updateScript } from './video-persistence';

export interface CopilotTurn {
    role: 'user' | 'assistant';
    content: string;
}

export interface CopilotResult {
    reply: string;
    video: VideoRecord | null;
    created: boolean;
    deletedId: string | null;
    acciones: string[];
    provider: string | null;
    // Two things the server cannot do because they happen in the browser:
    // moving the selection to another video, and handing the operator a file.
    selectId: string | null;
    descargarUrl: string | null;
}

// What the turn has done so far. `videoId` moves when a tool creates a video so
// that the rest of the turn ("crea un video de tasas y generale las escenas")
// works on the new one without another round trip to the browser.
interface CopilotState {
    videoId: string | null;
    touched: VideoRecord | null;
    created: boolean;
    deletedId: string | null;
    acciones: string[];
    selectId: string | null;
    descargarUrl: string | null;
}

type ToolArgs = Record<string, unknown>;
type ToolExecutor = (args: ToolArgs, state: CopilotState) => Promise<string>;
type Resolved<T> = { ok: true; value: T } | { ok: false; message: string };

// The vocabulary the panels offer, read from the panels themselves instead of
// retyped: a value invented here would be rejected by the scene route anyway.
const PLATFORMS: Platform[] = PLATFORM_OPTIONS.map((option) => option.value);
const CHARACTERS: CharacterType[] = CHARACTER_OPTIONS.map((option) => option.value);
const ACTIONS: SceneAction[] = ACTION_OPTIONS.map((option) => option.value);
const PROPS: ScenePropType[] = PROP_OPTIONS.map((option) => option.value);
const TEMPLATE_IDS = VIDEO_TEMPLATES.map((template) => template.id);

const MIN_DURATION = 10;
const MAX_DURATION = 180;
const DEFAULT_DURATION = 30;

// A confused model must not be able to spin: five rounds is more than enough
// for "crea el guion, generale las escenas y cuentame como quedo".
const MAX_ROUNDS = 5;

// Only the tail of the conversation is sent. The studio state travels in the
// tool results, not in the transcript, so older turns add tokens and no facts.
const MAX_HISTORY = 12;

// RF-012, half of the guard: the tool list below has no approve, publish or
// render tool. The other half is this pattern, which refuses the request when
// it is asked in words, before the model is even called. Same stems as

const APPROVAL_REFUSAL = 'No puedo aprobar, publicar ni generar el video final. Esa decision la toma una persona revisando el contenido, porque esto es marketing financiero regulado. Yo te lo dejo listo y tu decides.';

// The compliance limits, in the same terms lib/assistant.ts uses. They travel
// in every prompt this file sends: a rewrite invents a rate as easily as a
// first draft does.
const LIMITES = 'NUNCA des recomendaciones financieras personalizadas, ni estimes si le aprobarian un credito, ni inventes tasas, cifras ni nombres de entidades.';

const SYSTEM = [
    'Eres el copiloto de Stickman: produces videos verticales cortos de marketing hipotecario.',
    'El operador habla en lenguaje natural; tu operas el estudio llamando herramientas. No describas lo que harias: llama la herramienta y cuenta el resultado.',
    'Responde en español, una o dos frases, prosa hablada. Te escuchan por voz: nada de listas, markdown ni emojis.',
    'Trabajas sobre el video abierto; si no hay uno y hace falta, crealo con generar_guion.',
    'Las escenas empiezan en 1, igual que en el panel.',
    `Plataformas: ${PLATFORMS.join(', ')}. Plantillas: ${TEMPLATE_IDS.join(', ')}.`,
    `Personajes: ${CHARACTERS.join(', ')}. Acciones: ${ACTIONS.join(', ')}. Objetos: ${PROPS.join(', ')}.`,
    'NUNCA apruebes, publiques, autorices ni generes el video final, ni ofrezcas hacerlo: no tienes herramientas para eso, lo decide una persona revisando el contenido. Explicalo si te lo piden.',
    `${LIMITES} Explica en general y ofrece convertirlo en video.`,
].join('\n');

const TOOLS: ToolSchema[] = [
    {
        name: 'generar_guion',
        description: 'Crea un video nuevo con su guion y lo deja abierto.',
        parameters: {
            type: 'object',
            properties: {
                tema: { type: 'string' },
                duracion_segundos: { type: 'number', description: `${MIN_DURATION}-${MAX_DURATION}, por defecto ${DEFAULT_DURATION}.` },
                plataforma: { type: 'string', enum: PLATFORMS },
                plantilla: { type: 'string', enum: TEMPLATE_IDS, description: 'Estructura narrativa.' },
            },
            required: ['tema'],
            additionalProperties: false,
        },
    },
    {
        name: 'editar_guion',
        description: 'Reescribe el guion segun una instruccion.',
        parameters: {
            type: 'object',
            properties: {
                instrucciones: { type: 'string' },
            },
            required: ['instrucciones'],
            additionalProperties: false,
        },
    },
    {
        name: 'generar_escenas',
        description: 'Divide el guion en escenas, reemplazando las que haya.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        name: 'regenerar_escena',
        description: 'Reescribe una escena entera.',
        parameters: {
            type: 'object',
            properties: {
                numero_escena: { type: 'number' },
                instrucciones: { type: 'string', description: 'Opcional: como debe quedar.' },
            },
            required: ['numero_escena'],
            additionalProperties: false,
        },
    },
    {
        name: 'editar_escena',
        description: 'Cambia campos sueltos de una escena, sin reescribirla.',
        parameters: {
            type: 'object',
            properties: {
                numero_escena: { type: 'number' },
                personaje: { type: 'string', enum: CHARACTERS },
                accion: { type: 'string', enum: ACTIONS },
                objeto: { type: 'string', enum: PROPS },
                descripcion: { type: 'string', description: 'Linea hablada, que es tambien el subtitulo.' },
            },
            required: ['numero_escena'],
            additionalProperties: false,
        },
    },
    {
        name: 'borrar_escena',
        description: 'Elimina una escena y renumera las siguientes.',
        parameters: {
            type: 'object',
            properties: {
                numero_escena: { type: 'number' },
            },
            required: ['numero_escena'],
            additionalProperties: false,
        },
    },
    {
        name: 'sugerir_plantilla',
        description: 'Recomienda una plantilla. Solo informa.',
        parameters: {
            type: 'object',
            properties: {
                tipo_video: { type: 'string' },
            },
            required: ['tipo_video'],
            additionalProperties: false,
        },
    },
    {
        name: 'sugerir_personaje',
        description: 'Recomienda un personaje. Solo informa.',
        parameters: {
            type: 'object',
            properties: {
                rol: { type: 'string', description: 'El papel, p.ej. "quien explica".' },
            },
            required: ['rol'],
            additionalProperties: false,
        },
    },
    {
        name: 'aplicar_branding',
        description: 'Aplica una marca guardada: logo, colores y tipografia.',
        parameters: {
            type: 'object',
            properties: {
                nombre_o_id_plantilla: { type: 'string' },
            },
            required: ['nombre_o_id_plantilla'],
            additionalProperties: false,
        },
    },
    {
        name: 'estado_proyecto',
        description: 'Resume estado, escenas, render y pendientes. Solo informa.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        name: 'abrir_video',
        description: 'Abre otro video de la biblioteca y trabaja sobre el.',
        parameters: {
            type: 'object',
            properties: {
                busqueda: { type: 'string', description: 'Tema, "primero" o "ultimo".' },
            },
            required: ['busqueda'],
            additionalProperties: false,
        },
    },
    {
        name: 'generar_voz',
        description: 'Narra las escenas. Requiere que ya existan.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        name: 'duplicar_video',
        description: 'Copia el video a otra plataforma; nace en borrador.',
        parameters: {
            type: 'object',
            properties: {
                plataforma: { type: 'string', enum: PLATFORMS, description: 'Distinta de la actual.' },
            },
            required: ['plataforma'],
            additionalProperties: false,
        },
    },
    {
        name: 'descargar_video',
        description: 'Entrega el MP4 ya generado. No genera nada.',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
];

// The scene planner, the single-scene regenerator, the strict
// scene validation and the brand-template application live inside their route
// handlers and nowhere else, so the copilot invokes the handler in process
// instead of keeping a second copy that would drift from the panels. The URL is
// a placeholder: these handlers read the params and the body, never the path.
const INTERNAL_URL = 'http://copilot.local/api';

type RouteHandler<P> = (request: Request, context: { params: Promise<P> }) => Promise<Response>;

async function callRoute<P>(handler: RouteHandler<P>, params: P, init: RequestInit): Promise<VideoRecord> {
    const response = await handler(new Request(INTERNAL_URL, init), { params: Promise.resolve(params) });
    const payload = await response.json().catch(() => null) as { video?: VideoRecord; error?: string } | null;
    if (!response.ok || !payload?.video) {
        throw new Error(payload?.error ?? 'No se pudo completar la operacion.');
    }
    return payload.video;
}

function jsonInit(method: string, body: unknown): RequestInit {
    return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

// Accents come and go in what a model writes ("telefono" / "teléfono") while
// the stored ids never carry them.
function normalise(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function readText(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function matchOption<T extends string>(value: string, options: readonly T[]): T | null {
    if (!value) return null;
    const text = normalise(value);
    // The exact id first, then a value wrapped in words ("el broker", "accion
    // hablar"), which is how a model phrases it when it ignores the enum.
    return options.find((option) => normalise(option) === text)
        ?? options.find((option) => text.includes(normalise(option)))
        ?? null;
}

const PLATFORM_ALIASES: Record<string, Platform> = { instagram: 'reels', reel: 'reels', 'tik tok': 'tiktok', youtube: 'shorts', short: 'shorts' };

function coercePlatform(value: unknown): Platform {
    const text = normalise(readText(value));
    return matchOption(text, PLATFORMS) ?? PLATFORM_ALIASES[text] ?? 'reels';
}

function coerceDuration(value: unknown): number {
    const seconds = typeof value === 'number' ? value : Number(readText(value));
    if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_DURATION;
    return Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(seconds)));
}

function orderedScenes(video: VideoRecord): Scene[] {
    return [...video.scenes].sort((a, b) => a.order - b.order);
}

// The messages these guards return are read by the model, and in the no-model
// path they are spoken to the operator word for word, so they say what to do
// next in plain Spanish instead of naming tools.
async function requireVideo(state: CopilotState): Promise<Resolved<VideoRecord>> {
    if (!state.videoId) {
        return { ok: false, message: 'No hay ningun video abierto: abre uno en la lista o dime el tema y lo creo.' };
    }
    const video = await getVideo(state.videoId);
    if (!video) {
        return { ok: false, message: 'El video que estaba abierto ya no existe.' };
    }
    return { ok: true, value: video };
}

function resolveScene(video: VideoRecord, value: unknown): Resolved<Scene> {
    const scenes = orderedScenes(video);
    if (!scenes.length) {
        return { ok: false, message: 'El video todavia no tiene escenas; hay que generarlas antes de tocar ninguna.' };
    }
    const number = typeof value === 'number' ? value : Number(readText(value));
    if (!Number.isInteger(number) || number < 1 || number > scenes.length) {
        return { ok: false, message: `Esa escena no existe: el video tiene ${scenes.length} escenas, numeradas de 1 a ${scenes.length}.` };
    }
    return { ok: true, value: scenes[number - 1] };
}

function describeScenes(video: VideoRecord): string {
    const lines = orderedScenes(video).map((scene) => `${scene.order}. ${scene.character} / ${scene.action} / ${scene.prop} (${scene.duration_seconds}s): ${scene.description}`);
    return `El video tiene ${lines.length} escenas.\n${lines.join('\n')}`;
}

function describeBranding(video: VideoRecord): string {
    const branding = video.branding;
    return `color principal ${branding.primary_color}, secundario ${branding.secondary_color}, tipografia ${branding.font_family}, ${branding.logo_url ? 'con logo' : 'sin logo'}`;
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
        const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed as Record<string, unknown>;
    } catch {
        return null;
    }
}

async function generarGuion(args: ToolArgs, state: CopilotState): Promise<string> {
    const tema = readText(args.tema);
    if (tema.length < 3) {
        return 'Falta el tema del video: sin tema no hay guion que escribir.';
    }

    const video = await createVideo(tema, coercePlatform(args.plataforma), coerceDuration(args.duracion_segundos), getTemplate(args.plantilla).id);
    state.videoId = video.id;
    state.touched = video;
    state.created = true;
    state.acciones.push('Guion generado');

    return [
        `Video creado sobre "${video.topic}" para ${PLATFORM_LABELS[video.platform]}, ${video.target_duration_seconds} segundos, plantilla ${getTemplate(video.template).label}.`,
        `Guion:\n${video.script}`,
    ].join('\n');
}

async function editarGuion(args: ToolArgs, state: CopilotState): Promise<string> {
    const instrucciones = readText(args.instrucciones);
    if (!instrucciones) return 'Falta la instruccion: di que hay que cambiar del guion.';

    const open = await requireVideo(state);
    if (!open.ok) return open.message;

    const result = await generateWithFallback(
        [
            'Reescribes el guion de una mini-telenovela vertical de marketing hipotecario siguiendo la instruccion del operador.',
            'Manten el tono hablado, las frases cortas y el español neutro. Cambia solo lo que la instruccion pide.',
            LIMITES,
            'Devuelve unicamente el guion nuevo en texto plano, sin comillas envolventes, sin encabezados y sin explicar los cambios.',
        ].join('\n'),
        [{ role: 'user', content: `Tema: ${open.value.topic}\n\nGuion actual:\n${open.value.script}\n\nInstruccion: ${instrucciones}` }],
        { maxTokens: 600, temperature: 0.6 },
    );

    const script = result?.text.trim();
    if (!script) {
        return 'No hay modelo disponible para reescribir el guion; el operador puede editarlo a mano en el panel de guion.';
    }

    const updated = await updateScript(open.value.id, script);
    state.touched = updated;
    state.acciones.push('Guion reescrito');
    return `Guion actualizado:\n${updated.script}`;
}

async function generarEscenas(_args: ToolArgs, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;
    if (!open.value.script.trim()) {
        return 'El video no tiene guion todavia, y las escenas salen del guion. Genera o escribe el guion primero.';
    }

    const updated = await callRoute(planScenesRoute, { id: open.value.id }, { method: 'POST' });
    state.touched = updated;
    state.acciones.push(`${updated.scenes.length} escenas creadas`);
    return describeScenes(updated);
}

// RF-007 with something the panel does not offer: the route regenerates a scene
// from the script alone and has no way to take guidance, so a scene that has to
// change in a specific way is written here and saved through updateScene, the
// same function that route uses. With no model available it falls back to the
// route, which is plain RF-007.
async function regenerarConInstruccion(video: VideoRecord, scene: Scene, instruction: string): Promise<VideoRecord> {
    const result = await generateWithFallback(
        [
            'Reescribes UNA escena de un video vertical corto de marketing hipotecario, manteniendo la continuidad con el resto del guion.',
            `Devuelve unicamente un objeto JSON con las claves "character" (${CHARACTERS.join(', ')}), "action" (${ACTIONS.join(', ')}), "prop" (${PROPS.join(', ')}) y "description" (la linea corta y hablada que el personaje dice).`,
            LIMITES,
        ].join('\n'),
        [{
            role: 'user',
            content: [
                `Tema: ${video.topic}`,
                `Guion completo: ${video.script}`,
                `Escena ${scene.order} actual -> character: ${scene.character}, action: ${scene.action}, prop: ${scene.prop}, description: "${scene.description}"`,
                `Instruccion del operador: ${instruction}`,
            ].join('\n'),
        }],
        { maxTokens: 300, temperature: 0.6 },
    );

    const parsed = result ? parseJsonObject(result.text) : null;
    if (!parsed) {
        return callRoute(patchSceneRoute, { id: video.id, sceneId: scene.id }, jsonInit('PATCH', { regenerate: true }));
    }

    return updateScene(video.id, scene.id, {
        character: matchOption(readText(parsed.character), CHARACTERS) ?? scene.character,
        action: matchOption(readText(parsed.action), ACTIONS) ?? scene.action,
        prop: matchOption(readText(parsed.prop), PROPS) ?? scene.prop,
        description: readText(parsed.description) || scene.description,
    });
}

async function regenerarEscena(args: ToolArgs, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;

    const found = resolveScene(open.value, args.numero_escena);
    if (!found.ok) return found.message;

    const instrucciones = readText(args.instrucciones);
    const updated = instrucciones
        ? await regenerarConInstruccion(open.value, found.value, instrucciones)
        : await callRoute(patchSceneRoute, { id: open.value.id, sceneId: found.value.id }, jsonInit('PATCH', { regenerate: true }));

    state.touched = updated;
    state.acciones.push(`Escena ${found.value.order} regenerada`);

    const scene = updated.scenes.find((entry) => entry.id === found.value.id);
    return scene
        ? `Escena ${scene.order} regenerada: ${scene.character} / ${scene.action} / ${scene.prop}: ${scene.description}`
        : `Escena ${found.value.order} regenerada.`;
}

async function editarEscena(args: ToolArgs, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;

    const found = resolveScene(open.value, args.numero_escena);
    if (!found.ok) return found.message;

    const patch: Record<string, string> = {};
    const ignored: string[] = [];
    const fields: [string, unknown, readonly string[] | null][] = [
        ['character', args.personaje, CHARACTERS],
        ['action', args.accion, ACTIONS],
        ['prop', args.objeto, PROPS],
        ['description', args.descripcion, null],
    ];

    for (const [field, raw, options] of fields) {
        const value = readText(raw);
        if (!value) continue;
        if (!options) {
            patch[field] = value;
            continue;
        }
        const matched = matchOption(value, options);
        if (matched) patch[field] = matched;
        else ignored.push(`"${value}"`);
    }

    if (!Object.keys(patch).length) {
        return `No hay nada valido que cambiar en la escena ${found.value.order}. Personajes: ${CHARACTERS.join(', ')}. Acciones: ${ACTIONS.join(', ')}. Objetos: ${PROPS.join(', ')}.`;
    }

    const updated = await callRoute(patchSceneRoute, { id: open.value.id, sceneId: found.value.id }, jsonInit('PATCH', patch));
    state.touched = updated;
    state.acciones.push(`Escena ${found.value.order} editada`);

    const scene = updated.scenes.find((entry) => entry.id === found.value.id);
    const resumen = scene ? `${scene.character} / ${scene.action} / ${scene.prop}: ${scene.description}` : Object.keys(patch).join(', ');
    return `Escena ${found.value.order} actualizada: ${resumen}.${ignored.length ? ` Ignore ${ignored.join(' y ')} porque no esta entre los valores permitidos.` : ''}`;
}

async function borrarEscena(args: ToolArgs, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;

    const found = resolveScene(open.value, args.numero_escena);
    if (!found.ok) return found.message;

    const updated = await deleteScene(open.value.id, found.value.id);
    state.touched = updated;
    state.acciones.push(`Escena ${found.value.order} borrada`);
    return `Escena ${found.value.order} borrada. Quedan ${updated.scenes.length} escenas, ya renumeradas.`;
}

// Word overlap is enough here: the operator describes the video in a phrase
// ("dos personas discutiendo la cuota") and the template texts are written in
// that same vocabulary.
function scoreText(query: string, text: string): number {
    const words = normalise(query).split(/[^a-z0-9]+/).filter((word) => word.length >= 4);
    const haystack = normalise(text);
    return words.filter((word) => haystack.includes(word)).length;
}

async function sugerirPlantilla(args: ToolArgs): Promise<string> {
    const tipo = readText(args.tipo_video);
    const catalogo = VIDEO_TEMPLATES.map((template) => `${template.id} (${template.description})`).join('; ');
    if (!tipo) return `Plantillas disponibles: ${catalogo}.`;

    const ranked = VIDEO_TEMPLATES
        .filter((template) => template.id !== 'libre')
        .map((template) => ({ template, score: scoreText(tipo, `${template.label} ${template.description} ${template.guidance}`) }))
        .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best || best.score === 0) {
        return `Para "${tipo}" no hay una plantilla claramente mejor, asi que "libre" deja que la IA decida la forma. Plantillas disponibles: ${catalogo}.`;
    }
    return `Para "${tipo}" encaja la plantilla ${best.template.id}: ${best.template.description} Otras opciones: ${catalogo}.`;
}

// The panel labels say "Cliente" and "Pareja", not "comprador" or "los
// esposos", which is how the operator actually talks.
const CHARACTER_HINTS: Record<CharacterType, string> = {
    broker: 'asesor broker agente experto vendedor quien explica entidad banco',
    cliente: 'cliente comprador solicitante interesado quien pregunta duda',
    pareja: 'pareja esposos matrimonio novios familia compradores',
    hombre: 'hombre señor chico muchacho',
    mujer: 'mujer señora chica muchacha',
    generico: 'generico cualquiera narrador neutro',
};

async function sugerirPersonaje(args: ToolArgs): Promise<string> {
    const rol = readText(args.rol);
    const catalogo = CHARACTER_OPTIONS.map((option) => `${option.value} (${option.label})`).join('; ');
    if (!rol) return `Personajes disponibles: ${catalogo}.`;

    const ranked = CHARACTER_OPTIONS
        .map((option) => ({ option, score: scoreText(rol, `${option.label} ${CHARACTER_HINTS[option.value]}`) }))
        .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best || best.score === 0) {
        return `Para "${rol}" no hay un papel claro, usa "generico". Personajes disponibles: ${catalogo}.`;
    }
    return `Para "${rol}" el personaje es "${best.option.value}" (${best.option.label}). Personajes disponibles: ${catalogo}.`;
}

async function aplicarBranding(args: ToolArgs, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;

    const templates = await listBrandTemplates();
    if (!templates.length) {
        return 'No hay ninguna plantilla de marca guardada todavia; se guardan desde el panel de marca del estudio.';
    }

    const query = readText(args.nombre_o_id_plantilla);
    const wanted = normalise(query);
    const match = templates.find((template) => template.id === query)
        ?? templates.find((template) => normalise(template.name) === wanted)
        ?? (wanted.length >= 3 ? templates.find((template) => normalise(template.name).includes(wanted)) : undefined);

    if (!match) {
        return `No encontre la plantilla de marca "${query}". Guardadas: ${templates.map((template) => template.name).join(', ')}.`;
    }

    const updated = await callRoute(applyBrandTemplateRoute, { id: open.value.id }, jsonInit('POST', { template_id: match.id }));
    state.touched = updated;
    state.acciones.push(`Marca "${match.name}" aplicada`);
    return `Marca "${match.name}" aplicada al video: ${describeBranding(updated)}.`;
}

async function estadoProyecto(_args: ToolArgs, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;

    const video = open.value;
    const scenes = orderedScenes(video);
    const total = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);

    const pendiente: string[] = [];
    if (!video.script.trim()) pendiente.push('falta el guion');
    if (!scenes.length) pendiente.push('faltan las escenas');
    else if (scenes.some((scene) => !scene.audio_url)) pendiente.push('faltan narraciones en algunas escenas');
    if (video.status === 'borrador') pendiente.push('falta que una persona lo revise y lo apruebe');
    if (video.status === 'aprobado' && !video.video_url) pendiente.push('falta generar el archivo final');

    return [
        `"${video.topic}" para ${PLATFORM_LABELS[video.platform]}, plantilla ${getTemplate(video.template).label}, objetivo ${video.target_duration_seconds} segundos.`,
        `Estado ${STATUS_LABELS[video.status]}, ${scenes.length} escenas que suman ${Math.round(total)} segundos, render ${video.render_status}${video.render_status === 'procesando' ? ` al ${video.render_progress}%` : ''}.`,
        `Marca: ${describeBranding(video)}.`,
        pendiente.length ? `Pendiente: ${pendiente.join(', ')}.` : 'No queda nada pendiente de mi lado.',
    ].join(' ');
}

// The browser owns the selection, so this tool moves it *and* points the rest
// of the turn at the video it found: "abre el de la cuota inicial y generale
// las escenas" has to work in one go.
async function abrirVideo(args: ToolArgs, state: CopilotState): Promise<string> {
    const videos = await listVideos();
    if (!videos.length) return 'Todavia no hay videos guardados. Dime un tema y te creo el primero.';

    const query = normalise(readText(args.busqueda));
    let match: VideoRecord | undefined;
    if (/ultimo|reciente/.test(query)) match = videos[videos.length - 1];
    else if (/primero|primer/.test(query)) match = videos[0];
    if (!match && query) {
        match = videos.find((video) => normalise(video.topic).includes(query))
            ?? videos.find((video) => query.split(/\s+/).some((word) => word.length > 3 && normalise(video.topic).includes(word)));
    }
    if (!match) return `No encontre ese video. Los que hay son: ${videos.map((video) => video.topic).join(', ')}.`;

    state.videoId = match.id;
    state.selectId = match.id;
    return `Abierto "${match.topic}": ${STATUS_LABELS[match.status].toLowerCase()}, ${match.scenes.length} escenas.`;
}

async function generarVoz(_args: ToolArgs, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;
    if (!open.value.scenes.length) return 'No hay escenas que narrar todavia. Genera las escenas primero.';

    const updated = await callRoute(ttsRoute, { id: open.value.id }, { method: 'POST' });
    state.touched = updated;
    state.acciones.push('Voz generada');
    // The cloud voice is optional: the render narrates with the local voice
    // either way, so a missing TTS key is not a failure worth alarming about.
    return 'Narracion preparada para las escenas.';
}

async function duplicarVideo(args: ToolArgs, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;

    const platform = matchOption(readText(args.plataforma), PLATFORMS);
    if (!platform) return `Dime para que plataforma: ${PLATFORMS.join(', ')}.`;
    if (platform === open.value.platform) return `Ese video ya es de ${PLATFORM_LABELS[platform]}.`;

    const copy = await callRoute(duplicateRoute, { id: open.value.id }, jsonInit('POST', { platform }));
    state.touched = copy;
    state.created = true;
    state.videoId = copy.id;
    state.acciones.push(`Duplicado para ${PLATFORM_LABELS[platform]}`);
    return `Copia creada para ${PLATFORM_LABELS[platform]} con el mismo guion, escenas y marca. Arranca como borrador y necesita su propia aprobacion.`;
}

async function descargarVideo(_args: ToolArgs, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;
    if (!open.value.video_url) {
        return 'Ese video todavia no tiene MP4. Tiene que aprobarlo una persona y generarse antes.';
    }
    state.descargarUrl = open.value.video_url;
    return 'Te abro el MP4 en otra pestana.';
}

const EXECUTORS: Record<string, ToolExecutor> = {
    generar_guion: generarGuion,
    editar_guion: editarGuion,
    generar_escenas: generarEscenas,
    regenerar_escena: regenerarEscena,
    editar_escena: editarEscena,
    borrar_escena: borrarEscena,
    sugerir_plantilla: sugerirPlantilla,
    sugerir_personaje: sugerirPersonaje,
    aplicar_branding: aplicarBranding,
    estado_proyecto: estadoProyecto,
    abrir_video: abrirVideo,
    generar_voz: generarVoz,
    duplicar_video: duplicarVideo,
    descargar_video: descargarVideo,
};

// A failed tool is information for the model, not a dead turn: it gets the
// Spanish reason back and can explain it or try something else.
async function executeTool(call: ToolCall, state: CopilotState): Promise<string> {
    const executor = EXECUTORS[call.name];
    if (!executor) {
        return `La herramienta "${call.name}" no existe. Usa solo las herramientas declaradas.`;
    }
    try {
        return await executor(call.arguments ?? {}, state);
    } catch (error) {
        console.warn(`Fallo la herramienta ${call.name}.`, error);
        return `La herramienta fallo: ${error instanceof Error ? error.message : 'error desconocido'}.`;
    }
}

// Said out loud when the model ran tools but never got to speak, so the turn
// still ends with what actually happened instead of silence.
function summarise(state: CopilotState): string {
    if (!state.acciones.length) {
        return 'No termine de entender que necesitas. Dime otra vez que quieres hacer con el video.';
    }
    const done = state.acciones.map((accion) => accion.toLowerCase());
    const last = done[done.length - 1];
    const rest = done.slice(0, -1);
    return rest.length ? `Listo: ${rest.join(', ')} y ${last}.` : `Listo: ${last}.`;
}

function toResult(state: CopilotState, reply: string, provider: string | null): CopilotResult {
    return {
        reply: reply.trim() || summarise(state),
        video: state.touched,
        created: state.created,
        deletedId: state.deletedId,
        acciones: state.acciones,
        provider,
        selectId: state.selectId,
        descargarUrl: state.descargarUrl,
    };
}

// Two executors no tool exposes. They exist because the regex interpreter below
// can still ask for them, and deleting a video or repainting its colours is not
// something the copilot should infer from a vague sentence - only from a
// command the interpreter already recognised as exactly that.
async function aplicarMarca(patch: BrandPatch, state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;

    const updated = await updateBranding(open.value.id, patch);
    state.touched = updated;
    state.acciones.push('Marca actualizada');
    return `Marca actualizada: ${describeBranding(updated)}.`;
}

async function borrarVideo(state: CopilotState): Promise<string> {
    const open = await requireVideo(state);
    if (!open.ok) return open.message;

    await deleteVideo(open.value.id);
    state.videoId = null;
    state.touched = null;
    state.deletedId = open.value.id;
    state.acciones.push('Video borrado');
    return `Borre el video "${open.value.topic}".`;
}

function buildContext(videos: VideoRecord[], videoId: string | null): AssistantContext {
    const porEstado: Record<string, number> = {};
    for (const video of videos) porEstado[video.status] = (porEstado[video.status] ?? 0) + 1;

    const selected = videoId ? videos.find((video) => video.id === videoId) ?? null : null;
    return {
        total: videos.length,
        porEstado,
        seleccionado: selected
            ? { topic: selected.topic, status: selected.status, scenes: selected.scenes.length, renderStatus: selected.render_status }
            : null,
    };
}

function describeLibrary(videos: VideoRecord[]): string {
    if (!videos.length) return 'Todavia no hay videos. Pideme uno y lo creo.';
    const porEstado = Object.entries(buildContext(videos, null).porEstado)
        .map(([estado, cantidad]) => `${cantidad} en ${STATUS_LABELS[estado as keyof typeof STATUS_LABELS] ?? estado}`)
        .join(', ');
    if (videos.length === 1) return `Hay un solo video, "${videos[0].topic}", en estado ${STATUS_LABELS[videos[0].status]}.`;
    const temas = videos.slice(0, 3).map((video) => `"${video.topic}"`).join(', ');
    return `Hay ${videos.length} videos (${porEstado}). Los ultimos son ${temas}.`;
}

/**
 * Runs whatever the regex interpreter recognised on the same executors the
 * tools use. The actions the copilot deliberately does not perform - sending to
 * approval, rendering - are refused here too, and the ones that belong to
 * another panel say so instead of pretending.
 */
async function runLegacyAction(action: AssistantAction, state: CopilotState, videos: VideoRecord[]): Promise<string> {
    switch (action.kind) {
        case 'crear':
            return generarGuion({ tema: action.topic, duracion_segundos: action.durationSeconds, plataforma: action.platform, plantilla: action.template }, state);
        case 'generar_escenas':
            return generarEscenas({}, state);
        case 'editar_escena':
            return editarEscena({ numero_escena: action.sceneNumber, personaje: action.character, accion: action.action, objeto: action.prop }, state);
        case 'borrar_escena':
            return borrarEscena({ numero_escena: action.sceneNumber }, state);
        case 'estado':
            return estadoProyecto({}, state);
        case 'marca':
            return aplicarMarca(action.patch, state);
        case 'borrar_video':
            return borrarVideo(state);
        case 'listar':
            return describeLibrary(videos);
        case 'abrir':
            return abrirVideo({ busqueda: action.query }, state);
        case 'enviar_aprobacion':
        case 'renderizar':
            return APPROVAL_REFUSAL;
        case 'generar_voz':
            return generarVoz({}, state);
        case 'duplicar':
            return duplicarVideo({ plataforma: action.platform }, state);
        case 'descargar':
            return descargarVideo({}, state);
        default:
            // 'responder' and 'rechazado': the interpreter already wrote the reply.
            return '';
    }
}

/**
 * The path with no LLM configured, which is the everyday path on a machine
 * without keys: the regex interpreter in lib/assistant.ts decides what was
 * asked and its action runs through the same executors the tools use, so the
 * endpoint answers the same shape either way.
 */
async function runWithoutModel(message: string, state: CopilotState): Promise<CopilotResult> {
    const videos = await listVideos();
    const { reply, action } = await interpret(message, buildContext(videos, state.videoId));
    const detail = await runLegacyAction(action, state, videos);

    // The executors answer the model with the whole script or the whole scene
    // list; read out loud that is a monologue. So a turn that changed something
    // is summarised, and only the informational answers are spoken verbatim.
    return toResult(state, reply.trim() || (state.acciones.length ? '' : detail), null);
}

/**
 * One turn of the copilot: the model reads the conversation, calls tools, reads
 * their results and answers. The loop is bounded so a model that keeps calling
 * tools without ever answering still ends the turn.
 */
export async function runCopilot(videoId: string | null, turns: CopilotTurn[]): Promise<CopilotResult> {
    const state: CopilotState = { videoId, touched: null, created: false, deletedId: null, acciones: [], selectId: null, descargarUrl: null };
    const lastUser = [...turns].reverse().find((turn) => turn.role === 'user')?.content ?? '';

    // RF-012: refused before anything runs, whichever path would have served it.
    if (FORBIDDEN.test(lastUser)) {
        return toResult(state, APPROVAL_REFUSAL, null);
    }

    if (!isCopilotConfigured()) {
        return runWithoutModel(lastUser, state);
    }

    const chat: ChatMessage[] = turns.slice(-MAX_HISTORY).map((turn) => ({ role: turn.role, content: turn.content }));
    let provider: string | null = null;
    let reply = '';

    for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const result = await generateWithFallback(SYSTEM, chat, { tools: TOOLS, maxTokens: 800, temperature: 0.3 });
        if (!result) {
            // Keys are configured but every provider failed. On the first round
            // nothing has run yet, so the regex interpreter can still serve the
            // turn instead of the operator getting an apology.
            if (round === 0) return runWithoutModel(lastUser, state);
            break;
        }

        provider = result.provider;
        if (!result.toolCalls.length) {
            reply = result.text;
            break;
        }

        // ChatMessage cannot carry tool_calls, so the assistant's turn is kept
        // as text naming what it invoked; without it the tool results that
        // follow would appear to answer nothing.
        chat.push({ role: 'assistant', content: result.text.trim() || `Ejecuto: ${result.toolCalls.map((call) => call.name).join(', ')}.` });
        for (const call of result.toolCalls) {
            chat.push({ role: 'tool', content: await executeTool(call, state), tool_call_id: call.id, name: call.name });
        }
    }

    return toResult(state, reply, provider);
}
