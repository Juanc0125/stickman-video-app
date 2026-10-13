// The browser's own voice, made to sound like a person instead of the default
// robot. Three things decide that: which installed voice is used (the default
// for a bare lang tag is usually the oldest, most synthetic one), what text it
// is handed (markdown symbols get read out as "asterisco"), and how much at a
// time (Chrome cuts long utterances off around fifteen seconds, and a whole
// paragraph has to be prepared before the first word sounds).

// Latin American Spanish first: the operator and the videos are Colombian and
// Mexican, and a Spain accent reads as foreign.
const LATAM = /^es-(mx|us|co|419|ar|cl|pe|ve|ec|uy|py|bo|cr|pa|do|gt|hn|ni|sv|pr|cu)$/;

// Voice names say little about the speaker, but the common Spanish voices on
// Windows, macOS and Android use these first names. Used only as a tie-breaker:
// a natural male voice still beats a robotic female one.
const FEMALE = /\b(dalia|salome|elena|paloma|elvira|sabina|helena|laura|paulina|monica|ximena|camila|valentina|catalina|marisol|lupe|penelope|beatriz|renata|larissa|teresa|lucia|female|mujer)\b/i;
const MALE = /\b(jorge|gonzalo|alvaro|raul|pablo|juan|diego|carlos|gerardo|tomas|emilio|andres|enrique|miguel|male|hombre)\b/i;

function normaliseLang(lang: string): string {
    return lang.replace('_', '-').toLowerCase();
}

/**
 * Ranks a voice the way a listener would: neural voices (Edge's "Online
 * (Natural)", Apple's premium ones) over Google's network voices over the
 * local Latin American ones over any Spanish at all. Zero means "not Spanish".
 */
export function scoreVoice(voice: SpeechSynthesisVoice): number {
    const lang = normaliseLang(voice.lang);
    if (!lang.startsWith('es')) return 0;
    const name = voice.name.normalize('NFD').replace(/[̀-ͯ]/g, '');

    let score = 1;
    if (/natural|online|neural|premium|enhanced/i.test(name)) score += 1000;
    else if (/google/i.test(name)) score += /estados unidos|united states/i.test(name) || lang === 'es-us' ? 600 : 500;
    if (LATAM.test(lang)) score += 100;
    if (FEMALE.test(name)) score += 20;
    else if (MALE.test(name)) score -= 5;
    return score;
}

let cachedVoice: SpeechSynthesisVoice | null = null;
let listening = false;

function pickVoice(): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = 0;
    for (const voice of voices) {
        const score = scoreVoice(voice);
        if (score > bestScore) {
            best = voice;
            bestScore = score;
        }
    }
    return best;
}

/**
 * Starts loading the voice list. Chrome fills getVoices() asynchronously and
 * fires voiceschanged when it is ready (Edge's online voices arrive late, so the
 * choice is redone on every change); called on mount so the first reply does
 * not have to wait for it.
 */
export function primeVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    cachedVoice = pickVoice() ?? cachedVoice;
    if (listening) return;
    listening = true;
    window.speechSynthesis.addEventListener('voiceschanged', () => {
        cachedVoice = pickVoice() ?? cachedVoice;
    });
}

/** The best Spanish voice, waiting briefly for the list on a cold start. */
export async function bestVoice(): Promise<SpeechSynthesisVoice | null> {
    primeVoices();
    if (cachedVoice) return cachedVoice;
    // Not loaded yet: wait for the list, but never hold a reply back for long -
    // the default voice is better than silence.
    await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 700);
        window.speechSynthesis.addEventListener('voiceschanged', () => {
            clearTimeout(timer);
            resolve();
        }, { once: true });
    });
    cachedVoice = pickVoice() ?? cachedVoice;
    return cachedVoice;
}

// Built at runtime: the project targets ES2017, where TypeScript rejects the
// unicode property escape in a regex literal, while every browser with
// speechSynthesis supports it.
const EMOJI = new RegExp(String.raw`\p{Extended_Pictographic}|\uFE0F`, 'gu');

/**
 * What the voice should actually say: no markdown, links, emojis or list
 * markers. The model is told not to produce them, but a free model now and
 * then does, and a voice reading "asterisco asterisco" is the opposite of human.
 */
export function toSpeech(text: string): string {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/^\s{0,3}(#{1,6}|[-*•]|\d+[.)])\s+/gm, '')
        .replace(/[*_`#>|~]+/g, '')
        .replace(EMOJI, '')
        .replace(/\s*\n+\s*/g, '. ')
        .replace(/\s*(→|->|=>)\s*/g, ', ')
        .replace(/\.(\s*\.)+/g, '.')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

// Long enough to sound like a phrase, short enough that Chrome never cuts it
// and the first one starts almost at once.
const MIN_CHUNK = 40;
const MAX_CHUNK = 180;

/** Splits a reply into sentences, merging very short ones and breaking very long ones at commas. */
export function toChunks(text: string): string[] {
    const sentences = text.replace(/([.!?…;:])\s+/g, '$1\n').split('\n').map((part) => part.trim()).filter(Boolean);
    const pieces: string[] = [];
    for (const sentence of sentences) {
        if (sentence.length <= MAX_CHUNK) {
            pieces.push(sentence);
            continue;
        }
        let rest = sentence;
        while (rest.length > MAX_CHUNK) {
            const head = rest.slice(0, MAX_CHUNK);
            const cut = Math.max(head.lastIndexOf(', '), head.lastIndexOf(' '));
            const at = cut > MIN_CHUNK ? cut + 1 : MAX_CHUNK;
            pieces.push(rest.slice(0, at).trim());
            rest = rest.slice(at).trim();
        }
        if (rest) pieces.push(rest);
    }

    const chunks: string[] = [];
    for (const piece of pieces) {
        const last = chunks[chunks.length - 1];
        if (last && last.length < MIN_CHUNK && last.length + piece.length + 1 <= MAX_CHUNK) chunks[chunks.length - 1] = `${last} ${piece}`;
        else chunks.push(piece);
    }
    return chunks;
}
