'use client';

import { FormEvent, useEffect, useState } from 'react';

type Status = 'borrador' | 'pendiente_aprobacion' | 'aprobado' | 'publicado';
type VideoRecord = { id: string; topic: string; script: string; status: Status; created_at: string; scenes: { id: string; order: number; description: string; duration_seconds: number }[] };
const labels: Record<Status, string> = { borrador: 'Borrador', pendiente_aprobacion: 'Pendiente de aprobacion', aprobado: 'Aprobado', publicado: 'Publicado' };

export default function VideoStudio() {
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    async function loadVideos() {
        const response = await fetch('/api/videos');
        const data = await response.json();
        setVideos(data.videos ?? []);
        setLoading(false);
    }

    useEffect(() => {
        let active = true;
        fetch('/api/videos')
            .then((response) => response.json())
            .then((data: { videos?: VideoRecord[] }) => {
                if (!active) return;
                setVideos(data.videos ?? []);
                setLoading(false);
            });
        return () => { active = false; };
    }, []);

    async function createVideo(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setBusy(true); setMessage('');
        const response = await fetch('/api/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
        const data = await response.json();
        setMessage(response.ok ? 'Borrador creado. Revisa el guion antes de enviarlo.' : data.error);
        if (response.ok) setTopic('');
        await loadVideos(); setBusy(false);
    }

    async function transition(id: string, action: 'submit' | 'approve' | 'publish' | 'reject') {
        setBusy(true); setMessage('');
        const response = await fetch(`/api/videos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
        const data = await response.json();
        setMessage(response.ok ? 'Estado actualizado.' : data.error);
        await loadVideos(); setBusy(false);
    }

    return <main className="studio-shell">
        <header className="topbar"><div className="brand-mark"><span className="brand-dot" />STICKMAN / STUDIO</div><div className="compliance-chip"><span />Revision humana obligatoria</div></header>
        <section className="intro-block"><p className="eyebrow">Pipeline de video regulado</p><h1>De una idea a una pieza lista para revisar.</h1><p className="intro-copy">Crea un borrador, inspecciona el guion y controla cada paso antes de publicar.</p></section>
        <section className="workspace-grid">
            <form className="create-panel" onSubmit={createVideo}><div className="panel-kicker">01 / Nuevo video</div><h2>Que quieres explicar?</h2><p>El motor generara un guion preliminar y tres escenas de referencia.</p><label htmlFor="topic">Tema del video</label><textarea id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Ej. Como funciona el interes compuesto" required /><button className="primary-button" disabled={busy} type="submit">{busy ? 'Procesando...' : 'Crear borrador'}</button>{message && <p className="feedback" role="status">{message}</p>}</form>
            <section className="queue-panel"><div className="queue-heading"><div><div className="panel-kicker">02 / Cola editorial</div><h2>Videos en produccion</h2></div><span className="count-badge">{videos.length.toString().padStart(2, '0')}</span></div>
                {loading ? <p className="empty-state">Cargando cola...</p> : videos.length === 0 ? <p className="empty-state">Todavia no hay borradores. Empieza con un tema.</p> : <div className="video-list">{videos.map((video) => <article className="video-item" key={video.id}><div className="video-item-head"><div><h3>{video.topic}</h3><p>{new Date(video.created_at).toLocaleString('es-AU')}</p></div><span className={`status status-${video.status}`}>{labels[video.status]}</span></div><p className="script-preview">{video.script}</p><div className="scene-row">{video.scenes.map((scene) => <span key={scene.id}>{scene.order} · {scene.description} · {scene.duration_seconds}s</span>)}</div><div className="actions">{video.status === 'borrador' && <button onClick={() => transition(video.id, 'submit')} disabled={busy}>Enviar a aprobacion</button>}{video.status === 'pendiente_aprobacion' && <><button onClick={() => transition(video.id, 'reject')} disabled={busy}>Solicitar cambios</button><button className="approve-button" onClick={() => transition(video.id, 'approve')} disabled={busy}>Aprobar</button></>}{video.status === 'aprobado' && <button className="approve-button" onClick={() => transition(video.id, 'publish')} disabled={busy}>Publicar</button>}{video.status === 'publicado' && <span className="published-note">Listo para distribucion</span>}</div></article>)}</div>}
            </section>
        </section>
    </main>;
}