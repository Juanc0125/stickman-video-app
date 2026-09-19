'use client';

import { useEffect, useState } from 'react';
import type { Video } from '@shared-types/video';

export default function VideoStudio() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/videos')
            .then((response) => response.json())
            .then((data: { videos?: Video[] }) => setVideos(data.videos ?? []))
            .catch(() => setError('No se pudieron cargar los videos.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main>
            <h1>Video Ads Studio — en reconstrucción</h1>
            {loading && <p>Cargando videos...</p>}
            {error && <p>{error}</p>}
            {!loading && !error && (
                <ul>
                    {videos.map((video) => (
                        <li key={video.id}>
                            {video.id} — {video.topic} — {video.status}
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
