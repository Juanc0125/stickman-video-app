'use client';

import { useState, type FormEvent } from 'react';
import { VIDEO_TEMPLATES, getTemplate, type VideoTemplate } from '@shared-types/templates';
import type { Platform } from '@shared-types/video';
import { createVideo, deleteVideo, type VideoRecord } from './api';
import { PLATFORM_LABELS, PLATFORM_OPTIONS } from './constants';
import StatusBadge from './status-badge';

interface VideoListProps {
    videos: VideoRecord[];
    loading: boolean;
    loadError: string;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onCreated: (video: VideoRecord) => void;
    onDeleted: (id: string) => void;
}

export default function VideoList({ videos, loading, loadError, selectedId, onSelect, onCreated, onDeleted }: VideoListProps) {
    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState<Platform>('reels');
    const [duration, setDuration] = useState(30);
    const [template, setTemplate] = useState<VideoTemplate>('libre');
    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState('');

    async function handleDelete(video: VideoRecord) {
        const confirmed = window.confirm(
            `Se eliminara "${video.topic}" y todas sus escenas. Esta accion no se puede deshacer. Continuar?`,
        );
        if (!confirmed) return;

        setDeletingId(video.id);
        setDeleteError('');
        try {
            await deleteVideo(video.id);
            onDeleted(video.id);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el video.');
        } finally {
            setDeletingId(null);
        }
    }

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
            const video = await createVideo(topic.trim(), platform, duration, template);
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
            <section className="glass rounded-2xl p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Crear nuevo video</h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="new-video-topic">Tema</label>
                        <input
                            id="new-video-topic"
                            type="text"
                            value={topic}
                            onChange={(event) => setTopic(event.target.value)}
                            placeholder="Ej. Cómo elegir la mejor tasa hipotecaria"
                            className="w-full rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                            disabled={creating}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="new-video-platform">Plataforma</label>
                        <select
                            id="new-video-platform"
                            value={platform}
                            onChange={(event) => setPlatform(event.target.value as Platform)}
                            className="w-full rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                            disabled={creating}
                        >
                            {PLATFORM_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="new-video-template">Plantilla</label>
                        <select
                            id="new-video-template"
                            value={template}
                            onChange={(event) => setTemplate(event.target.value as VideoTemplate)}
                            className="w-full rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                            disabled={creating}
                        >
                            {VIDEO_TEMPLATES.map((option) => (
                                <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-slate-400">{getTemplate(template).description}</p>
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
                            className="w-full rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                            disabled={creating}
                        />
                    </div>
                    {formError && <p className="text-sm text-red-300">{formError}</p>}
                    <button
                        type="submit"
                        disabled={creating}
                        className="w-full rounded bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {creating ? 'Generando guion con IA...' : 'Crear video'}
                    </button>
                </form>
            </section>

            <section className="glass rounded-2xl p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Videos</h2>
                {loading && <p className="text-sm text-slate-400">Cargando videos...</p>}
                {loadError && <p className="text-sm text-red-300">{loadError}</p>}
                {!loading && !loadError && videos.length === 0 && (
                    <p className="text-sm text-slate-400">Aún no hay videos. Crea el primero arriba.</p>
                )}
                {deleteError && <p className="mb-2 text-sm text-red-300">{deleteError}</p>}
                <ul className="space-y-2">
                    {videos.map((video) => (
                        <li
                            key={video.id}
                            className={`group relative rounded border transition ${
                                video.id === selectedId ? 'border-sky-400/50 bg-white/5' : 'border-white/10 hover:bg-white/10'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={() => onSelect(video.id)}
                                className="w-full px-3 py-2 pr-10 text-left text-sm"
                            >
                                <div className="font-medium line-clamp-1">{video.topic}</div>
                                <div className="mt-1 flex items-center justify-between gap-2">
                                    <span className="text-xs text-slate-400">{PLATFORM_LABELS[video.platform]}</span>
                                    <StatusBadge status={video.status} />
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(video)}
                                disabled={deletingId === video.id}
                                aria-label={`Eliminar ${video.topic}`}
                                title="Eliminar video"
                                className="absolute right-1.5 top-1.5 rounded p-1.5 text-slate-500 transition hover:bg-red-500/15 hover:text-red-300 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100"
                            >
                                {deletingId === video.id ? (
                                    <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-red-600" />
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
                                    </svg>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
