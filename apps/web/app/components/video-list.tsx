'use client';

import { useState, type FormEvent } from 'react';
import type { Platform } from '@shared-types/video';
import { createVideo, type VideoRecord } from './api';
import { PLATFORM_LABELS, PLATFORM_OPTIONS } from './constants';
import StatusBadge from './status-badge';

interface VideoListProps {
    videos: VideoRecord[];
    loading: boolean;
    loadError: string;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCreated: (video: VideoRecord) => void;
}

export default function VideoList({ videos, loading, loadError, selectedId, onSelect, onCreated }: VideoListProps) {
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState<Platform>('reels');
    const [duration, setDuration] = useState(30);
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState('');

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!topic.trim()) {
            setFormError('El tema es obligatorio.');
            return;
        }
        if (!Number.isFinite(duration) || duration <= 0) {
            setFormError('La duración objetivo debe ser un número positivo.');
            return;
        }

        setCreating(true);
        setFormError('');
        try {
            const video = await createVideo(topic.trim(), platform, duration);
            setTopic('');
            onCreated(video);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'No se pudo crear el video.');
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Crear nuevo video</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="new-video-topic">Tema</label>
                        <input
                            id="new-video-topic"
                            type="text"
                            value={topic}
                            onChange={(event) => setTopic(event.target.value)}
                            placeholder="Ej. Cómo elegir la mejor tasa hipotecaria"
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                            disabled={creating}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="new-video-platform">Plataforma</label>
                        <select
                            id="new-video-platform"
                            value={platform}
                            onChange={(event) => setPlatform(event.target.value as Platform)}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                            disabled={creating}
                        >
                            {PLATFORM_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="new-video-duration">Duración objetivo (segundos)</label>
                        <input
                            id="new-video-duration"
                            type="number"
                            min={5}
                            step={1}
                            value={duration}
                            onChange={(event) => setDuration(Number(event.target.value))}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                            disabled={creating}
                        />
                    </div>
                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                    <button
                        type="submit"
                        disabled={creating}
                        className="w-full rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {creating ? 'Generando guion con IA...' : 'Crear video'}
                    </button>
                </form>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Videos</h2>
                {loading && <p className="text-sm text-gray-500">Cargando videos...</p>}
                {loadError && <p className="text-sm text-red-600">{loadError}</p>}
                {!loading && !loadError && videos.length === 0 && (
                    <p className="text-sm text-gray-500">Aún no hay videos. Crea el primero arriba.</p>
                )}
                <ul className="space-y-2">
                    {videos.map((video) => (
                        <li key={video.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(video.id)}
                                className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                                    video.id === selectedId ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <div className="font-medium line-clamp-1">{video.topic}</div>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                    <span className="text-xs text-gray-500">{PLATFORM_LABELS[video.platform]}</span>
                                    <StatusBadge status={video.status} />
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
