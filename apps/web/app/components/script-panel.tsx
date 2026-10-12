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
        <section className="panel panel-pad">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 id={`script-title-${video.id}`} className="panel-title">Guion</h3>
                {dirty && <span className="chip border-amber-400/30 bg-amber-400/10 text-amber-200">Cambios sin guardar</span>}
            </div>
            <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={8}
                aria-labelledby={`script-title-${video.id}`}
                className="field leading-relaxed"
                disabled={saving}
            />
            <p className="hint mt-2">
                Si editas el guion después de generar las escenas, recuerda pulsar &quot;Generar escenas&quot; de nuevo para que reflejen el cambio.
            </p>
            {error && <p className="alert alert-error mt-3" role="alert">{error}</p>}
            <div className="mt-4">
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !dirty}
                    className="btn btn-primary"
                >
                    {saving && <span className="spinner" aria-hidden="true" />}
                    {saving ? 'Guardando...' : 'Guardar guion'}
                </button>
            </div>
        </section>
    );
}
