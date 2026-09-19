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
            <section className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
                Selecciona un video de la lista o crea uno nuevo para comenzar.
            </section>
        );
    }

    return (
        <div key={video.id} className="space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{video.topic}</h2>
                    <p className="text-sm text-gray-500">
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
