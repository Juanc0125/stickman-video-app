'use client';

import { useState } from 'react';
import { saveScript, type VideoRecord } from './api';

interface ScriptPanelProps {
    video: VideoRecord;
    onUpdated: (video: VideoRecord) => void;
}

export default function ScriptPanel({ video, onUpdated }: ScriptPanelProps) {
    const [text, setText] = useState(video.script);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const dirty = text !== video.script;

    async function handleSave() {
        if (!text.trim()) {
            setError('El guion no puede quedar vacío.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const updated = await saveScript(video.id, text);
            onUpdated(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar el guion.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Guion</h3>
                {dirty && <span className="text-xs text-amber-600">Cambios sin guardar</span>}
            </div>
            <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={8}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-gray-500 focus:outline-none"
                disabled={saving}
            />
            <p className="mt-2 text-xs text-gray-500">
                Si editas el guion después de generar las escenas, recuerda pulsar &quot;Generar escenas&quot; de nuevo para que reflejen el cambio.
            </p>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-3">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? 'Guardando...' : 'Guardar guion'}
                </button>
            </div>
        </section>
    );
}
