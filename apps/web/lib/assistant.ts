import { getTemplate, type VideoTemplate } from '@shared-types/templates';
import type { LogoPosition, Platform, SceneAction, ScenePropType, CharacterType } from '@shared-types/video';
import { generateWithFallback } from './ai-provider';

// The assistant turns a spoken sentence into one operation the studio already
// supports. It only *decides*; the browser runs the action through the same API
// client the buttons use, so there is no second copy of the workflow here.
export type AssistantAction =
    | { kind: 'responder' }
    | { kind: 'listar' }
    | { kind: 'abrir'; query: string }
    | { kind: 'estado' }
    | { kind: 'crear'; topic: string; platform: Platform; durationSeconds: number; template: VideoTemplate }
    | { kind: 'generar_escenas' }
    | { kind: 'generar_voz' }
    | { kind: 'editar_escena'; sceneNumber: number; character?: CharacterType; action?: SceneAction; prop?: ScenePropType }
    | { kind: 'borrar_escena'; sceneNumber: number }
    | { kind: 'marca'; patch: BrandPatch }
    | { kind: 'duplicar'; platform: Platform }
    | { kind: 'descargar' }
    | { kind: 'borrar_video' }
    | { kind: 'enviar_aprobacion' }
    | { kind: 'renderizar' }
    | { kind: 'rechazado'; reason: string };

export interface BrandPatch {
    primary_color?: string;
    secondary_color?: string;
    font_family?: string;
    logo_position?: LogoPosition;
}

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
// Both stems are listed on purpose: "aprueba", the form people actually say,
// does not contain "aprob".
export const FORBIDDEN = /\b(aprob|aprueb|public|publiqu|autoriz)\w*/i;

// A question *about* the gate rather than a request to open it.
export const ABOUT_APPROVAL = /\b(que (me )?falta|cuando|quien|como se|se puede|puedo|es posible|por que)\b/i;

// Asking the assistant what suits *you* is asking for financial advice, which
// this product cannot give. It is not a refusal of the whole sentence: the
// educational half still gets answered and the video still gets offered.
const ADVICE = /\b(me conviene|cual elijo|cual escojo|que me recomiendas|recomiendame|me van a aprobar|cuanto me prestan|cuanto me prestarian|deberia (tomar|pedir|firmar)|es buena idea)\b/i;

// The studio's own vocabulary. Asking which template or character to use is a
// question about the tool, and answering it is the product; only a question
// about the person's own money is advice this cannot give.
const STUDIO_NOUNS = /\b(plantilla|plantillas|personaje|personajes|escena|escenas|video|videos|guion|plataforma|marca|formato|tipografia|color)\b/i;
const MONEY_SUBJECT = /\b(credito|creditos|tasa|tasas|prestamo|cuota|hipoteca|plazo|banco|entidad|financiaci|refinanci|seguro|deuda)\b/i;

const PLATFORM_WORDS: Record<string, Platform> = {
    reels: 'reels', instagram: 'reels', insta: 'reels',
    tiktok: 'tiktok', 'tik tok': 'tiktok',
    shorts: 'shorts', youtube: 'shorts', short: 'shorts',
};

const TEMPLATE_WORDS: Record<string, VideoTemplate> = {
    conversacion: 'conversacion', 'conversación': 'conversacion', dialogo: 'conversacion', 'diálogo': 'conversacion',
    explicacion: 'explicacion', 'explicación': 'explicacion', explicativo: 'explicacion', tutorial: 'explicacion',
    comparacion: 'comparacion', 'comparación': 'comparacion', comparativo: 'comparacion', versus: 'comparacion',
    llamada: 'llamada', telefonica: 'llamada', 'telefónica': 'llamada',
    presentacion: 'presentacion', 'presentación': 'presentacion', propiedad: 'presentacion',
};

// A template is only read when the sentence actually frames one ("en formato
// llamada"). Matching the bare word would turn a video *about* a phone call
// into a phone-call template, which is not what was asked.
const TEMPLATE_CUE = /\b(?:en\s+)?(?:formato|estilo|plantilla|tipo|como una?)\s+([a-záéíóúñ]+)/i;

