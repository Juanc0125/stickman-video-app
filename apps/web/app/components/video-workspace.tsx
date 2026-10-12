'use client';

import { useCallback, useEffect, useState } from 'react';
import type { SoundAsset } from '@shared-types/sounds';
import { fetchSounds, type VideoRecord } from './api';
import { PLATFORM_LABELS } from './constants';
import StatusBadge from './status-badge';
import ScriptPanel from './script-panel';
import ScenePanel from './scene-panel';
import BrandingPanel from './branding-panel';
import StatusPanel from './status-panel';
import SoundPanel from './sound-panel';
import { LogoMark } from './logo';

interface VideoWorkspaceProps {
    video: VideoRecord | null;
    onUpdated: (video: VideoRecord) => void;
    onDuplicated: (video: VideoRecord) => void;
}

// Only the fields the branding panel copies into its own state.
function brandSignature(video: VideoRecord): string {
    const { primary_color, secondary_color, font_family, logo_position, logo_url } = video.branding;
    return [primary_color, secondary_color, font_family, logo_position, logo_url ?? ''].join('|');
}

export default function VideoWorkspace({ video, onUpdated, onDuplicated }: VideoWorkspaceProps) {
    // RF-010: one sound list for the music picker, the per-scene effect
    // pickers and the business uploads, so a sound uploaded in one place is
    // offered in the others without a second fetch.
    const [sounds, setSounds] = useState<SoundAsset[]>([]);
    const [soundsLoading, setSoundsLoading] = useState(true);
    const [soundsError, setSoundsError] = useState('');

    const loadSounds = useCallback(async () => {
        try {
            setSounds(await fetchSounds());
            setSoundsError('');
        } catch (err) {
            setSoundsError(err instanceof Error ? err.message : 'No se pudieron cargar los sonidos.');
        } finally {
            setSoundsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Deferred by a tick, as in the branding panel: the lint rule cannot
        // tell that state only changes once the fetch resolves.
        const timer = setTimeout(() => { void loadSounds(); }, 0);
        return () => clearTimeout(timer);
    }, [loadSounds]);

    if (!video) {
        return (
            <section className="panel overflow-hidden px-5 py-10 sm:px-8 sm:py-14">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-10 text-center">
                        <LogoMark size={56} className="mx-auto mb-5" />
                        <h2 className="mb-3 text-balance text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                            Convierte un tema en un video listo para publicar
                        </h2>
                        <p className="mx-auto max-w-xl text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
                            Stickman escribe la historia, la reparte en escenas, la narra en español y arma el MP4
                            vertical para Reels, TikTok o Shorts. Tu solo dices el tema.
                        </p>
                    </div>

                    <ol className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { n: '1', t: 'Dices el tema', d: 'Hablas o escribes. Se genera un guion con forma de historia, no un folleto.' },
                            { n: '2', t: 'Se arma en escenas', d: 'Cada escena con su personaje, su accion y su objeto. Puedes editarlas o borrarlas.' },
                            { n: '3', t: 'Tu lo apruebas', d: 'Nada se publica sin que una persona lo revise. El asistente no puede saltarse este paso.' },
                            { n: '4', t: 'Sale el video', d: 'MP4 vertical con voz y subtitulos, listo para descargar o publicar.' },
                        ].map((step) => (
                            <li key={step.n} className="tile p-4">
                                <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/15 font-mono text-xs font-semibold text-brand-200 ring-1 ring-inset ring-brand-400/25">
                                    {step.n}
                                </span>
                                <h3 className="mb-1 text-sm font-semibold text-white">{step.t}</h3>
                                <p className="text-xs leading-relaxed text-slate-400">{step.d}</p>
                            </li>
                        ))}
                    </ol>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="tile p-4">
                            <h3 className="eyebrow mb-3">Pruebalo diciendo</h3>
                            <ul className="space-y-2 text-sm text-slate-200">
                                <li>&ldquo;Crea un video sobre tasas fijas para TikTok&rdquo;</li>
                                <li>&ldquo;Genera las escenas&rdquo;</li>
                                <li>&ldquo;En la escena 2 que el broker camine con una casa&rdquo;</li>
                                <li>&ldquo;Cuantos videos tengo pendientes&rdquo;</li>
                            </ul>
                        </div>
                        <div className="tile p-4">
                            <h3 className="eyebrow mb-3">Tambien puedes</h3>
                            <ul className="space-y-2 text-sm text-slate-200">
                                <li>Editar el guion y cada escena a mano</li>
                                <li>Poner tu logo, tus colores y tu tipografia</li>
                                <li>Reutilizar un video para otra plataforma</li>
                                <li>Descargar el MP4 o publicarlo</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Read-only progress strip: where this video sits in guion -> escenas ->
    // aprobacion -> video. Derived from the record; it has no controls, so it
    // cannot move a video forward on its own (RF-012).
    const approved = video.status === 'aprobado' || video.status === 'publicado';
    const steps = [
        { label: 'Guion', done: video.script.trim() !== '' },
        { label: 'Escenas', done: video.scenes.length > 0 },
        { label: 'Aprobación', done: approved },
        { label: 'Video', done: Boolean(video.video_url) },
    ];

    return (
        <div key={video.id} className="space-y-5">
            <header className="panel panel-pad">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="eyebrow mb-1">Video seleccionado</p>
                        <h2 className="text-balance break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">{video.topic}</h2>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="chip">{PLATFORM_LABELS[video.platform]}</span>
                            <span className="chip tabular-nums">Duración objetivo: {video.target_duration_seconds}s</span>
                            <span className="chip tabular-nums">
                                {video.scenes.length} {video.scenes.length === 1 ? 'escena' : 'escenas'}
                            </span>
                        </div>
                    </div>
                    <StatusBadge status={video.status} />
                </div>
                <ol className="mt-5 grid grid-cols-4 gap-2" aria-label="Avance del video">
                    {steps.map((step, index) => (
                        <li key={step.label} className="min-w-0">
                            <span className={`block h-1.5 rounded-full ${step.done ? 'bg-brand-400' : 'bg-white/[0.08]'}`} aria-hidden="true" />
                            <span className={`mt-1.5 block truncate text-[0.6875rem] font-medium sm:text-xs ${step.done ? 'text-slate-200' : 'text-slate-400'}`}>
                                <span className="sr-only">{step.done ? 'Completado: ' : 'Pendiente: '}</span>
                                {index + 1}. {step.label}
                            </span>
                        </li>
                    ))}
                </ol>
            </header>

            {/* These two panels seed their fields from the record when they
                mount. The copilot can now change the same video from outside,
                so the key gives them fresh initial state when the value they
                show actually changed - without it the textarea keeps the old
                script and the colour pickers the old brand. */}
            <ScriptPanel key={`guion:${video.script}`} video={video} onUpdated={onUpdated} />
            <ScenePanel video={video} sounds={sounds} soundsLoading={soundsLoading} onUpdated={onUpdated} />
            <SoundPanel
                video={video}
                sounds={sounds}
                soundsLoading={soundsLoading}
                soundsError={soundsError}
                onSoundsChanged={setSounds}
                onUpdated={onUpdated}
            />
            <BrandingPanel key={`marca:${brandSignature(video)}`} video={video} onUpdated={onUpdated} />
            <StatusPanel video={video} onUpdated={onUpdated} onDuplicated={onDuplicated} />
        </div>
    );
}
