'use client';

import { useEffect, useState } from 'react';
import { fetchSession, fetchVideos, logout, type VideoRecord } from './api';
import VideoList from './video-list';
import VideoWorkspace from './video-workspace';
import Assistant from './assistant';
import Logo from './logo';

export default function VideoStudio() {
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Who is signed in, for the header - null for a visitor. The studio is
    // open to anyone (proxy.ts), so a missing session only swaps "Salir" for
    // "Entrar"; it never blocks the page.
    const [email, setEmail] = useState<string | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        fetchVideos()
            .then((loaded) => setVideos(loaded))
            .catch((error) => setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los videos.'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchSession()
            .then((session) => setEmail(session.email))
            .catch(() => undefined);
    }, []);

    async function handleLogout() {
        setLoggingOut(true);
        try {
            await logout();
        } catch {
            // The cookie may already be gone (e.g. expired seconds ago) -
            // either way, the destination is the same.
        }
        // The studio stays open after signing out; reload so every panel
        // drops what it knew about the session.
        window.location.href = '/';
    }

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
            <div aria-hidden="true" className="app-backdrop" />

            <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl backdrop-saturate-150">
                <div className="mx-auto flex h-16 max-w-[112rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
                    <div className="min-w-0 flex-1">
                        <h1 className="sr-only">Stickman Studio</h1>
                        <Logo size={34} tagline="Videos cortos de marketing hipotecario" />
                    </div>

                    <div className="hidden items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.025] p-1 md:flex" aria-label="Resumen">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs text-slate-400">
                            <span className="font-mono text-[0.8125rem] font-semibold tabular-nums text-white">{videos.length}</span>
                            {videos.length === 1 ? 'video' : 'videos'}
                        </span>
                        {rendering > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-medium text-brand-200 ring-1 ring-inset ring-brand-400/25">
                                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-300 opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-300" />
                                </span>
                                {rendering} generando
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 sm:border-l sm:border-white/[0.08] sm:pl-4">
                        {email && (
                            <span className="hidden items-center gap-2.5 lg:flex" title={email}>
                                <span
                                    aria-hidden="true"
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500/30 to-accent-500/25 text-xs font-semibold uppercase text-brand-100 ring-1 ring-inset ring-white/15"
                                >
                                    {email.charAt(0)}
                                </span>
                                <span className="max-w-[12rem] truncate text-xs text-slate-300">{email}</span>
                            </span>
                        )}
                        {email ? (
                            <button
                                type="button"
                                onClick={() => { void handleLogout(); }}
                                disabled={loggingOut}
                                aria-label="Cerrar sesión"
                                className="btn btn-secondary btn-sm"
                            >
                                {loggingOut ? 'Saliendo...' : 'Salir'}
                            </button>
                        ) : null}
                        {/* No "Entrar" button: since 13-oct-2026 nothing needs
                            an account unless REQUIRE_LOGIN is on, and /login is
                            still there for whoever has one. */}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-[112rem] flex-1 px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">
                {/* The assistant leads: it is how the studio is meant to be driven.
                    The panels stay because approving is a deliberate human act and
                    should not be something you can say by accident. */}
                <div className="grid grid-cols-1 items-start gap-5 sm:gap-6 xl:grid-cols-[27rem_minmax(0,1fr)] xl:gap-8">
                    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
                        <Assistant
                            videos={videos}
                            loading={loading}
                            selected={selectedVideo}
                            onCreated={handleCreated}
                            onUpdated={handleUpdated}
                            onSelect={setSelectedId}
                            onDeleted={handleDeleted}
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
                    <div className="min-w-0">
                        <VideoWorkspace video={selectedVideo} onUpdated={handleUpdated} onDuplicated={handleCreated} />
                    </div>
                </div>
            </main>
        </div>
    );
}
