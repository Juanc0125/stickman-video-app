'use client';

import { useEffect, useRef, useState } from 'react';
import type { VideoRecord } from './api';

interface AssistantProps {
    videos: VideoRecord[];
    loading: boolean;
    selected: VideoRecord | null;
    onCreated: (video: VideoRecord) => void;
    onUpdated: (video: VideoRecord) => void;
    onSelect: (id: string) => void;
    onDeleted: (id: string) => void;
}

interface Turn {
    who: 'tu' | 'stickman';
    text: string;
}

// Speech recognition is still vendor-prefixed in Chrome and absent in Firefox,
// so it is reached through a narrow local shape instead of a DOM lib type.
type SpeechAlternative = { transcript: string };
// isFinal lives on the result slot, not the alternative: a slot updates with
// interim text several times before the engine settles on a final transcript.
type SpeechResult = ArrayLike<SpeechAlternative> & { isFinal: boolean };
type SpeechResultEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechErrorEvent = { error?: string };
type Recognition = {
    lang: string; continuous: boolean; interimResults: boolean;
    start: () => void; stop: () => void;
    onresult: ((event: SpeechResultEvent) => void) | null;
    onerror: ((event: SpeechErrorEvent) => void) | null;
    onend: (() => void) | null;
};

// Latin American Spanish: the videos are narrated with Mexican voices and the
// vocabulary is Colombian ("cuota inicial") - 'es-ES' (Spain) recognises
// neither well. Kept as a named constant with an env override instead of a
// literal inside getRecognition(), so fixing it for a different market later
// is a one-line change, not a hunt through the function body.
const RECOGNITION_LANG = process.env.NEXT_PUBLIC_RECOGNITION_LANG ?? 'es-MX';

function getRecognition(continuous: boolean): Recognition | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return null;
    const recognition = new Ctor();
    recognition.lang = RECOGNITION_LANG;
    recognition.continuous = continuous;
    // Always on: showing the partial transcript as it is heard is the whole
    // fix for "press, talk into silence, nothing moves until the phrase ends".
    recognition.interimResults = true;
    return recognition;
}

const VOICE_KEY = 'stickman:voz';

