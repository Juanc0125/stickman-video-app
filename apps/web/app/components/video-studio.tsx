'use client';

import { useEffect, useState } from 'react';
import { fetchVideos, type VideoRecord } from './api';
import VideoList from './video-list';
import VideoWorkspace from './video-workspace';

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

    function handleCreated(video: VideoRecord) {
        setVideos((current) => [video, ...current]);
        setSelectedId(video.id);
    }

    function handleUpdated(video: VideoRecord) {
        setVideos((current) => current.map((entry) => (entry.id === video.id ? video : entry)));
    }

    const selectedVideo = videos.find((video) => video.id === selectedId) ?? null;

    return (
        <main className="mx-auto max-w-6xl px-4 py-8">
            <h1 className="mb-1 text-2xl font-semibold text-gray-900">Video Ads Studio</h1>
            <p className="mb-6 text-sm text-gray-500">
                Genera, revisa, aprueba y publica videos cortos de marketing hipotecario protagonizados por Stickman.
            </p>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
                <VideoList
                    videos={videos}
                    loading={loading}
                    loadError={loadError}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onCreated={handleCreated}
                />
                <VideoWorkspace video={selectedVideo} onUpdated={handleUpdated} onDuplicated={handleCreated} />
            </div>
        </main>
    );
}
