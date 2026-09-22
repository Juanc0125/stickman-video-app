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

export default function VideoWorkspace({ video, onUpdated, onDuplicated }: VideoWorkspaceProps) {
    if (!video) {
        return (
            <section className="flex min-h-[26rem] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 px-8 py-16 text-center">
                <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-400/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl opacity-90" />
                </span>
                <h2 className="mb-1.5 text-lg font-semibold text-white">Dile al asistente que quieres</h2>
                <p className="mb-6 max-w-sm text-sm leading-relaxed text-slate-400">
                    Habla o escribe en el panel de la izquierda y el se encarga. Tambien puedes abrir
                    cualquier video de la lista para revisarlo a mano.
                </p>
                <ul className="space-y-1.5 text-sm text-slate-500">
                    <li>&ldquo;Crea un video sobre tasas fijas para TikTok&rdquo;</li>
                    <li>&ldquo;Genera las escenas&rdquo;</li>
                    <li>&ldquo;En la escena 2 que el broker camine con una casa&rdquo;</li>
                </ul>
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

            <ScriptPanel video={video} onUpdated={onUpdated} />
            <ScenePanel video={video} onUpdated={onUpdated} />
            <BrandingPanel video={video} onUpdated={onUpdated} />
            <StatusPanel video={video} onUpdated={onUpdated} onDuplicated={onDuplicated} />
        </div>
    );
}