export default function Assistant({ videos, loading, selected, onCreated, onUpdated, onSelect, onDeleted }: AssistantProps) {
    const [listening, setListening] = useState(false);
    // Hands-free is never restored from storage: an open microphone is not a
    // display preference like mute/unmute, it is a live sensor in what can be
    // a shared office, and RF-012's caution about accidental triggers argues
    // for it defaulting off on every visit rather than turning itself on.
    const [handsFree, setHandsFree] = useState(false);
    // Live partial transcript, shown while a phrase is still being spoken and
    // cleared the moment it either finalises (and gets sent) or the mic stops.
    const [interim, setInterim] = useState('');
    // True while an utterance is actually sounding, independent of "busy":
    // the fetch can finish well before the reply has been read out loud.
    const [speaking, setSpeaking] = useState(false);
    // Whether the assistant answers out loud. Kept in a ref as well because a
    // reply can land after the user has already hit mute, and the ref is what
    // the reply reads.
    const [voiceOn, setVoiceOn] = useState(true);
    // null until the first answer. False means the turn was served by the
    // keyword fallback because no language model answered - worth saying, or
    // the operator just sees a copilot giving canned replies.
    const [modelo, setModelo] = useState<boolean | null>(null);
    const voiceRef = useRef(true);
    const handsFreeRef = useRef(false);
    const speakingRef = useRef(false);
    const busyRef = useRef(false);
    const [busy, setBusy] = useState(false);
    const [input, setInput] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);
    const greeted = useRef(false);
    const recognitionRef = useRef<Recognition | null>(null);
    // Bumped on every speak() call so an utterance that gets cancelled by the
    // next one (say() can fire twice per turn: the reply, then a silent
    // aside) never resumes the microphone on behalf of a reply that never
    // finished playing.
    const speechTokenRef = useRef(0);
    // Set by onerror, read by the onend that always follows it: recognition
    // reports the error and the stop as two separate events.
    const lastErrorRef = useRef<string | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
    }, [turns, busy, interim]);

    // Read after mount, not in the initial state: the server renders this too,
    // and a stored value there would not match what the browser paints.
    // Storage can throw or come back empty (private window, blocked cookies),
    // in which case the assistant simply keeps its voice.
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                if (window.localStorage.getItem(VOICE_KEY) === 'off') {
                    voiceRef.current = false;
                    setVoiceOn(false);
                }
            } catch {
                // no stored preference available; the default stands
            }
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    function toggleVoice() {
        const next = !voiceOn;
        voiceRef.current = next;
        setVoiceOn(next);
        // Silence has to be immediate: muting while a sentence is being spoken
        // and still hearing it out is not muting. Cancelling fires the current
        // utterance's onend, which (via the token check in speak()) picks the
        // microphone back up immediately in hands-free mode - correct, since
        // there is nothing left to echo.
        if (!next && typeof window !== 'undefined') window.speechSynthesis?.cancel();
        try {
            window.localStorage.setItem(VOICE_KEY, next ? 'on' : 'off');
        } catch {
            // the toggle still works for this session
        }
    }

    // Greets on arrival with what is actually waiting, so the first thing the
    // client sees is the state of their work rather than a blank box. Runs once
    // the video list has loaded, hence the dependency on it.
    //
    // Text only: browsers refuse speechSynthesis before the visitor has
    // interacted with the page, so speaking here would be silently dropped. The
    // assistant finds its voice from the first reply onwards.
    useEffect(() => {
        if (greeted.current || loading) return;
        greeted.current = true;

        const pendientes = videos.filter((v) => v.status === 'pendiente_aprobacion').length;
        const generando = videos.filter((v) => v.render_status === 'procesando').length;

        let text: string;
        if (videos.length === 0) {
            text = 'Hola. Soy tu asistente. Dime un tema y te armo el primer video: por ejemplo, "crea un video sobre tasas fijas para TikTok".';
        } else if (pendientes > 0) {
            text = `Hola. Tienes ${pendientes} video${pendientes === 1 ? '' : 's'} esperando tu aprobacion. Nadie mas puede aprobarlos, tienen que pasar por ti. Dime si quieres revisarlos o empezar uno nuevo.`;
        } else if (generando > 0) {
            text = `Hola. Hay ${generando} video${generando === 1 ? '' : 's'} generandose ahora mismo. Mientras tanto puedo empezar otro si me dices el tema.`;
        } else {
            text = `Hola. Tienes ${videos.length} videos guardados. Dime que quieres hacer, o abre uno de la lista para revisarlo.`;
        }
        setTurns([{ who: 'stickman', text }]);
    }, [loading, videos]);

    // Speaks text and reports back through onDone once it is truly finished
    // (or was never spoken at all - unsupported browser, empty string). This
    // is the one hook point for the whole echo trap: recognition must stay
    // suspended until this fires, never a fixed delay.
    function speak(text: string, onDone: () => void) {
        if (typeof window === 'undefined' || !window.speechSynthesis || !text) {
            onDone();
            return;
        }
        const token = ++speechTokenRef.current;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.05;
        const finish = () => {
            // cancel() above also fires onend on whatever it interrupted, so a
            // superseded utterance must not be the one that resumes the mic.
            if (speechTokenRef.current === token) onDone();
        };
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
    }

    function onSpeechEnd() {
        speakingRef.current = false;
        setSpeaking(false);
        maybeResumeListening();
    }

    // The single gate for "should the mic pick itself back up right now",
    // used after a reply, after a silence timeout, and after a mute toggle.
    function maybeResumeListening() {
        if (!handsFreeRef.current || recognitionRef.current || speakingRef.current || busyRef.current) return;
        beginListening();
    }

    function say(text: string, aloud = true) {
        setTurns((current) => [...current, { who: 'stickman', text }]);
        if (aloud && voiceRef.current) {
            speakingRef.current = true;
            setSpeaking(true);
            speak(text, onSpeechEnd);
        } else {
            // Nothing is going to sound, so there is nothing to echo either -
            // hands-free can keep listening right away.
            maybeResumeListening();
        }
    }

    async function send(message: string) {
        const text = message.trim();
        if (!text || busyRef.current) return;

        setInput('');
        const history = [
            ...turns.map((turn) => ({ role: turn.who === 'tu' ? 'user' as const : 'assistant' as const, content: turn.text })),
            { role: 'user' as const, content: text },
        ];
        setTurns((current) => [...current, { who: 'tu', text }]);
        setBusy(true);
        busyRef.current = true;

        try {
            // The copilot runs the tools itself, against the same persistence
            // the panels use, and hands back the record it touched. The browser
            // only does what a server cannot: move the selection and open a file.
            const response = await fetch('/api/copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoId: selected?.id ?? null, messages: history }),
            });
            const data = await response.json() as {
                reply?: string; error?: string;
                video?: VideoRecord | null; created?: boolean; deletedId?: string | null;
                selectId?: string | null; descargarUrl?: string | null; provider?: string | null;
            };
            if (!response.ok) throw new Error(data.error ?? 'El asistente no respondio.');
            setModelo(Boolean(data.provider));

            if (data.deletedId) onDeleted(data.deletedId);
            if (data.video) {
                if (data.created) onCreated(data.video);
                else onUpdated(data.video);
            }
            if (data.selectId) onSelect(data.selectId);
            if (data.descargarUrl) window.open(data.descargarUrl, '_blank', 'noopener');

            // Flipped off before speaking rather than in a finally: a spoken
            // reply can take far longer than the fetch did, and the mic must
            // be free to resume the instant the turn's speech (or the lack of
            // it) says so, not only once this function eventually returns.
            setBusy(false);
            busyRef.current = false;

            say(data.reply ?? 'Hecho.');
            if (!data.provider && modelo !== false) {
                say('Aviso: estoy respondiendo en modo basico, sin modelo de lenguaje. Entiendo ordenes concretas pero no conversacion libre. Se arregla configurando GROQ_API_KEY o OPENROUTER_API_KEY.', false);
            }
        } catch (error) {
            setBusy(false);
            busyRef.current = false;
            say(error instanceof Error ? error.message : 'Algo fallo al ejecutar eso.');
        }
    }

    // Shared by the press-to-talk button and hands-free mode: both are just
    // "start one recognition session", they differ only in continuous and in
    // what happens on onend, which is decided below from handsFreeRef.
    function beginListening() {
        if (recognitionRef.current || busyRef.current || speakingRef.current) return;
        const recognition = getRecognition(handsFreeRef.current);
        if (!recognition) {
            // Kept visible rather than hidden when unsupported: a control that
            // silently does nothing reads as a bug, and the reason is worth
            // saying. Hands-free falls back to the same text field everything
            // else already uses.
            say('Tu navegador no soporta dictado por voz. Prueba en Chrome o Edge, o escribeme.', false);
            if (handsFreeRef.current) {
                handsFreeRef.current = false;
                setHandsFree(false);
            }
            return;
        }

        let handled = false;
        recognition.onresult = (event) => {
            if (handled) return;
            let interimText = '';
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const transcript = result[0]?.transcript ?? '';
                if (result.isFinal) finalText += transcript;
                else interimText += transcript;
            }
            setInterim(interimText);
            const said = finalText.trim();
            if (said) {
                handled = true;
                setInterim('');
                recognition.stop();
                void send(said);
            }
        };
        recognition.onerror = (event) => {
            lastErrorRef.current = event.error ?? null;
        };
        recognition.onend = () => {
            recognitionRef.current = null;
            setListening(false);
            if (!handled) setInterim('');

            const error = lastErrorRef.current;
            lastErrorRef.current = null;

            // A refused microphone says why once and stops - it does not
            // retry itself into a loop of failed permission prompts.
            if (error === 'not-allowed' || error === 'service-not-allowed' || error === 'audio-capture') {
                handsFreeRef.current = false;
                setHandsFree(false);
                say('No puedo usar el microfono: revisa el permiso del navegador o que haya uno conectado. Sigo disponible por escrito.', false);
                return;
            }
            if (error === 'network') {
                handsFreeRef.current = false;
                setHandsFree(false);
                say('Se perdio la conexion del reconocimiento de voz. Sigo disponible por escrito.', false);
                return;
            }

            // Any other end while nothing was captured - a silence timeout, or
            // the browser closing the session on its own - is normal in
            // continuous listening. Pick the mic back up rather than making
            // the operator click again.
            if (!handled) maybeResumeListening();
        };

        recognitionRef.current = recognition;
        setInterim('');
        recognition.start();
        setListening(true);
    }

    function toggleMic() {
        if (handsFreeRef.current) return; // the mic already belongs to hands-free
        if (listening) {
            recognitionRef.current?.stop();
            return;
        }
        beginListening();
    }

    function toggleHandsFree() {
        const next = !handsFree;
        handsFreeRef.current = next;
        setHandsFree(next);
        if (next) {
            // No-ops quietly if a turn is already in flight; the turn's own
            // completion (say -> onSpeechEnd or the silent-aside branch) will
            // pick the mic up as soon as it is free, via maybeResumeListening.
            beginListening();
        } else if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }

    const statusText = speaking
        ? 'Hablando...'
        : listening
        ? (handsFree ? 'Escuchando (manos libres)...' : 'Escuchando...')
        : busy
        ? 'Pensando...'
        : modelo === false
        ? 'Modo basico: sin modelo de lenguaje conectado'
        : voiceOn
        ? 'Hablame o escribeme'
        : 'Voz apagada: te respondo por escrito';

    const micPlaceholder = speaking
        ? 'El asistente esta hablando...'
        : listening
        ? (handsFree ? 'Escuchando en modo manos libres...' : 'Escuchando...')
        : 'Escribe o pulsa el microfono';

    return (
        <section className="glass flex max-h-[34rem] min-h-[24rem] flex-col overflow-hidden rounded-2xl">
            <header className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-192.png" alt="" width={26} height={26} className="rounded-full" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">Asistente</span>
                    <span className="block truncate text-xs text-slate-400">{statusText}</span>
                </span>
                <button
                    type="button"
                    onClick={toggleHandsFree}
                    aria-pressed={handsFree}
                    aria-label={handsFree
                        ? 'Modo manos libres activado: escucha, envia y vuelve a escuchar sola. Pulsa para apagarlo'
                        : 'Activar el modo manos libres: escucha de forma continua sin pulsar el microfono cada vez'}
                    title={handsFree ? 'Manos libres activado' : 'Activar manos libres'}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
                        handsFree
                            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                            : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17 2l4 4-4 4" />
                        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                        <path d="M7 22l-4-4 4-4" />
                        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                    <span>Manos libres</span>
                    {handsFree && (
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${listening ? 'animate-pulse bg-red-400' : 'bg-emerald-400'}`}
                            aria-hidden="true"
                        />
                    )}
                </button>
                <button
                    type="button"
                    onClick={toggleVoice}
                    aria-pressed={!voiceOn}
                    aria-label={voiceOn ? 'Apagar la voz del asistente' : 'Encender la voz del asistente'}
                    title={voiceOn ? 'Apagar la voz: seguira respondiendo por escrito' : 'Encender la voz'}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                        voiceOn ? 'bg-white/10 text-slate-200 hover:bg-white/20' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    }`}
                >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M11 5 6 9H3v6h3l5 4z" />
                        {voiceOn ? (
                            <>
                                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                                <path d="M18.5 5.5a9 9 0 0 1 0 13" />
                            </>
                        ) : (
                            <path d="m16 9 5 6M21 9l-5 6" />
                        )}
                    </svg>
                </button>
                <span className={`h-2 w-2 shrink-0 rounded-full ${
                    speaking ? 'animate-pulse bg-sky-400' : listening ? 'animate-pulse bg-red-400' : busy ? 'bg-amber-400' : 'bg-emerald-400'
                }`} aria-hidden="true" />
            </header>

            <div ref={transcriptRef} className="thin-scroll flex-1 space-y-3 overflow-y-auto p-4">
                {turns.map((turn, index) => (
                    <div
                        key={index}
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            turn.who === 'tu'
                                ? 'ml-auto bg-sky-500/90 text-white'
                                : 'border border-white/10 bg-white/5 text-slate-100'
                        }`}
                    >
                        {turn.text}
                    </div>
                ))}
                {interim && (
                    // What it is hearing right now, not yet sent: dashed so it
                    // reads as provisional next to the solid sent bubbles.
                    <div
                        className="ml-auto max-w-[88%] rounded-2xl border border-dashed border-sky-400/50 bg-sky-500/10 px-3.5 py-2.5 text-sm italic leading-relaxed text-sky-100"
                        aria-label={`Escuchando: ${interim}`}
                    >
                        {interim}
                    </div>
                )}
                {busy && (
                    <div className="max-w-[88%] rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-400">
                        Pensando...
                    </div>
                )}
            </div>

            <form
                onSubmit={(event) => { event.preventDefault(); void send(input); }}
                className="flex items-center gap-2 border-t border-white/10 p-3"
            >
                <button
                    type="button"
                    onClick={toggleMic}
                    disabled={busy || speaking || handsFree}
                    aria-pressed={listening && !handsFree}
                    aria-label={handsFree
                        ? 'Microfono en uso por el modo manos libres'
                        : listening ? 'Escuchando: pulsa para detener' : 'Hablar: pulsa y di lo que necesitas'}
                    title={handsFree ? 'El modo manos libres ya tiene el microfono abierto' : undefined}
                    className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        listening && !handsFree ? 'listening-ring bg-red-500 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    }`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v4" />
                    </svg>
                    <span>{listening && !handsFree ? 'Escuchando' : 'Hablar'}</span>
                </button>
                <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={busy}
                    placeholder={micPlaceholder}
                    aria-label="Mensaje para el asistente"
                    className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="shrink-0 rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:opacity-40"
                >
                    Enviar
                </button>
            </form>
        </section>
    );
}
