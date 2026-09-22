'use client';

import { useState } from 'react';
import type { Platform } from '@shared-types/video';
import { duplicateVideo, transitionStatus, type StatusAction, type VideoRecord } from './api';
import { PLATFORM_LABELS, PLATFORM_OPTIONS } from './constants';
import StatusBadge from './status-badge';

interface StatusPanelProps {
    video: VideoRecord;
    onUpdated: (video: VideoRecord) => void;
    onDuplicated: (video: VideoRecord) => void;
}

export default function StatusPanel({ video, onUpdated, onDuplicated }: StatusPanelProps) {
    const [actionLoading, setActionLoading] = useState<StatusAction | null>(null);
    const [actionError, setActionError] = useState('');

    const otherPlatforms = PLATFORM_OPTIONS.filter((option) => option.value !== video.platform);
    const [duplicatePlatform, setDuplicatePlatform] = useState<Platform>(otherPlatforms[0]?.value ?? video.platform);
    const [duplicating, setDuplicating] = useState(false);
    const [duplicateError, setDuplicateError] = useState('');

    const busy = actionLoading !== null;

    async function runAction(action: StatusAction) {
        setActionLoading(action);
        setActionError('');
        try {
            const updated = await transitionStatus(video.id, action);
            onUpdated(updated);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'No se pudo completar la acción.');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDuplicate() {
        setDuplicating(true);
        setDuplicateError('');
        try {
            const created = await duplicateVideo(video.id, duplicatePlatform);
            onDuplicated(created);
        } catch (err) {
            setDuplicateError(err instanceof Error ? err.message : 'No se pudo duplicar el video.');
        } finally {
            setDuplicating(false);
        }
    }

    return (
        <div className="space-y-4">
            <section className="glass rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Estado y aprobación</h3>
                    <StatusBadge status={video.status} />
                </div>

                {actionError && <p className="mb-3 text-sm text-red-300">{actionError}</p>}

                {video.status === 'borrador' && (
                    <div>
                        <p className="mb-2 text-sm text-slate-300">
                            El video está en borrador. Envíalo a aprobación cuando el guion y las escenas estén listos.
                        </p>
                        <button
                            type="button"
                            onClick={() => runAction('submit')}
                            disabled={busy}
                            className="rounded bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {actionLoading === 'submit' ? 'Enviando...' : 'Enviar a aprobación'}
                        </button>
                    </div>
                )}

                {video.status === 'pendiente_aprobacion' && (
                    <div className="rounded border border-amber-400/30 bg-amber-400/10 p-3">
                        <p className="mb-3 text-sm font-medium text-amber-200">
                            Este video requiere aprobación humana antes de poder generarse o publicarse. Revisa el
                            guion, las escenas y la marca antes de decidir.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => runAction('approve')}
                                disabled={busy}
                                className="rounded bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {actionLoading === 'approve' ? 'Aprobando...' : 'Aprobar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => runAction('reject')}
                                disabled={busy}
                                className="rounded border border-red-400/30 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {actionLoading === 'reject' ? 'Rechazando...' : 'Rechazar y volver a borrador'}
                            </button>
                        </div>
                    </div>
                )}

                {video.status === 'aprobado' && (
                    <div className="space-y-3">
                        <p className="text-sm text-slate-300">El video fue aprobado. Ya puedes generar el archivo final.</p>

                        {video.render_status === 'procesando' ? (
                            <div className="rounded border border-sky-400/25 bg-sky-500/10 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm font-medium text-sky-100">Generando el video...</span>
                                    <span className="font-mono text-sm tabular-nums text-sky-100">{video.render_progress}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded bg-sky-500/20">
                                    <div
                                        className="h-full rounded bg-sky-400 transition-all duration-500"
                                        style={{ width: `${Math.max(2, video.render_progress)}%` }}
                                    />
                                </div>
                                <p className="mt-2 text-xs text-sky-200">
                                    Puedes cerrar esta pantalla: el trabajo sigue en el servidor y el progreso se actualiza solo.
                                </p>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => runAction('render')}
                                disabled={busy}
                                className="rounded bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {actionLoading === 'render' ? 'Enviando...' : video.video_url ? 'Regenerar video final' : 'Generar video'}
                            </button>
                        )}

                        {video.render_status === 'error' && video.render_error && (
                            <div className="rounded border border-red-400/30 bg-red-500/10 p-3">
                                <p className="text-sm font-medium text-red-200">No se pudo generar el video.</p>
                                <p className="mt-1 break-words font-mono text-xs text-red-300">{video.render_error}</p>
                            </div>
                        )}

                        {video.video_url && (
                            <div className="space-y-2 rounded border border-white/10 p-3">
                                <video controls src={video.video_url} className="w-full max-w-xs rounded" />
                                <div className="flex flex-wrap items-center gap-3">
                                    <a href={video.video_url} download className="text-sm font-medium text-sky-300 underline">
                                        Descargar MP4
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => runAction('publish')}
                                        disabled={busy}
                                        className="rounded bg-sky-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {actionLoading === 'publish' ? 'Publicando...' : 'Publicar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {video.status === 'publicado' && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-emerald-300">Este video ya fue publicado.</p>
                        {video.video_url && (
                            <div className="space-y-2 rounded border border-white/10 p-3">
                                <video controls src={video.video_url} className="w-full max-w-xs rounded" />
                                <a href={video.video_url} download className="text-sm font-medium text-sky-300 underline">
                                    Descargar MP4
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="glass rounded-2xl p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Duplicar para otra plataforma</h3>
                <p className="mb-3 text-sm text-slate-300">
                    Reutiliza el guion, las escenas y la marca de este video para crear un nuevo borrador dirigido a
                    otra plataforma. El nuevo video inicia su propio ciclo de aprobación.
                </p>
                {otherPlatforms.length === 0 ? (
                    <p className="text-sm text-slate-400">No hay otras plataformas disponibles.</p>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={duplicatePlatform}
                            onChange={(event) => setDuplicatePlatform(event.target.value as Platform)}
                            disabled={duplicating}
                            className="rounded border border-white/15 px-3 py-2 text-sm focus:border-sky-400/60 focus:outline-none"
                        >
                            {otherPlatforms.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleDuplicate}
                            disabled={duplicating}
                            className="rounded border border-sky-400/50 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {duplicating ? 'Duplicando...' : `Duplicar para ${PLATFORM_LABELS[duplicatePlatform]}`}
                        </button>
                    </div>
                )}
                {duplicateError && <p className="mt-2 text-sm text-red-300">{duplicateError}</p>}
            </section>
        </div>
    );
}
