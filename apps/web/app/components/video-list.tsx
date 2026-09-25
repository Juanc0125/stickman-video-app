'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { VIDEO_TEMPLATES, getTemplate, type VideoTemplate } from '@shared-types/templates';
import type { Platform } from '@shared-types/video';
import {
    createVideo,
    createVideosBatch,
    deleteVideo,
    type BatchCreateFailure,
    type VideoRecord,
} from './api';
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

// RF-024: the same form makes one video or several. A person making one must
// not pay for the batch machinery, so the two paths only share the fields
// that genuinely apply to both (platform, template, duration).
type CreateMode = 'single' | 'batch';

const MAX_BATCH_TOPICS = 8;

interface BatchSummary {
    createdCount: number;
    failed: BatchCreateFailure[];
}

function formatElapsed(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function VideoList({ videos, loading, loadError, selectedId, onSelect, onCreated, onDeleted }: VideoListProps) {
    const [mode, setMode] = useState<CreateMode>('single');
    const [topic, setTopic] = useState('');
    const [batchTopics, setBatchTopics] = useState('');
    const [conEscenas, setConEscenas] = useState(true);
    const [platform, setPlatform] = useState<Platform>('reels');
    const [duration, setDuration] = useState(30);
    const [template, setTemplate] = useState<VideoTemplate>('libre');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [batchElapsed, setBatchElapsed] = useState(0);
    const [batchResult, setBatchResult] = useState<BatchSummary | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const batchTopicsList = batchTopics.split('\n').map((line) => line.trim()).filter(Boolean);
    const batchTopicsCount = batchTopicsList.length;

    // A ticking counter, not a percentage: the server only replies once every
    // topic is done, so this is honest about what we actually know (elapsed
    // time) rather than faking a step-by-step progress bar.
    useEffect(() => {
        if (!submitting || mode !== 'batch') return;
        const timer = setInterval(() => {
            setBatchElapsed((seconds) => seconds + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [submitting, mode]);

    function handleModeChange(next: CreateMode) {
        if (submitting) return;
        setMode(next);
        setFormError('');
        setBatchResult(null);
    }

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

        setSubmitting(true);
        setFormError('');
        try {
            const video = await createVideo(topic.trim(), platform, duration, template);
            setTopic('');
            onCreated(video);
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'No se pudo crear el video.');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleBatchSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (batchTopicsCount === 0) {
            setFormError('Ingresa al menos un tema, uno por línea.');
            return;
        }
        if (batchTopicsCount > MAX_BATCH_TOPICS) {
            setFormError(`Máximo ${MAX_BATCH_TOPICS} temas por lote.`);
            return;
        }
        if (!Number.isFinite(duration) || duration <= 0) {
            setFormError('La duración objetivo debe ser un número positivo.');
            return;
        }

        setSubmitting(true);
        setFormError('');
        setBatchResult(null);
        setBatchElapsed(0);
        try {
            const result = await createVideosBatch(batchTopicsList, platform, duration, template, conEscenas);
            // onCreated both prepends and selects; calling it last-to-first
            // leaves the videos in the order the operator typed them and ends
            // with the first topic selected, per RF-024.
            for (let index = result.creados.length - 1; index >= 0; index -= 1) {
                onCreated(result.creados[index]);
            }
            setBatchResult({ createdCount: result.creados.length, failed: result.fallidos });
            // Leaving only the failed topics in the box makes retrying a single click.
            setBatchTopics(result.fallidos.length > 0 ? result.fallidos.map((f) => f.tema).join('\n') : '');
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'No se pudo crear el lote de videos.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="space-y-4">
            <section className="glass rounded-2xl p-4">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Crear nuevo video</h2>

                <div role="group" aria-label="Modo de creación" className="mb-3 grid grid-cols-2 gap-2 text-sm">
                    <button
                        type="button"
                        aria-pressed={mode === 'single'}
                        onClick={() => handleModeChange('single')}
                        disabled={submitting}
                        className={`rounded px-3 py-1.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            mode === 'single' ? 'bg-sky-500 text-white' : 'border border-white/15 text-slate-300 hover:bg-white/10'
                        }`}
                    >
                        Un video
                    </button>
                    <button
                        type="button"
                        aria-pressed={mode === 'batch'}
                        onClick={() => handleModeChange('batch')}
                        disabled={submitting}
                        className={`rounded px-3 py-1.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            mode === 'batch' ? 'bg-sky-500 text-white' : 'border border-white/15 text-slate-300 hover:bg-white/10'
                        }`}
                    >
                        Varios videos
                    </button>
                </div>

                <form onSubmit={mode === 'single' ? handleSubmit : handleBatchSubmit} className="space-y-3">
                    {mode === 'single' ? (
                        <div>
                            <label className="mb-1 block text-sm font-medium" htmlFor="new-video-topic">Tema</label>
                            <input
                                id="new-video-topic"
                                type="text"
                                value={topic}
                                onChange={(event) => setTopic(event.target.value)}
                                placeholder="Ej. Cómo elegir la mejor tasa hipotecaria"
                                className="w-full rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                                disabled={submitting}
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="mb-1 block text-sm font-medium" htmlFor="new-video-batch-topics">
                                Temas (uno por línea, máximo {MAX_BATCH_TOPICS})
                            </label>
                            <textarea
                                id="new-video-batch-topics"
                                rows={5}
                                value={batchTopics}
                                onChange={(event) => setBatchTopics(event.target.value)}
                                placeholder={'Cómo elegir la mejor tasa hipotecaria\nQué es el enganche\nPrecalificación vs preaprobación'}
                                className="w-full rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                                disabled={submitting}
                            />
                            <p className={`mt-1 text-xs ${batchTopicsCount > MAX_BATCH_TOPICS ? 'text-red-300' : 'text-slate-400'}`}>
                                {batchTopicsCount}/{MAX_BATCH_TOPICS} temas
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium" htmlFor="new-video-platform">Plataforma</label>
                        <select
                            id="new-video-platform"
                            value={platform}
                            onChange={(event) => setPlatform(event.target.value as Platform)}
                            className="w-full rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                            disabled={submitting}
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
                            disabled={submitting}
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
                            disabled={submitting}
                        />
                        {mode === 'batch' && (
                            <p className="mt-1 text-xs text-slate-400">Se aplica a todos los videos del lote.</p>
                        )}
                    </div>

                    {mode === 'batch' && (
                        <div className="flex items-start gap-2">
                            <input
                                id="new-video-con-escenas"
                                type="checkbox"
                                checked={conEscenas}
                                onChange={(event) => setConEscenas(event.target.checked)}
                                disabled={submitting}
                                className="mt-0.5 h-4 w-4 rounded border-white/30 accent-sky-500"
                            />
                            <label htmlFor="new-video-con-escenas" className="text-sm">
                                Generar escenas automáticamente
                                <span className="block text-xs text-slate-400">
                                    Recomendado: un borrador con escenas ya se puede revisar. Sin esto habría que generarlas después, una por una.
                                </span>
                            </label>
                        </div>
                    )}

                    {formError && <p className="text-sm text-red-300">{formError}</p>}

                    {mode === 'batch' && submitting && (
                        <div className="flex items-center gap-2 rounded border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200" aria-live="polite">
                            <span className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-white/20 border-t-sky-300" aria-hidden="true" />
                            <span>
                                Creando {batchTopicsList.length} videos con IA. Esto puede tardar varios minutos porque cada uno es al menos una llamada al modelo — no cierres esta pantalla.
                                {' '}
                                <span className="font-mono text-sky-300">{formatElapsed(batchElapsed)}</span>
                            </span>
                        </div>
                    )}

                    {mode === 'batch' && batchResult && !submitting && (
                        <div className="space-y-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-xs">
                            <p className="text-slate-200">
                                Se crearon {batchResult.createdCount} de {batchResult.createdCount + batchResult.failed.length} videos.
                            </p>
                            {batchResult.failed.length > 0 && (
                                <>
                                    <ul className="space-y-1 text-amber-300">
                                        {batchResult.failed.map((failure, index) => (
                                            <li key={`${failure.tema}-${index}`}>
                                                <span className="font-medium">&quot;{failure.tema}&quot;</span>: {failure.error}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-slate-400">Esos temas quedaron arriba para reintentarlos.</p>
                                </>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || (mode === 'batch' && (batchTopicsCount === 0 || batchTopicsCount > MAX_BATCH_TOPICS))}
                        className="w-full rounded bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {mode === 'single'
                            ? (submitting ? 'Generando guion con IA...' : 'Crear video')
                            : (submitting
                                ? 'Creando videos...'
                                : `Crear ${batchTopicsCount || ''} video${batchTopicsCount === 1 ? '' : 's'}`.trim())}
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