function findTemplate(text: string): VideoTemplate | undefined {
    const cue = text.match(TEMPLATE_CUE);
    return cue ? TEMPLATE_WORDS[cue[1].toLowerCase()] : undefined;
}

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

// Spoken colour names, so "pon el color primario azul oscuro" lands somewhere
// sensible. Longer names come first: "azul oscuro" must win over "azul".
const COLOR_WORDS: [string, string][] = [
    ['azul oscuro', '#12305c'], ['azul marino', '#12305c'], ['verde oscuro', '#0a3d2f'],
    ['celeste', '#38bdf8'], ['turquesa', '#0d9488'], ['dorado', '#c9a227'], ['amarillo', '#f5c542'],
    ['naranja', '#ea580c'], ['morado', '#6d28d9'], ['violeta', '#6d28d9'], ['rosa', '#db2777'],
    ['vino', '#7f1d1d'], ['burdeos', '#7f1d1d'], ['cafe', '#6b4423'], ['café', '#6b4423'],
    ['marron', '#6b4423'], ['marrón', '#6b4423'], ['beige', '#e8ded0'], ['gris', '#64748b'],
    ['negro', '#17202a'], ['blanco', '#ffffff'], ['azul', '#1d4ed8'], ['rojo', '#b91c1c'], ['verde', '#15803d'],
];

const FONT_WORDS: [RegExp, string][] = [
    [/\b(serif|clasica|clásica|elegante|georgia)\b/i, 'serif'],
    [/\b(condensada|estrecha|titular|titulares)\b/i, 'condensed'],
    [/\b(mono|monoespaciada|tecnica|técnica|maquina|máquina)\b/i, 'mono'],
    [/\b(sans|neutra|moderna|arial|simple)\b/i, 'sans'],
];

function findWord<T>(text: string, table: Record<string, T>): T | undefined {
    for (const [word, value] of Object.entries(table)) {
        if (new RegExp(`\\b${word}\\b`, 'i').test(text)) return value;
    }
    return undefined;
}

// What the assistant can actually do, in the words a person would use. Shown
// when asked, and when nothing matched: a menu is more useful than an apology.
const HELP = [
    'Puedo operar el estudio por ti. Dime cosas como:',
    '"crea un video sobre tasas fijas para TikTok en formato conversacion",',
    '"genera las escenas", "en la escena 2 que el broker camine con una casa",',
    '"borra la escena 3", "pon el color primario azul oscuro", "usa tipografia condensada",',
    '"abre el video de la cuota inicial", "como va este video", "duplicalo para Reels",',
    '"generalo" o "descarga el MP4".',
    'Lo unico que no hago es aprobar ni publicar: eso lo decides tu.',
].join(' ');

// Short, neutral definitions. No figures, no entities, no recommendations: the
// assistant explains the vocabulary and offers to turn it into a video, which
// is the product. Anything asking what suits the person is caught by ADVICE
// before this table is consulted.
const GLOSSARY: [RegExp, string][] = [
    [/\btasa fija\b/i, 'Una tasa fija es la que se pacta al inicio y no cambia durante el plazo del credito: la cuota es previsible de principio a fin.'],
    [/\btasa variable\b/i, 'Una tasa variable se recalcula cada cierto periodo segun un indicador de referencia, asi que la cuota puede subir o bajar con el tiempo.'],
    [/\bcuota inicial\b/i, 'La cuota inicial es la parte del valor de la vivienda que se paga de entrada con recursos propios; el credito cubre el resto.'],
    [/\bplazo\b/i, 'El plazo es el tiempo total para pagar el credito. A mayor plazo la cuota mensual baja, pero se pagan intereses durante mas tiempo.'],
    [/\bamortizaci/i, 'La amortizacion es la forma en que cada cuota se reparte entre intereses y abono al capital que se debe.'],
    [/\bavaluo|avalúo\b/i, 'El avaluo es la valoracion tecnica del inmueble hecha por un perito, y es la referencia que la entidad usa para el credito.'],
    [/\brefinanci/i, 'Refinanciar es sustituir un credito vigente por otro con condiciones distintas, por ejemplo otro plazo u otra tasa.'],
    [/\bcapacidad de (endeudamiento|pago)\b/i, 'La capacidad de endeudamiento es la parte del ingreso que puede destinarse a pagar deudas sin comprometer los gastos del hogar.'],
    [/\bpreaprobaci|pre aprobaci|pre-aprobaci/i, 'Una preaprobacion es una estimacion previa de cuanto podria financiarse, sujeta a verificacion y a la aprobacion formal.'],
    [/\bhipoteca\b/i, 'Una hipoteca es la garantia sobre el inmueble que respalda el credito: si se incumple el pago, esa garantia puede ejecutarse.'],
    [/\bleasing habitacional\b/i, 'El leasing habitacional es un contrato donde la entidad compra la vivienda y la entrega en arriendo con opcion de compra al final.'],
    [/\bseguros?\b/i, 'Los seguros asociados al credito cubren riesgos como el fallecimiento del deudor o danos al inmueble, y se suman a la cuota.'],
    [/\bhistorial crediticio|puntaje|score\b/i, 'El historial crediticio es el registro de como se han pagado las obligaciones anteriores, y las entidades lo consultan al estudiar una solicitud.'],
];

