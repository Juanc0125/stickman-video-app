'use client';

import { useEffect, useRef, useState } from 'react';
import { getTemplate } from '@shared-types/templates';
import {
    createVideo, deleteScene, deleteVideo, duplicateVideo, generateScenes, generateVoice,
    transitionStatus, updateBranding, updateScene,
    type VideoRecord,
} from './api';
import { PLATFORM_LABELS, STATUS_LABELS } from './constants';

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
type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
    lang: string; continuous: boolean; interimResults: boolean;
    start: () => void; stop: () => void;
    onresult: ((event: SpeechResultEvent) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
};

function getRecognition(): Recognition | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return null;
    const recognition = new Ctor();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    return recognition;
}

const VOICE_KEY = 'stickman:voz';

function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
}

export default function Assistant({ videos, loading, selected, onCreated, onUpdated, onSelect, onDeleted }: AssistantProps) {
    const [listening, setListening] = useState(false);
    // Whether the assistant answers out loud. Kept in a ref as well because a
    // reply can land after the user has already hit mute, and the ref is what
    // the reply reads.
    const [voiceOn, setVoiceOn] = useState(true);
    const voiceRef = useRef(true);
    const [busy, setBusy] = useState(false);
    const [input, setInput] = useState('');
    const [turns, setTurns] = useState<Turn[]>([]);
    const greeted = useRef(false);
    const recognitionRef = useRef<Recognition | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
    }, [turns, busy]);

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
        // and still hearing it out is not muting.
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

    function say(text: string, aloud = true) {
        setTurns((current) => [...current, { who: 'stickman', text }]);
        if (aloud && voiceRef.current) speak(text);
    }

    async function runAction(action: Record<string, unknown>, spoken: string): Promise<string> {
        const kind = action.kind as string;

        if (kind === 'listar') {
            const counts = videos.reduce<Record<string, number>>((acc, v) => {
                acc[v.status] = (acc[v.status] ?? 0) + 1;
                return acc;
            }, {});
            const detalle = Object.entries(counts).map(([k, v]) => `${v} en ${k.replace('_', ' ')}`).join(', ');
            return videos.length === 0 ? 'No hay videos todavia.' : `Hay ${videos.length} videos: ${detalle}.`;
        }

        if (kind === 'crear') {
            const template = getTemplate(action.template);
            const video = await createVideo(
                String(action.topic),
                action.platform as VideoRecord['platform'],
                Number(action.durationSeconds),
                template.id,
            );
            onCreated(video);
            const conPlantilla = template.id === 'libre' ? '' : ` en formato ${template.label.toLowerCase()}`;
            return `Listo, cree "${video.topic}"${conPlantilla}. Dime si quieres que genere las escenas.`;
        }

        if (kind === 'abrir') {
            const query = String(action.query ?? '').trim().toLowerCase();
            if (videos.length === 0) return 'Todavia no hay videos. Dime un tema y te creo el primero.';

            // Ordered the way the list shows them, so "el primero" means the
            // first one the user sees.
            let target: VideoRecord | undefined;
            const numero = query.match(/(\d{1,2})/);
            if (/ultimo|último/.test(query)) target = videos[videos.length - 1];
            else if (/primero|primer/.test(query)) target = videos[0];
            else if (numero) target = videos[Number(numero[1]) - 1];
            if (!target && query) {
                const words = query.split(/\s+/).filter((word) => word.length > 3);
                target = videos.find((video) => words.some((word) => video.topic.toLowerCase().includes(word)));
            }
            if (!target) return `No encontre ese video. Tienes: ${videos.map((v) => v.topic).join(', ')}.`;

            onSelect(target.id);
            return `Abri "${target.topic}". Esta en ${STATUS_LABELS[target.status].toLowerCase()}, con ${target.scenes.length} escenas.`;
        }

        if (!selected) return 'Primero abre un video de la lista, o dime que cree uno.';

        if (kind === 'generar_escenas') {
            const updated = await generateScenes(selected.id);
            onUpdated(updated);
            return `Genere ${updated.scenes.length} escenas.`;
        }

        if (kind === 'generar_voz') {
            const result = await generateVoice(selected.id);
            onUpdated(result.video);
            return result.ttsConfigured ? 'Voz generada.' : 'La voz en la nube no esta configurada, pero el render narra igual con la voz local.';
        }

        if (kind === 'editar_escena') {
            const numero = Number(action.sceneNumber);
            const scene = [...selected.scenes].sort((a, b) => a.order - b.order)[numero - 1];
            if (!scene) return `Ese video solo tiene ${selected.scenes.length} escenas.`;
            const patch: Record<string, unknown> = {};
            for (const key of ['character', 'action', 'prop'] as const) {
                if (action[key]) patch[key] = action[key];
            }
            if (Object.keys(patch).length === 0) return 'No entendi que cambiar de esa escena.';
            onUpdated(await updateScene(selected.id, scene.id, patch));
            return `Escena ${numero} actualizada.`;
        }

        if (kind === 'estado') {
            const partes = [`"${selected.topic}" esta en ${STATUS_LABELS[selected.status].toLowerCase()}`];
            partes.push(selected.scenes.length ? `con ${selected.scenes.length} escenas` : 'todavia sin escenas');
            if (selected.render_status === 'procesando') partes.push(`generandose al ${selected.render_progress} por ciento`);
            else if (selected.render_status === 'error') partes.push('con un error en la ultima generacion');
            else if (selected.video_url) partes.push('con el MP4 ya listo');
            const falta = selected.scenes.length === 0 ? ' Falta generar las escenas.'
                : selected.status === 'borrador' ? ' Falta que lo envies a aprobacion.'
                : selected.status === 'pendiente_aprobacion' ? ' Falta que una persona lo apruebe.'
                : selected.status === 'aprobado' && !selected.video_url ? ' Falta generar el video.'
                : '';
            return `${partes.join(', ')}.${falta}`;
        }

        if (kind === 'borrar_escena') {
            const numero = Number(action.sceneNumber);
            const scene = [...selected.scenes].sort((a, b) => a.order - b.order)[numero - 1];
            if (!scene) return `Ese video solo tiene ${selected.scenes.length} escenas.`;
            onUpdated(await deleteScene(selected.id, scene.id));
            return `Borre la escena ${numero}. Las demas se renumeraron.`;
        }

        if (kind === 'marca') {
            const patch = (action.patch ?? {}) as Record<string, string>;
            if (Object.keys(patch).length === 0) return 'No entendi que cambiar de la marca.';
            onUpdated(await updateBranding(selected.id, patch));
            const dicho: string[] = [];
            if (patch.primary_color) dicho.push('el color primario');
            if (patch.secondary_color) dicho.push('el color secundario');
            if (patch.font_family) dicho.push('la tipografia');
            if (patch.logo_position) dicho.push('la posicion del logo');
            return `Cambie ${dicho.join(' y ')} de este video.`;
        }

        if (kind === 'duplicar') {
            const platform = action.platform as VideoRecord['platform'];
            const copia = await duplicateVideo(selected.id, platform);
            onCreated(copia);
            return `Duplique el video para ${PLATFORM_LABELS[platform]}. La copia arranca como borrador y necesita su propia aprobacion.`;
        }

        if (kind === 'descargar') {
            if (!selected.video_url) return 'Ese video todavia no tiene MP4. Hay que aprobarlo y generarlo primero.';
            window.open(selected.video_url, '_blank', 'noopener');
            return 'Te abri el MP4 en otra pestana.';
        }

        if (kind === 'borrar_video') {
            // Destructive and irreversible, so it asks even when spoken.
            const confirmado = window.confirm(`Se eliminara "${selected.topic}" y todas sus escenas. Continuar?`);
            if (!confirmado) return 'Lo deje como estaba.';
            await deleteVideo(selected.id);
            onDeleted(selected.id);
            return `Elimine "${selected.topic}".`;
        }

        if (kind === 'enviar_aprobacion') {
            onUpdated(await transitionStatus(selected.id, 'submit'));
            return 'Enviado a aprobacion. Alguien tiene que revisarlo antes de publicar.';
        }

        if (kind === 'renderizar') {
            if (selected.status !== 'aprobado') {
                return 'Todavia no puedo generarlo: el video tiene que estar aprobado por una persona.';
            }
            onUpdated(await transitionStatus(selected.id, 'render'));
            return 'Arranque la generacion. Te aviso el avance en el panel de estado.';
        }

        return spoken || 'Hecho.';
    }

    async function send(message: string) {
        const text = message.trim();
        if (!text || busy) return;

        setInput('');
        setTurns((current) => [...current, { who: 'tu', text }]);
        setBusy(true);

        try {
            const counts = videos.reduce<Record<string, number>>((acc, v) => {
                acc[v.status] = (acc[v.status] ?? 0) + 1;
                return acc;
            }, {});
            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    context: {
                        total: videos.length,
                        porEstado: counts,
                        seleccionado: selected && {
                            topic: selected.topic, status: selected.status,
                            scenes: selected.scenes.length, renderStatus: selected.render_status,
                        },
                    },
                }),
            });
            if (!response.ok) throw new Error('El asistente no respondio.');
            const data = await response.json() as { reply: string; action: Record<string, unknown> };

            const result = await runAction(data.action, data.reply);
            say(data.reply && data.action.kind === 'responder' ? data.reply : result);
        } catch (error) {
            say(error instanceof Error ? error.message : 'Algo fallo al ejecutar eso.');
        } finally {
            setBusy(false);
        }
    }

    function toggleMic() {
        if (listening) {
            recognitionRef.current?.stop();
            return;
        }
        const recognition = getRecognition();
        if (!recognition) {
            // Kept visible rather than hidden when unsupported: a button that
            // silently disappears reads as a bug, and the reason is worth saying.
            say('Tu navegador no soporta dictado por voz. Prueba en Chrome o Edge, o escribeme.', false);
            return;
        }
        recognitionRef.current = recognition;
        recognition.onresult = (event) => {
            const said = event.results[0]?.[0]?.transcript ?? '';
            if (said) void send(said);
        };
        recognition.onerror = () => setListening(false);
        recognition.onend = () => setListening(false);
        recognition.start();
        setListening(true);
    }

    return (
        <section className="glass flex max-h-[34rem] min-h-[24rem] flex-col overflow-hidden rounded-2xl">
            <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-192.png" alt="" width={26} height={26} className="rounded-full" />
                </span>
                <span className="flex-1">
                    <span className="block text-sm font-semibold text-white">Asistente</span>
                    <span className="block text-xs text-slate-400">
                        {listening ? 'Escuchando...' : busy ? 'Pensando...' : voiceOn ? 'Hablame o escribeme' : 'Voz apagada: te respondo por escrito'}
                    </span>
                </span>
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
                <span className={`h-2 w-2 rounded-full ${busy ? 'bg-amber-400' : 'bg-emerald-400'}`} aria-hidden="true" />
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
                        disabled={busy}
                        aria-label={listening ? 'Dejar de escuchar' : 'Hablar'}
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                            listening ? 'listening-ring bg-red-500 text-white' : 'bg-white/10 text-slate-200 hover:bg-white/20'
                        }`}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v4" />
                        </svg>
                    </button>
                <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    disabled={busy}
                    placeholder={listening ? 'Escuchando...' : 'Escribe o pulsa el microfono'}
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
