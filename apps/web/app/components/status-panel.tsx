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
            <section className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Estado y aprobación</h3>
                    <StatusBadge status={video.status} />
                </div>

                {actionError && <p className="mb-3 text-sm text-red-600">{actionError}</p>}

                {video.status === 'borrador' && (
                    <div>
                        <p className="mb-2 text-sm text-gray-600">
                            El video está en borrador. Envíalo a aprobación cuando el guion y las escenas estén listos.
                        </p>
                        <button
                            type="button"
                            onClick={() => runAction('submit')}
                            disabled={busy}
                            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {actionLoading === 'submit' ? 'Enviando...' : 'Enviar a aprobación'}
                        </button>
                    </div>
                )}

                {video.status === 'pendiente_aprobacion' && (
                    <div className="rounded border border-amber-300 bg-amber-50 p-3">
                        <p className="mb-3 text-sm font-medium text-amber-900">
                            Este video requiere aprobación humana antes de poder generarse o publicarse. Revisa el
                            guion, las escenas y la marca antes de decidir.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => runAction('approve')}
                                disabled={busy}
                                className="rounded bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {actionLoading === 'approve' ? 'Aprobando...' : 'Aprobar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => runAction('reject')}
                                disabled={busy}
                                className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {actionLoading === 'reject' ? 'Rechazando...' : 'Rechazar y volver a borrador'}
                            </button>
                        </div>
                    </div>
                )}

                {video.status === 'aprobado' && (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-600">El video fue aprobado. Ya puedes generar el archivo final.</p>
                        <button
                            type="button"
                            onClick={() => runAction('render')}
                            disabled={busy}
                            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {actionLoading === 'render' ? 'Generando video...' : video.video_url ? 'Regenerar video final' : 'Generar video'}
                        </button>

                        {video.video_url && (
                            <div className="space-y-2 rounded border border-gray-200 p-3">
                                <video controls src={video.video_url} className="w-full max-w-xs rounded" />
                                <div className="flex flex-wrap items-center gap-3">
                                    <a href={video.video_url} download className="text-sm font-medium text-blue-700 underline">
                                        Descargar MP4
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => runAction('publish')}
                                        disabled={busy}
                                        className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                        <p className="text-sm font-medium text-green-700">Este video ya fue publicado.</p>
                        {video.video_url && (
                            <div className="space-y-2 rounded border border-gray-200 p-3">
                                <video controls src={video.video_url} className="w-full max-w-xs rounded" />
                                <a href={video.video_url} download className="text-sm font-medium text-blue-700 underline">
                                    Descargar MP4
                                </a>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Duplicar para otra plataforma</h3>
                <p className="mb-3 text-sm text-gray-600">
                    Reutiliza el guion, las escenas y la marca de este video para crear un nuevo borrador dirigido a
                    otra plataforma. El nuevo video inicia su propio ciclo de aprobación.
                </p>
                {otherPlatforms.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay otras plataformas disponibles.</p>
                ) : (
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={duplicatePlatform}
                            onChange={(event) => setDuplicatePlatform(event.target.value as Platform)}
                            disabled={duplicating}
                            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                        >
                            {otherPlatforms.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={handleDuplicate}
                            disabled={duplicating}
                            className="rounded border border-gray-900 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {duplicating ? 'Duplicando...' : `Duplicar para ${PLATFORM_LABELS[duplicatePlatform]}`}
                        </button>
                    </div>
                )}
                {duplicateError && <p className="mt-2 text-sm text-red-600">{duplicateError}</p>}
            </section>
        </div>
    );
}
