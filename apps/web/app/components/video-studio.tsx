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
    const rendering = videos.filter((v) => v.render_status === 'procesando').length;

    return (
        <div className="relative flex flex-1 flex-col">
            {/* Fixed so the art stays put while the panels scroll over it. */}
            <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#0a0f18]">
                <div
                    className="backdrop-layer absolute inset-0 bg-cover bg-center opacity-90"
                    style={{ backgroundImage: 'url(/backdrop/space.jpg)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f18]/30 via-transparent to-[#0a0f18]/85" />
            </div>

            <header className="glass-strong sticky top-0 z-20 border-b border-white/10">
                <div className="mx-auto flex max-w-[110rem] items-center gap-3 px-5 py-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 ring-1 ring-sky-400/25">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/icons/icon-192.png" alt="" width={30} height={30} className="rounded-lg" />
                    </span>
                    <div className="flex-1">
                        <h1 className="text-base font-semibold leading-tight tracking-tight text-white">Stickman</h1>
                        <p className="text-xs text-slate-400">Videos cortos de marketing hipotecario</p>
                    </div>
                    <div className="hidden items-center gap-4 text-xs text-slate-400 sm:flex">
                        <span><span className="font-mono text-base text-white">{videos.length}</span> videos</span>
                        {rendering > 0 && (
                            <span className="flex items-center gap-1.5 text-sky-300">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                                {rendering} generando
                            </span>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-[110rem] flex-1 px-5 pb-10 pt-5">
                {/* The assistant leads: it is how the studio is meant to be driven.
                    The panels stay because approving is a deliberate human act and
                    should not be something you can say by accident. */}
                <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[26rem_1fr]">
                    <div className="flex flex-col gap-5">
                        <Assistant
                            videos={videos}
                            loading={loading}
                            selected={selectedVideo}
                            onCreated={handleCreated}
                            onUpdated={handleUpdated}
                        />
                        <VideoList
                            videos={videos}
                            loading={loading}
                            loadError={loadError}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onCreated={handleCreated}
                            onDeleted={handleDeleted}
                        />
                    </div>
                    <VideoWorkspace video={selectedVideo} onUpdated={handleUpdated} onDuplicated={handleCreated} />
                </div>
            </main>
        </div>
    );
}
