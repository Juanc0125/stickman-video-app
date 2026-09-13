'use client';

import { FormEvent, useEffect, useState } from 'react';

type Status = 'borrador' | 'pendiente_aprobacion' | 'aprobado' | 'publicado';
type Mode = 'seller' | 'educator' | 'compare';
type VideoRecord = { id: string; topic: string; source_url: string | null; script: string; status: Status; created_at: string; video_url: string | null; scenes: { id: string; order: number; description: string; duration_seconds: number }[] };
type ChatMessage = { role: 'assistant' | 'user'; text: string };
type AssistantResponse = { reply?: string; suggestedTopic?: string; mode?: 'openai' | 'anthropic' | 'local'; notice?: string };
type Language = 'es' | 'en';

const labels: Record<Status, string> = { borrador: 'Borrador', pendiente_aprobacion: 'Pendiente', aprobado: 'Aprobado', publicado: 'Publicado' };
const modeLabels: Record<Mode, string> = { seller: 'Seller AI', educator: 'Educador', compare: 'Comparador' };

export default function VideoStudio() {
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [topic, setTopic] = useState('');
    const [referenceUrl, setReferenceUrl] = useState('https://www.lahaus.com/herramientas');
    const [mode, setMode] = useState<Mode>('seller');
    const [language, setLanguage] = useState<Language>('es');
    const [loanAmount, setLoanAmount] = useState('250000');
    const [interestRate, setInterestRate] = useState('6.5');
    const [loanYears, setLoanYears] = useState('30');
    const [chatInput, setChatInput] = useState('');
    const [chatBusy, setChatBusy] = useState(false);
    const [aiMode, setAiMode] = useState<'openai' | 'anthropic' | 'local'>('local');
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Hola. Soy Stickman, tu asesor AI. Puedo comparar cuotas, explicar creditos y convertir una conversacion en un video vendedor. Que quieres explorar?' }]);
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
        fetch('/api/videos').then((response) => response.json()).then((data: { videos?: VideoRecord[] }) => {
            if (!active) return;
            setVideos(data.videos ?? []);
            setLoading(false);
        });
        return () => { active = false; };
    }, []);

    async function sendMessage(text = chatInput) {
        const cleanText = text.trim();
        if (!cleanText || chatBusy) return;
        setChatInput('');
        setMessages((current) => [...current, { role: 'user', text: cleanText }]);
        setChatBusy(true);
        const history = [...messages, { role: 'user' as const, text: cleanText }].map((entry) => ({ role: entry.role, content: entry.text }));
        const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: cleanText, messages: history, language }) });
        const data = await response.json() as AssistantResponse;
        setAiMode(data.mode ?? 'local');
        setMessages((current) => [...current, { role: 'assistant', text: data.reply ?? 'No pude responder en este momento.' }]);
        if (data.notice) setMessage(data.notice);
        if (data.suggestedTopic) setTopic(data.suggestedTopic);
        setChatBusy(false);
    }

    function submitChat(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        void sendMessage();
    }

    const monthlyPayment = (() => {
        const principal = Number(loanAmount) || 0;
        const monthlyRate = (Number(interestRate) || 0) / 100 / 12;
        const payments = (Number(loanYears) || 0) * 12;
        if (!principal || !payments) return 0;
        if (!monthlyRate) return principal / payments;
        return principal * monthlyRate * (1 + monthlyRate) ** payments / ((1 + monthlyRate) ** payments - 1);
    })();

    async function createVideo(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setMessage('');
        const response = await fetch('/api/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: `${modeLabels[mode]}: ${topic}`, referenceUrl }) });
        const data = await response.json();
        setMessage(response.ok ? 'Brief creado. Revisa el guion AI.' : data.error);
        if (response.ok) setTopic('');
        await loadVideos();
        setBusy(false);
    }

    async function transition(id: string, action: 'submit' | 'approve' | 'publish' | 'reject' | 'render') {
        setBusy(true);
        setMessage('');
        const response = await fetch(`/api/videos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
        const data = await response.json();
        setMessage(response.ok ? 'Estado actualizado.' : data.error);
        await loadVideos();
        setBusy(false);
    }

    return <main className="studio-shell">
        <header className="topbar"><div className="brand-mark"><span className="brand-symbol">✦</span><span>STICKMAN<span className="brand-slash">/</span>AI STUDIO</span></div><div className="system-status"><span className="pulse-dot" /> AI CORE ONLINE <span className="status-divider" /> HUMAN REVIEW REQUIRED</div><div className="topbar-tools"><div className="language-switch"><button className={language === 'es' ? 'language-selected' : ''} onClick={() => setLanguage('es')} type="button">ES</button><button className={language === 'en' ? 'language-selected' : ''} onClick={() => setLanguage('en')} type="button">EN</button></div><span className="operator-code">OP / 001</span></div></header>
        <section className="hero-grid"><div className="hero-copy"><p className="eyebrow">Creative intelligence / 01</p><h1>Habla con tu<br /><em>asesor AI.</em></h1><p className="intro-copy">Explora opciones con Stickman en tiempo real y convierte la mejor conversacion en un video vendedor.</p><div className="signal-line"><span /> CONVERSATION-TO-SCENE ENGINE <b>v0.5</b></div></div><div className="hero-orbit" aria-hidden="true"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="stick-head" /><div className="stick-body" /><span className="orbit-label label-top">AI SELLER</span><span className="orbit-label label-bottom">LISTENING</span></div></section>
        <section className="broker-tools"><div className="tools-heading"><div><p className="eyebrow">01 / Broker toolkit</p><h2>{language === 'es' ? 'Herramientas para decidir mejor' : 'Tools for better decisions'}</h2></div><span className="ai-chip">AI READY</span></div><div className="broker-tool-grid"><article className="broker-tool"><span className="tool-number">01</span><h3>{language === 'es' ? 'Calculadora de cuota' : 'Payment calculator'}</h3><div className="tool-inputs"><input aria-label="Loan amount" type="number" value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} /><input aria-label="Interest rate" type="number" step="0.1" value={interestRate} onChange={(event) => setInterestRate(event.target.value)} /><input aria-label="Loan term" type="number" value={loanYears} onChange={(event) => setLoanYears(event.target.value)} /></div><p className="tool-result">{monthlyPayment.toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { style: 'currency', currency: language === 'es' ? 'EUR' : 'USD', maximumFractionDigits: 0 })}<small>{language === 'es' ? ' / mes estimado' : ' / estimated month'}</small></p></article><article className="broker-tool"><span className="tool-number">02</span><h3>{language === 'es' ? 'Perfil de comprador' : 'Buyer profile'}</h3><p>{language === 'es' ? 'Convierte ingresos, ahorro y objetivo en preguntas para el asistente AI.' : 'Turn income, savings and goals into prompts for the AI assistant.'}</p><button type="button" onClick={() => void sendMessage(language === 'es' ? 'Ayudame a evaluar el perfil de un comprador' : 'Help me evaluate a buyer profile')}>{language === 'es' ? 'Analizar con Stickman' : 'Analyze with Stickman'} ↗</button></article><article className="broker-tool"><span className="tool-number">03</span><h3>{language === 'es' ? 'Comparador de ofertas' : 'Offer comparator'}</h3><p>{language === 'es' ? 'Contrasta tasa, plazo, seguros y costo total antes de recomendar.' : 'Compare rate, term, insurance and total cost before recommending.'}</p><button type="button" onClick={() => void sendMessage(language === 'es' ? 'Compara estas ofertas hipotecarias' : 'Compare these mortgage offers')}>{language === 'es' ? 'Abrir comparador' : 'Open comparator'} ↗</button></article><article className="broker-tool"><span className="tool-number">04</span><h3>{language === 'es' ? 'Fuentes de mercado' : 'Market sources'}</h3><p>{language === 'es' ? 'Usa una pagina de referencia para crear contenido responsable y verificable.' : 'Use a reference page to create responsible, verifiable content.'}</p><a href="https://www.lahaus.com/herramientas" target="_blank" rel="noreferrer">La Haus / tools ↗</a></article></div></section>
        <section className="assistant-layout">
            <div className="assistant-panel"><div className="assistant-heading"><div><p className="eyebrow">02 / Live assistant</p><h2>Stickman is listening</h2></div><span className="ai-chip"><span className="pulse-dot" /> {aiMode === 'local' ? 'LOCAL FALLBACK' : `${aiMode.toUpperCase()} ONLINE`}</span></div><div className="chat-window">{messages.map((entry, index) => <div className={`chat-message chat-${entry.role}`} key={`${entry.role}-${index}`}><span className="chat-avatar">{entry.role === 'assistant' ? '✦' : 'YOU'}</span><p>{entry.text}</p></div>)}{chatBusy && <div className="chat-message chat-assistant"><span className="chat-avatar">✦</span><p className="typing">Thinking<span>.</span><span>.</span><span>.</span></p></div>}</div><div className="suggestions"><button type="button" onClick={() => void sendMessage('Compara dos opciones de credito hipotecario')}>Comparar opciones</button><button type="button" onClick={() => void sendMessage('Como calculo una cuota mensual?')}>Calcular cuota</button><button type="button" onClick={() => void sendMessage('Quiero crear un video vendedor')}>Crear video</button></div><form className="chat-form" onSubmit={submitChat}><input aria-label="Mensaje para Stickman" value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Pregunta a Stickman..." /><button type="submit" disabled={chatBusy} aria-label="Enviar mensaje">↑</button></form></div>
            <div className="creation-zone"><div className="section-heading"><div><p className="eyebrow">03 / Story builder</p><h2>Turn the chat into a story</h2></div><span className="ai-chip">AI ASSISTED</span></div><form className="create-panel" onSubmit={createVideo}><div className="field-block"><label htmlFor="topic">Video brief</label><textarea id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Habla con Stickman o escribe el tema aqui" required /><span className="field-hint">El asistente puede completar este brief por ti.</span></div><div className="field-block"><label htmlFor="reference-url">Reference signal</label><input id="reference-url" type="url" value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} placeholder="https://..." /></div><div className="mode-block"><label>Seller personality</label><div className="mode-switch">{(Object.keys(modeLabels) as Mode[]).map((option) => <button key={option} className={mode === option ? 'mode-button mode-selected' : 'mode-button'} onClick={() => setMode(option)} type="button">{modeLabels[option]}</button>)}</div></div><div className="form-footer"><span className="generation-note">3 scenes <b>·</b> 15 sec <b>·</b> human gate</span><button className="primary-button" disabled={busy} type="submit"><span>✦</span>{busy ? 'BUILDING...' : 'BUILD AI STORY'}</button></div>{message && <p className="feedback" role="status">{message}</p>}</form></div>
        </section>
        <section className="queue-panel"><div className="queue-heading"><div><p className="eyebrow">04 / Production stream</p><h2>Editorial command queue</h2></div><div className="queue-meta"><span className="live-indicator">LIVE</span><span className="count-badge">{videos.length.toString().padStart(2, '0')} NODES</span></div></div>{loading ? <p className="empty-state">Syncing production stream...</p> : videos.length === 0 ? <p className="empty-state">No stories yet. Give Stickman a brief above.</p> : <div className="video-list">{videos.map((video) => <article className="video-item" key={video.id}><div className="video-item-head"><div><span className="node-id">NODE / {video.id.slice(0, 6).toUpperCase()}</span><h3>{video.topic}</h3><p>{new Date(video.created_at).toLocaleString('es-AU')}</p></div><span className={`status status-${video.status}`}>{labels[video.status]}</span></div>{video.source_url && <p className="source-link">SOURCE <a href={video.source_url} target="_blank" rel="noreferrer">{video.source_url}</a></p>}<p className="script-preview">{video.script}</p><div className="scene-row">{video.scenes.map((scene) => <span key={scene.id}>{String(scene.order).padStart(2, '0')} / {scene.description} / {scene.duration_seconds}s</span>)}</div>{video.video_url && <video className="video-preview" controls preload="metadata" src={video.video_url} />}<div className="actions">{video.status === 'borrador' && <button onClick={() => transition(video.id, 'submit')} disabled={busy}>Send to review</button>}{video.status === 'pendiente_aprobacion' && <><button onClick={() => transition(video.id, 'reject')} disabled={busy}>Request changes</button><button className="approve-button" onClick={() => transition(video.id, 'approve')} disabled={busy}>Approve node</button></>}{video.status === 'aprobado' && <><button onClick={() => transition(video.id, 'render')} disabled={busy}>{video.video_url ? 'Rerender story' : 'Render story'}</button>{video.video_url ? <button className="approve-button" onClick={() => transition(video.id, 'publish')} disabled={busy}>Publish</button> : <span className="published-note">Render required before publish</span>}</>}{video.status === 'publicado' && <span className="published-note">Published to distribution</span>}</div></article>)}</div>}</section>
    </main>;
}
