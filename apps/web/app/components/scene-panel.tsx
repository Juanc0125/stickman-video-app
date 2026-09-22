'use client';

import { useState } from 'react';
import type { CharacterType, Scene, SceneAction, ScenePropType } from '@shared-types/video';
import { generateScenes, generateVoice, regenerateScene, updateScene, type ScenePatch, type VideoRecord } from './api';
import { ACTION_OPTIONS, CHARACTER_OPTIONS, PROP_OPTIONS } from './constants';

interface ScenePanelProps {
    video: VideoRecord;
    onUpdated: (video: VideoRecord) => void;
}

export default function ScenePanel({ video, onUpdated }: ScenePanelProps) {
    const [generatingAll, setGeneratingAll] = useState(false);
    const [generatingVoice, setGeneratingVoice] = useState(false);
    const [panelError, setPanelError] = useState('');
    const [voiceNotice, setVoiceNotice] = useState('');

    const scenes = [...video.scenes].sort((a, b) => a.order - b.order);
    const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration_seconds, 0);

    async function handleGenerateScenes() {
        if (scenes.length > 0) {
            const confirmed = window.confirm(
                'Ya existen escenas para este video (pueden tener ediciones manuales o audio generado). ' +
                'Generar de nuevo reemplazará TODAS las escenas actuales y se perderá lo anterior. ¿Deseas continuar?',
            );
            if (!confirmed) return;
        }

        setGeneratingAll(true);
        setPanelError('');
        setVoiceNotice('');
        try {
            const updated = await generateScenes(video.id);
            onUpdated(updated);
        } catch (err) {
            setPanelError(err instanceof Error ? err.message : 'No se pudieron generar las escenas.');
        } finally {
            setGeneratingAll(false);
        }
    }

    async function handleGenerateVoice() {
        setGeneratingVoice(true);
        setPanelError('');
        setVoiceNotice('');
        try {
            const result = await generateVoice(video.id);
            onUpdated(result.video);
            setVoiceNotice(
                result.ttsConfigured
                    ? 'Voz generada con el servicio externo. El video usará este audio en vez de la voz local.'
                    // Not a problem: the render worker narrates every scene with its own
                    // offline voice. The external service is only an alternative voice.
                    : 'No hace falta: el video ya se narra solo, con la voz en español del servidor de render. '
                      + 'Este botón sirve únicamente si configuras un servicio de voz externo (TTS_API_URL / TTS_API_KEY) '
                      + 'y prefieres esa voz a la incluida.',
            );
        } catch (err) {
            setPanelError(err instanceof Error ? err.message : 'No se pudo generar la voz.');
        } finally {
            setGeneratingVoice(false);
        }
    }

    return (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Escenas</h3>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleGenerateScenes}
                        disabled={generatingAll}
                        className="rounded border border-gray-900 px-3 py-1.5 text-sm font-medium text-gray-900 transition hover:bg-gray-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {generatingAll ? 'Generando escenas...' : scenes.length > 0 ? 'Regenerar todas las escenas' : 'Generar escenas'}
                    </button>
                    <button
                        type="button"
                        onClick={handleGenerateVoice}
                        disabled={generatingVoice || scenes.length === 0}
                        title="El video ya se narra solo. Usa esto solo si configuras un servicio de voz externo."
                        className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {generatingVoice ? 'Generando voz...' : 'Voz externa (opcional)'}
                    </button>
                </div>
            </div>

            {panelError && <p className="mb-3 text-sm text-red-600">{panelError}</p>}
            {voiceNotice && <p className="mb-3 rounded bg-blue-50 p-2 text-sm text-blue-800">{voiceNotice}</p>}

            {scenes.length === 0 ? (
                <p className="text-sm text-gray-500">Aún no hay escenas. Genera el guion y pulsa &quot;Generar escenas&quot;.</p>
            ) : (
                <>
                    <div className="mb-4">
                        <p className="mb-1 text-xs text-gray-500">Línea de tiempo (total aprox. {totalDuration.toFixed(1)}s)</p>
                        <div className="flex h-3 w-full overflow-hidden rounded bg-gray-100">
                            {scenes.map((scene, index) => (
                                <div
                                    key={scene.id}
                                    title={`Escena ${index + 1}: ${scene.duration_seconds}s`}
                                    className={index % 2 === 0 ? 'h-full bg-gray-500' : 'h-full bg-gray-700'}
                                    style={{ width: `${totalDuration > 0 ? (scene.duration_seconds / totalDuration) * 100 : 0}%` }}
                                />
                            ))}
                        </div>
                    </div>
                    <ul className="space-y-3">
                        {scenes.map((scene, index) => (
                            <SceneRow
                                key={`${scene.id}:${scene.character}:${scene.action}:${scene.prop}:${scene.description}:${scene.duration_seconds}:${scene.audio_url ?? ''}`}
                                videoId={video.id}
                                scene={scene}
                                index={index}
                                onUpdated={onUpdated}
                            />
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}

interface SceneRowProps {
    videoId: string;
    scene: Scene;
    index: number;
    onUpdated: (video: VideoRecord) => void;
}

function SceneRow({ videoId, scene, index, onUpdated }: SceneRowProps) {
    const [description, setDescription] = useState(scene.description);
    const [durationSeconds, setDurationSeconds] = useState(scene.duration_seconds);
    const [busyAction, setBusyAction] = useState<'select' | 'text' | 'regenerate' | null>(null);
    const [error, setError] = useState('');

    const busy = busyAction !== null;
    const textDirty = description !== scene.description || durationSeconds !== scene.duration_seconds;

    async function applyPatch(patch: ScenePatch, mode: 'select' | 'text') {
        setBusyAction(mode);
        setError('');
        try {
            const updated = await updateScene(videoId, scene.id, patch);
            onUpdated(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo actualizar la escena.');
        } finally {
            setBusyAction(null);
        }
    }

    async function handleCharacterChange(value: CharacterType) {
        await applyPatch({ character: value }, 'select');
    }

    async function handleActionChange(value: SceneAction) {
        await applyPatch({ action: value }, 'select');
    }

    async function handlePropChange(value: ScenePropType) {
        await applyPatch({ prop: value }, 'select');
    }

    async function handleSaveText() {
        if (!description.trim()) {
            setError('La descripción no puede quedar vacía.');
            return;
        }
        if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
            setError('La duración debe ser un número positivo.');
            return;
        }
        await applyPatch({ description, duration_seconds: durationSeconds }, 'text');
    }

    async function handleRegenerate() {
        setBusyAction('regenerate');
        setError('');
        try {
            const updated = await regenerateScene(videoId, scene.id);
            onUpdated(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo regenerar la escena.');
        } finally {
            setBusyAction(null);
        }
    }

    return (
        <li className="rounded border border-gray-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-500">Escena {index + 1} · {scene.duration_seconds}s</span>
                <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={busy}
                    className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {busyAction === 'regenerate' ? 'Regenerando con IA...' : 'Regenerar con IA'}
                </button>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`character-${scene.id}`}>Personaje</label>
                    <select
                        id={`character-${scene.id}`}
                        value={scene.character}
                        onChange={(event) => handleCharacterChange(event.target.value as CharacterType)}
                        disabled={busy}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                    >
                        {CHARACTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`action-${scene.id}`}>Acción</label>
                    <select
                        id={`action-${scene.id}`}
                        value={scene.action}
                        onChange={(event) => handleActionChange(event.target.value as SceneAction)}
                        disabled={busy}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                    >
                        {ACTION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`prop-${scene.id}`}>Objeto</label>
                    <select
                        id={`prop-${scene.id}`}
                        value={scene.prop}
                        onChange={(event) => handlePropChange(event.target.value as ScenePropType)}
                        disabled={busy}
                        className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                    >
                        {PROP_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-2">
                <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`description-${scene.id}`}>Descripción / subtítulo</label>
                <textarea
                    id={`description-${scene.id}`}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={2}
                    disabled={busy}
                    className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                />
            </div>

            <div className="mt-2 flex flex-wrap items-end gap-3">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600" htmlFor={`duration-${scene.id}`}>Duración (s)</label>
                    <input
                        id={`duration-${scene.id}`}
                        type="number"
                        min={1}
                        step={0.5}
                        value={durationSeconds}
                        onChange={(event) => setDurationSeconds(Number(event.target.value))}
                        disabled={busy}
                        className="w-28 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSaveText}
                    disabled={busy || !textDirty}
                    className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {busyAction === 'text' ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </div>

            {scene.audio_url && (
                <div className="mt-3">
                    <audio controls src={scene.audio_url} className="w-full" />
                </div>
            )}

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </li>
    );
}
