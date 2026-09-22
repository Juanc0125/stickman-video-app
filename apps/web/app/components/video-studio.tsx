'use client';

import { useEffect, useState } from 'react';
import { fetchVideos, type VideoRecord } from './api';
import VideoList from './video-list';
import VideoWorkspace from './video-workspace';
import Assistant from './assistant';

export default function VideoStudio() {
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        fetchVideos()
            .then((loaded) => setVideos(loaded))
            .catch((error) => setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los videos.'))
            .finally(() => setLoading(false));
    }, []);

    // Rendering runs in the background on the worker, which reports progress on
    // the video row - so while anything is rendering, keep refreshing the list.
    const isRendering = videos.some((video) => video.render_status === 'procesando');
    useEffect(() => {
        if (!isRendering) return;
        const timer = setInterval(() => {
            fetchVideos()
                .then((loaded) => setVideos(loaded))
                .catch(() => undefined);
        }, 4000);
        return () => clearInterval(timer);
    }, [isRendering]);

    function handleCreated(video: VideoRecord) {
        setVideos((current) => [video, ...current]);
        setSelectedId(video.id);
    }

    function handleUpdated(video: VideoRecord) {
        setVideos((current) => current.map((entry) => (entry.id === video.id ? video : entry)));
    }

    function handleDeleted(id: string) {
        setVideos((current) => current.filter((entry) => entry.id !== id));
        setSelectedId((current) => (current === id ? null : current));
    }

    const selectedVideo = videos.find((video) => video.id === selectedId) ?? null;

    // flex-1 on the wrapper matters: body is a flex column, so without it the
    // wrapper only grows to fit its content and the page background stops
    // midway down, leaving a bare strip underneath.
    return (
        <div className="flex flex-1 flex-col bg-slate-100">
            <header className="border-b border-slate-200 bg-[#17202a]">
                <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/icon-192.png" alt="" width={40} height={40} className="rounded-lg" />
                    <div>
                        <h1 className="text-lg font-semibold leading-tight text-white">Stickman</h1>
                        <p className="text-xs text-slate-300">
                            Videos cortos de marketing hipotecario
                        </p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
                    <VideoList
                        videos={videos}
                        loading={loading}
                        loadError={loadError}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onCreated={handleCreated}
                        onDeleted={handleDeleted}
                    />
                    <VideoWorkspace video={selectedVideo} onUpdated={handleUpdated} onDuplicated={handleCreated} />
                </div>
            </main>

            <Assistant
                videos={videos}
                selected={selectedVideo}
                onCreated={handleCreated}
                onUpdated={handleUpdated}
            />
        </div>
    );
}
