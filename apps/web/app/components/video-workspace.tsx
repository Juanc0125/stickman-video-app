'use client';

import type { VideoRecord } from './api';
import { PLATFORM_LABELS } from './constants';
import StatusBadge from './status-badge';
import ScriptPanel from './script-panel';
import ScenePanel from './scene-panel';
import BrandingPanel from './branding-panel';
import StatusPanel from './status-panel';

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
    if (!video) {
        return (
            <section className="rounded-2xl border border-dashed border-white/12 px-8 py-12">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-10 text-center">
                        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-400/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl opacity-90" />
                        </span>
                        <h2 className="mb-2 text-xl font-semibold text-white">Convierte un tema en un video listo para publicar</h2>
                        <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-400">
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
                            <li key={step.n} className="glass rounded-xl p-4">
                                <span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-xs text-sky-300">
                                    {step.n}
                                </span>
                                <h3 className="mb-1 text-sm font-semibold text-white">{step.t}</h3>
                                <p className="text-xs leading-relaxed text-slate-400">{step.d}</p>
                            </li>
                        ))}
                    </ol>

                    <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Pruebalo diciendo</h3>
                            <ul className="space-y-1.5 text-sm text-slate-300">
                                <li>&ldquo;Crea un video sobre tasas fijas para TikTok&rdquo;</li>
                                <li>&ldquo;Genera las escenas&rdquo;</li>
                                <li>&ldquo;En la escena 2 que el broker camine con una casa&rdquo;</li>
                                <li>&ldquo;Cuantos videos tengo pendientes&rdquo;</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Tambien puedes</h3>
                            <ul className="space-y-1.5 text-sm text-slate-300">
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

    return (
        <div key={video.id} className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3 glass rounded-2xl p-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">{video.topic}</h2>
                    <p className="text-sm text-slate-400">
                        {PLATFORM_LABELS[video.platform]} · Duración objetivo: {video.target_duration_seconds}s
                    </p>
                </div>
                <StatusBadge status={video.status} />
            </header>

            {/* These two panels seed their fields from the record when they
                mount. The copilot can now change the same video from outside,
                so the key gives them fresh initial state when the value they
                show actually changed - without it the textarea keeps the old
                script and the colour pickers the old brand. */}
            <ScriptPanel key={`guion:${video.script}`} video={video} onUpdated={onUpdated} />
            <ScenePanel video={video} onUpdated={onUpdated} />
            <BrandingPanel key={`marca:${brandSignature(video)}`} video={video} onUpdated={onUpdated} />
            <StatusPanel video={video} onUpdated={onUpdated} onDuplicated={onDuplicated} />
        </div>
    );
}
