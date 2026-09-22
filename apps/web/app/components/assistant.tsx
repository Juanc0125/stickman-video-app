'use client';

import { useEffect, useRef, useState } from 'react';
import {
    createVideo, generateScenes, generateVoice, transitionStatus, updateScene,
    type VideoRecord,
} from './api';

interface AssistantProps {
    videos: VideoRecord[];
    selected: VideoRecord | null;
    onCreated: (video: VideoRecord) => void;
    onUpdated: (video: VideoRecord) => void;
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

function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
}

export default function Assistant({ videos, selected, onCreated, onUpdated }: AssistantProps) {
    const [open, setOpen] = useState(false);
    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [input, setInput] = useState('');
    const [turns, setTurns] = useState<Turn[]>([
        { who: 'stickman', text: 'Dime que quieres hacer. Por ejemplo: crea un video sobre tasas fijas para TikTok.' },
    ]);
    const recognitionRef = useRef<Recognition | null>(null);
    const transcriptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
    }, [turns, busy]);

    function say(text: string, aloud = true) {
        setTurns((current) => [...current, { who: 'stickman', text }]);
        if (aloud) speak(text);
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
            const video = await createVideo(String(action.topic), action.platform as VideoRecord['platform'], Number(action.durationSeconds));
            onCreated(video);
            return `Listo, cree "${video.topic}". Dime si quieres que genere las escenas.`;
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

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Abrir asistente"
                className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#17202a] text-white shadow-lg transition hover:scale-105"
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="" width={38} height={38} className="rounded-full" />
            </button>
        );
    }

    return (
        <div className="fixed bottom-5 right-5 z-40 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl">
            <header className="flex items-center gap-2 bg-[#17202a] px-3 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="" width={26} height={26} className="rounded" />
                <span className="flex-1 text-sm font-semibold text-white">Asistente Stickman</span>
                <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar asistente" className="rounded px-2 py-0.5 text-slate-300 transition hover:bg-white/10 hover:text-white">×</button>
            </header>

            <div ref={transcriptRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
                {turns.map((turn, index) => (
                    <div
                        key={index}
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            turn.who === 'tu' ? 'ml-auto bg-[#17202a] text-white' : 'bg-white text-slate-800 shadow-sm'
                        }`}
                    >
                        {turn.text}
                    </div>
                ))}
                {busy && <div className="max-w-[85%] rounded-lg bg-white px-3 py-2 text-sm text-slate-400 shadow-sm">Pensando...</div>}
            </div>

            <form
                onSubmit={(event) => { event.preventDefault(); void send(input); }}
                className="flex items-center gap-2 border-t border-slate-200 p-2"
            >
                <button
                        type="button"
                        onClick={toggleMic}
                        disabled={busy}
                        aria-label={listening ? 'Dejar de escuchar' : 'Hablar'}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 ${
                            listening ? 'animate-pulse bg-red-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
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
                    className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    className="shrink-0 rounded bg-[#17202a] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-40"
                >
                    Enviar
                </button>
            </form>
        </div>
    );
}