function glossaryAnswer(text: string): string | null {
    for (const [pattern, answer] of GLOSSARY) {
        if (pattern.test(text)) return `${answer} Si quieres lo convierto en un video, dime nada mas.`;
    }
    return null;
}

/**
 * Recognises what the user wants without calling the model. This is not an
 * optimisation, it is the working path: the LLM quota runs out and the studio
 * still has to obey. Everything the panels can do is reachable from here.
 * Returns null only when the sentence genuinely needs interpretation.
 */
function matchKnownCommand(message: string): AssistantReply | null {
    const text = message.toLowerCase().trim();

    if (FORBIDDEN.test(text)) {
        const pregunta = ABOUT_APPROVAL.test(text);
        return {
            reply: pregunta
                ? 'Aprobar y publicar los hace una persona, no yo: el video pasa a pendiente de aprobacion y ahi alguien lo revisa y decide. Puedo decirte que le falta antes de ese paso si me preguntas por el estado.'
                : 'No puedo aprobar ni publicar videos. Esa decision tiene que tomarla una persona revisando el contenido, porque es marketing financiero regulado. Te dejo el video listo y tu decides.',
            action: pregunta ? { kind: 'estado' } : { kind: 'rechazado', reason: 'aprobacion humana obligatoria' },
        };
    }

    if (ADVICE.test(text) && MONEY_SUBJECT.test(text) && !STUDIO_NOUNS.test(text)) {
        const context = glossaryAnswer(text);
        return {
            reply: `No puedo decirte que te conviene ni estimar si te aprobarian: eso depende de tu situacion y lo define la entidad. ${context ?? 'Lo que si puedo es explicarte los conceptos y armar el video que los explique.'}`,
            action: { kind: 'responder' },
        };
    }

    // A greeting on its own, not "hola, crea un video sobre...".
    if (/^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey|que tal|holi)\b[\s!.,]*$/i.test(text)) {
        return {
            reply: 'Hola. Dime que quieres hacer con tus videos, o pideme uno nuevo con el tema que necesites.',
            action: { kind: 'responder' },
        };
    }

    if (/\b(ayuda|que puedes hacer|que sabes hacer|como funciona|para que sirves|que hago|opciones|comandos|no se que)\b/i.test(text)) {
        return { reply: HELP, action: { kind: 'responder' } };
    }

    // A definition question is answered before anything else reads the sentence:
    // "que es una tasa fija" contains "tasa fija", which the create branch would
    // happily turn into a video nobody asked for.
    if (/\b(que es|que significa|que quiere decir|explicame|explica|diferencia entre|en que consiste)\b/i.test(text)) {
        const answer = glossaryAnswer(text);
        if (answer) return { reply: answer, action: { kind: 'responder' } };
    }

    const crear = text.match(/\b(crea|crear|nuevo video|haz un video|genera un video|armame|hazme un video)\b(.*)/);
    if (crear) {
        const rest = crear[2] ?? '';
        const topic = rest
            .replace(/^.*?\bsobre\b/i, '')
            .replace(/\b(para|en)\s+(reels|tiktok|tik tok|shorts|instagram|youtube)\b.*/i, '')
            .replace(/\bde\s+\d+\s*segundos?\b/i, '')
            .replace(TEMPLATE_CUE, '')
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
                    template: findTemplate(text) ?? 'libre',
                },
            };
        }
    }

    if (/\bescenas?\b/.test(text) && /\b(genera|generar|crea|crear|arma|rehaz|vuelve a)\b/.test(text)) {
        return { reply: '', action: { kind: 'generar_escenas' } };
    }

    if (/\bvoz\b/.test(text) && /\b(genera|generar|pon|añade|anade|agrega)\b/.test(text)) {
        return { reply: '', action: { kind: 'generar_voz' } };
    }

    if (/\b(renderiza|renderizar|genera el video|generar el video|arma el video|generalo|generalo ya|hazlo ya)\b/.test(text)) {
        return { reply: '', action: { kind: 'renderizar' } };
    }

    if (/\b(envia|enviar|manda|mandar|pasa|pasar)\b/.test(text) && /\brevisi|aprobaci/.test(text)) {
        return { reply: '', action: { kind: 'enviar_aprobacion' } };
    }

    // Deleting is checked before editing: "borra la escena 2" also matches "escena 2".
    const borrarEscena = text.match(/\b(borra|borrar|elimina|eliminar|quita|quitar)\s+(?:la\s+)?escena\s+(\d{1,2})\b/);
    if (borrarEscena) {
        return { reply: '', action: { kind: 'borrar_escena', sceneNumber: Number(borrarEscena[2]) } };
    }

    if (/\b(borra|borrar|elimina|eliminar)\b/.test(text) && /\b(este|el)\s+video\b/.test(text)) {
        return { reply: '', action: { kind: 'borrar_video' } };
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

    // Brand: colours, typeface and the logo corner.
    const brand = readBrandPatch(text);
    if (brand) return { reply: '', action: { kind: 'marca', patch: brand } };

    if (/\b(duplica|duplicar|duplicalo|copia|copiar|replica|replicar)\b/.test(text)) {
        const platform = findWord(text, PLATFORM_WORDS);
        if (platform) return { reply: '', action: { kind: 'duplicar', platform } };
    }

    if (/\b(descarga|descargar|descargalo|bajar|baja)\b/.test(text) || /\bel (mp4|archivo)\b/.test(text)) {
        return { reply: '', action: { kind: 'descargar' } };
    }

    if (/\b(como va|en que va|que falta|ya esta|esta listo|estado de este|resumen de este)\b/.test(text)) {
        return { reply: '', action: { kind: 'estado' } };
    }

    // Opening a video by position or by words from its topic.
    const abrir = text.match(/\b(abre|abrir|muestra|mostrar|selecciona|seleccionar|ver|revisa|revisar|pon)\b(.*)/);
    if (abrir && /\bvideo|primero|ultimo|último|el de\b/.test(text)) {
        const query = (abrir[2] ?? '')
            .replace(/\b(el|la|los|las|un|una|video|videos)\b/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return { reply: '', action: { kind: 'abrir', query } };
    }

    if (/\b(cuantos|cuántos|que hay|qué hay|lista|listar|listame|resumen|pendiente|pendientes)\b/.test(text)) {
        return { reply: '', action: { kind: 'listar' } };
    }

    return null;
}

function readBrandPatch(text: string): BrandPatch | null {
    const patch: BrandPatch = {};

    if (/\bcolor(es)?\b/.test(text)) {
        const found = COLOR_WORDS.find(([word]) => new RegExp(`\\b${word}\\b`, 'i').test(text));
        if (found) {
            if (/\bsecundario|de fondo|del fondo\b/.test(text)) patch.secondary_color = found[1];
            else patch.primary_color = found[1];
        }
    }

    if (/\b(tipografia|tipografía|letra|letras|fuente)\b/.test(text)) {
        const font = FONT_WORDS.find(([pattern]) => pattern.test(text));
        if (font) patch.font_family = font[1];
    }

    if (/\blogo\b/.test(text)) {
        const top = /\barriba|superior\b/.test(text);
        const bottom = /\babajo|inferior\b/.test(text);
        const left = /\bizquierda|izquierdo\b/.test(text);
        const right = /\bderecha|derecho\b/.test(text);
        if ((top || bottom) && (left || right)) {
            patch.logo_position = `${bottom ? 'bottom' : 'top'}-${right ? 'right' : 'left'}` as LogoPosition;
        }
    }

    return Object.keys(patch).length > 0 ? patch : null;
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
{"reply":"...","action":{"kind":"abrir","query":"palabras del tema, 'primero' o 'ultimo'"}}
{"reply":"...","action":{"kind":"estado"}}
{"reply":"...","action":{"kind":"crear","topic":"...","platform":"reels|tiktok|shorts","durationSeconds":30,"template":"libre|conversacion|explicacion|comparacion|llamada|presentacion"}}
{"reply":"...","action":{"kind":"generar_escenas"}}
{"reply":"...","action":{"kind":"generar_voz"}}
{"reply":"...","action":{"kind":"editar_escena","sceneNumber":2,"character":"broker","action":"caminar","prop":"casa"}}
{"reply":"...","action":{"kind":"borrar_escena","sceneNumber":3}}
{"reply":"...","action":{"kind":"marca","patch":{"primary_color":"#1d4ed8","secondary_color":"#ffffff","font_family":"sans|serif|mono|condensed","logo_position":"top-left|top-right|bottom-left|bottom-right"}}}
{"reply":"...","action":{"kind":"duplicar","platform":"reels|tiktok|shorts"}}
{"reply":"...","action":{"kind":"descargar"}}
{"reply":"...","action":{"kind":"borrar_video"}}
{"reply":"...","action":{"kind":"enviar_aprobacion"}}
{"reply":"...","action":{"kind":"renderizar"}}

La plantilla marca como se monta el video: "conversacion" (cliente y asesor dialogando), "explicacion" (el asesor explica a camara), "comparacion" (dos opciones enfrentadas), "llamada" (una llamada telefonica), "presentacion" (se muestra una vivienda). Usa "libre" si el usuario no pide una estructura concreta.

Valores validos. character: broker, cliente, pareja, hombre, mujer, generico. action: hablar, caminar, senalar, sentarse, pensar, telefono, mostrar_objeto. prop: casa, carro, banco, telefono, documento, dinero, grafico, oficina, ninguno.

NUNCA apruebes ni publiques un video, y no ofrezcas hacerlo: esa decision es de una persona porque el contenido es financiero regulado. Si te lo piden, explicalo y usa kind "responder".
NUNCA des recomendaciones financieras personalizadas, ni estimes si le aprobarian un credito, ni inventes tasas o cifras. Explica los conceptos en general y ofrece convertirlos en un video.
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
        const allowed = [
            'responder', 'listar', 'abrir', 'estado', 'crear', 'generar_escenas', 'generar_voz',
            'editar_escena', 'borrar_escena', 'marca', 'duplicar', 'descargar', 'borrar_video',
            'enviar_aprobacion', 'renderizar',
        ];
        if (!allowed.includes(kind)) return { reply: parsed.reply, action: { kind: 'responder' } };
        const action = parsed.action as AssistantAction;
        if (action.kind === 'crear') action.template = getTemplate(action.template).id;
        return { reply: parsed.reply, action };
    } catch {
        return null;
    }
}

export async function interpret(message: string, context: AssistantContext): Promise<AssistantReply> {
    const known = matchKnownCommand(message);
    if (known) return known;

    const result = await generateWithFallback(
        SYSTEM,
        [{ role: 'user', content: `${describeContext(context)}\n\nEl usuario dice: "${message}"` }],
        { maxTokens: 300 },
    );

    const parsed = result ? parseModelJson(result.text) : null;
    if (parsed) return parsed;

    // No model and no match: the menu, not an apology about infrastructure the
    // client can do nothing about.
    return { reply: `No estoy seguro de que me pediste. ${HELP}`, action: { kind: 'responder' } };
}
