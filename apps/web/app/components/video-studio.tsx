'use client';

import { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import type { Property } from '@shared-types/property';
import { createTranslator, dirFor, LANGUAGE_OPTIONS, localeFor, type SiteLanguage } from '../../lib/translations';
import { csvToPropertyRows } from '../../lib/csv';

type ChatMessage = { role: 'assistant' | 'user'; text: string };
type AssistantLanguage = SiteLanguage;
type VideoRecord = { id: string; topic: string; status: string };
type SpeechRecognitionInstance = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
    interface Window {
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
        SpeechRecognition?: SpeechRecognitionConstructor;
    }
}

const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export default function VideoStudio() {
    const [activeView, setActiveView] = useState<'explore' | 'owner'>('explore');
    const [query, setQuery] = useState('');
    const [type, setType] = useState('Todos');
    const [properties, setProperties] = useState<Property[]>([]);
    const [cart, setCart] = useState<Property[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatBusy, setChatBusy] = useState(false);
    const [listening, setListening] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [language, setLanguage] = useState<AssistantLanguage>('es');
    const t = createTranslator(language);
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: t('chat.welcomeMessage') }]);
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [studioTopic, setStudioTopic] = useState('');
    const [studioMessage, setStudioMessage] = useState('');
    const [companionPos, setCompanionPos] = useState<{ x: number; y: number } | null>(null);
    const [companionDragging, setCompanionDragging] = useState(false);
    const [companionTilt, setCompanionTilt] = useState({ x: 0, y: 0 });
    const [companionHovering, setCompanionHovering] = useState(false);
    const [salesmanTilt, setSalesmanTilt] = useState({ x: 0, y: 0 });
    const [calculatorOpen, setCalculatorOpen] = useState(false);
    const [calcAmount, setCalcAmount] = useState(300000000);
    const [calcRate, setCalcRate] = useState(12);
    const [calcYears, setCalcYears] = useState(20);
    const [companionIntro, setCompanionIntro] = useState(true);
    const [musicPlaying, setMusicPlaying] = useState(false);
    const [musicError, setMusicError] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const companionDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
    const companionJustDraggedRef = useRef(false);

    useEffect(() => {
        fetch('/api/videos').then((response) => response.json()).then((data: { videos?: VideoRecord[] }) => setVideos(data.videos ?? [])).catch(() => setVideos([]));
        fetch('/api/properties').then((response) => response.json()).then((data: { properties?: Property[] }) => setProperties(data.properties ?? [])).catch(() => setProperties([]));
    }, []);

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem('stickman-site-language');
            // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage no existe en el servidor; restaurar el idioma guardado solo puede pasar tras montar en el cliente.
            if (saved && LANGUAGE_OPTIONS.some((option) => option.value === saved)) setLanguage(saved as AssistantLanguage);
        } catch {
            // ignorar si localStorage no esta disponible
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = dirFor(language);
        try { window.localStorage.setItem('stickman-site-language', language); } catch { /* ignore */ }
    }, [language]);

    useEffect(() => {
        function clamp(pos: { x: number; y: number }) {
            const width = 220;
            const height = 60;
            return {
                x: Math.min(Math.max(pos.x, 8), Math.max(8, window.innerWidth - width)),
                y: Math.min(Math.max(pos.y, 8), Math.max(8, window.innerHeight - height)),
            };
        }
        try {
            const saved = window.localStorage.getItem('stickman-companion-pos');
            // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage no existe en el servidor; restaurar la posicion guardada solo puede pasar tras montar en el cliente.
            if (saved) setCompanionPos(clamp(JSON.parse(saved)));
        } catch {
            // localStorage puede fallar (modo privado, bloqueado); ignorar y usar la posicion por defecto.
        }
        function handleResize() {
            setCompanionPos((current) => current ? clamp(current) : current);
        }
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => setCompanionIntro(false), 1600);
        return () => clearTimeout(timeout);
    }, []);

    function handleCompanionPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        companionDragRef.current = { startX: event.clientX, startY: event.clientY, originX: rect.left, originY: rect.top, moved: false };
        event.currentTarget.setPointerCapture(event.pointerId);
        setCompanionDragging(true);
    }

    function handleCompanionPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
        const drag = companionDragRef.current;
        if (!drag) {
            const rect = event.currentTarget.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width;
            const py = (event.clientY - rect.top) / rect.height;
            setCompanionTilt({ x: (0.5 - py) * 22, y: (px - 0.5) * 22 });
            return;
        }
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) drag.moved = true;
        if (!drag.moved) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const nextX = Math.min(Math.max(drag.originX + deltaX, 8), Math.max(8, window.innerWidth - rect.width - 8));
        const nextY = Math.min(Math.max(drag.originY + deltaY, 8), Math.max(8, window.innerHeight - rect.height - 8));
        setCompanionPos({ x: nextX, y: nextY });
    }

    function handleCompanionPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
        const drag = companionDragRef.current;
        companionDragRef.current = null;
        setCompanionDragging(false);
        if (drag?.moved) {
            companionJustDraggedRef.current = true;
            setCompanionPos((current) => {
                if (current) {
                    try { window.localStorage.setItem('stickman-companion-pos', JSON.stringify(current)); } catch { /* ignore */ }
                }
                return current;
            });
        }
        try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
    }

    function handleCompanionClick() {
        if (companionJustDraggedRef.current) { companionJustDraggedRef.current = false; return; }
        setChatOpen(true);
    }

    function handleCompanionPointerEnter() {
        setCompanionHovering(true);
    }

    function handleCompanionPointerLeave() {
        setCompanionHovering(false);
        setCompanionTilt({ x: 0, y: 0 });
    }

    function handleSalesmanPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        setSalesmanTilt({ x: (0.5 - py) * 20, y: (px - 0.5) * 20 });
    }

    function handleSalesmanPointerLeave() {
        setSalesmanTilt({ x: 0, y: 0 });
    }

    function toggleMusic() {
        const audio = audioRef.current;
        if (!audio) return;
        if (musicPlaying) {
            audio.pause();
            setMusicPlaying(false);
            return;
        }
        setMusicError(false);
        audio.volume = 0.35;
        audio.play().then(() => setMusicPlaying(true)).catch(() => setMusicError(true));
    }

    const filteredProperties = properties.filter((property) => {
        const matchesType = type === 'Todos' || property.type === type;
        const text = `${property.title} ${property.location}`.toLowerCase();
        return matchesType && text.includes(query.toLowerCase());
    });

    const calcMonthlyRate = calcRate / 100 / 12;
    const calcMonths = Math.max(1, calcYears) * 12;
    const calcPayment = calcMonthlyRate > 0
        ? (calcAmount * calcMonthlyRate * Math.pow(1 + calcMonthlyRate, calcMonths)) / (Math.pow(1 + calcMonthlyRate, calcMonths) - 1)
        : calcAmount / calcMonths;
    const calcTotal = calcPayment * calcMonths;
    const calcInterest = calcTotal - calcAmount;

    function addToCart(property: Property) {
        setCart((current) => current.some((item) => item.id === property.id) ? current : [...current, property]);
    }

    function toggleListening() {
        if (listening) {
            setListening(false);
            return;
        }
        const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
        if (!Recognition) {
            setMessages((current) => [...current, { role: 'assistant', text: t('chat.noSpeechSupport') }]);
            return;
        }
        const recognition = new Recognition();
        recognition.lang = localeFor(language);
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.onresult = (event) => {
            const transcript = event.results[0]?.[0]?.transcript ?? '';
            setChatInput(transcript);
            setListening(false);
        };
        recognition.onend = () => setListening(false);
        setListening(true);
        recognition.start();
    }

    async function sendMessage(event?: FormEvent) {
        event?.preventDefault();
        const clean = chatInput.trim();
        if (!clean || chatBusy) return;
        setChatInput('');
        setMessages((current) => [...current, { role: 'user', text: clean }]);
        setChatBusy(true);
        try {
            const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: clean, language, messages: messages.map((message) => ({ role: message.role, content: message.text })) }) });
            const data = await response.json() as { reply?: string };
            const reply = data.reply ?? t('chat.genericFallback');
            setMessages((current) => [...current, { role: 'assistant', text: reply }]);
            if (voiceEnabled && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(reply);
                utterance.lang = localeFor(language);
                utterance.rate = .96;
                window.speechSynthesis.speak(utterance);
            }
        } catch {
            setMessages((current) => [...current, { role: 'assistant', text: t('chat.connectionError') }]);
        } finally {
            setChatBusy(false);
        }

    }

    async function createStudioBrief(event: FormEvent) {
        event.preventDefault();
        if (!studioTopic.trim()) return;
        const response = await fetch('/api/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: `Inmueble: ${studioTopic}`, referenceUrl: 'https://urquijobrokers.com' }) });
        setStudioMessage(response.ok ? t('studio.successMsg') : t('studio.errorMsg'));
        if (response.ok) setStudioTopic('');
    }

    return (
        <main className="broker-app">
            <header className="site-header">
                <a className="brand" href="#inicio" aria-label="Urquijo Brokers de Inmuebles">
                    <span className="brand-avatar"><img src="/stickman-salesman.png" alt="" /></span>
                    <span><strong>STICKMAN URQUIJO</strong><small>BROKERS DE INMUEBLES</small></span>
                </a>
                <nav className="main-nav" aria-label="Navegación principal"><a href="#propiedades">{t('nav.propiedades')}</a><a href="#herramientas">{t('nav.herramientas')}</a><a href="#nosotros">{t('nav.firma')}</a><a href="#contacto">{t('nav.contacto')}</a></nav>
                <div className="header-actions"><select className="site-language-select" value={language} onChange={(event) => setLanguage(event.target.value as AssistantLanguage)} aria-label="Idioma del sitio">{LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button className="owner-link" onClick={() => setActiveView(activeView === 'owner' ? 'explore' : 'owner')} type="button">{activeView === 'owner' ? t('header.verCatalogo') : t('header.administrador')}</button><button className="login-button" onClick={() => setLoginOpen(true)} type="button">{t('header.iniciarSesion')}</button><button className="cart-button" onClick={() => setCartOpen(true)} type="button" aria-label="Abrir carrito">{t('header.bolsa')} <b>{cart.length}</b></button></div>
            </header>

            {activeView === 'explore' ? <section id="inicio" className="hero-section">
                <div className="hero-content"><p className="eyebrow">{t('hero.eyebrow')}</p><h1>{t('hero.h1Line1')}<br /><em>{t('hero.h1Em')}</em></h1><p className="hero-copy">{t('hero.copy')}</p><div className="hero-actions"><a className="button button-primary" href="#propiedades">{t('hero.ctaExplorar')} <span>↗</span></a><button className="button button-quiet" onClick={() => setChatOpen(true)} type="button">{t('hero.ctaHablar')} <span>✦</span></button></div><div className="trust-row"><span><b>15+</b> {t('hero.trust1Label')}</span><span><b>480</b> {t('hero.trust2Label')}</span><span><b>4.9/5</b> {t('hero.trust3Label')}</span></div></div>
                <div className="hero-image"><img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85" alt="Interior luminoso de una propiedad Urquijo" /><div className="hero-note"><span className="note-dot" /><span>{t('heroNote.label')}<br /><strong>{t('heroNote.title')}</strong></span></div></div>
            </section> : <OwnerDashboard onBack={() => setActiveView('explore')} />}

            {activeView === 'explore' && <><section id="propiedades" className="properties-section"><div className="section-intro"><div><p className="eyebrow">{t('properties.eyebrow')}</p><h2>{t('properties.h2Line1')}<br /><em>{t('properties.h2Em')}</em></h2></div><p>{t('properties.intro')}</p></div><div className="property-toolbar"><div className="search-field"><span>⌕</span><input aria-label="Buscar por ciudad o nombre" placeholder={t('properties.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="filter-tabs"><button className={type === 'Todos' ? 'filter-active' : ''} onClick={() => setType('Todos')} type="button">{t('properties.filterTodos')}</button><button className={type === 'Casa' ? 'filter-active' : ''} onClick={() => setType('Casa')} type="button">{t('properties.filterCasa')}</button><button className={type === 'Apartamento' ? 'filter-active' : ''} onClick={() => setType('Apartamento')} type="button">{t('properties.filterApartamento')}</button><button className={type === 'Loft' ? 'filter-active' : ''} onClick={() => setType('Loft')} type="button">{t('properties.filterLoft')}</button></div><span className="result-count">{filteredProperties.length} {t('properties.resultadosSuffix')}</span></div><div className="property-grid">{filteredProperties.map((property) => <article className="property-card" key={property.id}><div className="property-image"><img src={property.image} alt={property.title} /><span className="property-tag">{property.tag}</span><button className="save-button" type="button" aria-label={`${t('property.save')} ${property.title}`}>♡</button></div><div className="property-card-body"><div className="property-title-row"><div><h3>{property.title}</h3><p>{property.location}</p></div><span className="property-type">{property.type}</span></div><div className="property-specs"><span><b>{property.beds}</b> {t('property.habAbbrev')}</span><span><b>{property.baths}</b> {t('property.banosAbbrev')}</span><span><b>{property.area}</b> {t('property.areaUnit')}</span></div><div className="property-footer"><strong>{money(property.price)}</strong><button onClick={() => addToCart(property)} type="button">{cart.some((item) => item.id === property.id) ? t('property.inBag') : t('property.addToBag')}</button></div></div></article>)}</div></section>

                <section id="herramientas" className="tools-section"><div className="section-intro compact"><div><p className="eyebrow">{t('tools.eyebrow')}</p><h2>{t('tools.h2Line1')}<br /><em>{t('tools.h2Em')}</em></h2></div><p>{t('tools.intro')}</p></div><div className="tools-grid"><article className="tool-card tool-dark"><span className="tool-icon">✦</span><h3>{t('tools.card1Title')}</h3><p>{t('tools.card1Desc')}</p><button onClick={() => setChatOpen(true)} type="button">{t('tools.card1Cta')}</button></article><article className="tool-card"><span className="tool-icon">◎</span><h3>{t('tools.card2Title')}</h3><p>{t('tools.card2Desc')}</p><button onClick={() => setCalculatorOpen(true)} type="button">{t('tools.card2Cta')}</button></article><article className="tool-card"><span className="tool-icon">⌂</span><h3>{t('tools.card3Title')}</h3><p>{t('tools.card3Desc')}</p><button onClick={() => setCartOpen(true)} type="button">{t('tools.card3Cta')}</button></article></div></section>

                <section id="nosotros" className="about-section"><div className="about-stamp"><span className="stickman-mini" /> U + S / 2011</div><div><p className="eyebrow">{t('about.eyebrow')}</p><h2>{t('about.h2Line1')}<br /><em>{t('about.h2Em')}</em></h2><p>{t('about.body')}</p><a className="text-link" href="#contacto">{t('about.linkText')}</a></div><div className="about-facts"><div><b>01</b><span>{t('about.fact1')}</span></div><div><b>02</b><span>{t('about.fact2')}</span></div><div><b>03</b><span>{t('about.fact3')}</span></div></div></section>

                <section className="studio-section"><div><p className="eyebrow">{t('studio.eyebrow')}</p><h2>{t('studio.h2Line1')}<br /><em>{t('studio.h2Em')}</em></h2><p>{t('studio.body')}</p></div><form onSubmit={createStudioBrief}><label htmlFor="studio-topic">{t('studio.label')}</label><input id="studio-topic" placeholder={t('studio.placeholder')} value={studioTopic} onChange={(event) => setStudioTopic(event.target.value)} /><button className="button button-primary" type="submit">{t('studio.button')}</button>{studioMessage && <small className="form-feedback">{studioMessage} {videos.length ? `· ${videos.length} ${t('studio.queueSuffix')}` : ''}</small>}</form></section></>}

            <footer id="contacto" className="site-footer"><div className="footer-brand"><a className="brand" href="#inicio"><span className="stickman-logo" aria-hidden="true"><span className="logo-head" /><span className="logo-body" /><span className="logo-arm logo-arm-left" /><span className="logo-arm logo-arm-right" /><span className="logo-leg logo-leg-left" /><span className="logo-leg logo-leg-right" /></span><span><strong>STICKMAN URQUIJO</strong><small>BROKERS DE INMUEBLES</small></span></a><p>{t('footer.tagline')}</p></div><div className="footer-column"><b>{t('footer.col1Title')}</b><a href="tel:+576015802040">+57 601 580 2040</a><a href="mailto:hola@urquijobrokers.com">hola@urquijobrokers.com</a><span>{t('footer.hours')}</span></div><div className="footer-column"><b>{t('footer.col2Title')}</b><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook ↗</a><a href="https://x.com" target="_blank" rel="noreferrer">X / Twitter ↗</a></div><div className="footer-column"><b>{t('footer.col3Title')}</b><span>{t('footer.callcenter')}</span><span>{t('footer.security')}</span><span>{t('footer.copyright')}</span></div></footer>
            <button
                className={`stickman-companion${companionDragging ? ' dragging' : ''}${companionIntro ? ' intro' : ''}`}
                style={companionPos ? { left: companionPos.x, top: companionPos.y, right: 'auto', bottom: 'auto' } : undefined}
                onPointerDown={handleCompanionPointerDown}
                onPointerMove={handleCompanionPointerMove}
                onPointerUp={handleCompanionPointerUp}
                onPointerCancel={handleCompanionPointerUp}
                onPointerEnter={handleCompanionPointerEnter}
                onPointerLeave={handleCompanionPointerLeave}
                onClick={handleCompanionClick}
                type="button"
                aria-label={t('companion.ariaLabel')}
            ><span className={`companion-figure${companionHovering ? ' tilting' : ''}`} style={companionHovering ? { transform: `rotateX(${companionTilt.x}deg) rotateY(${companionTilt.y}deg) translateZ(14px)` } : undefined}><img src="/stickman-salesman.png" alt="" /></span><span className="companion-label"><b>{t('companion.label')}</b><small>{t('companion.sublabel')}</small></span><span className="companion-pulse" /></button>

            <audio ref={audioRef} src="/audio/smooth-jazz-loop.mp3" loop preload="none" />
            <button className={`music-toggle${musicPlaying ? ' playing' : ''}`} onClick={toggleMusic} type="button" aria-label={musicPlaying ? t('music.pause') : t('music.play')} title={musicError ? t('music.error') : undefined}>{musicPlaying ? '♪' : '♪'}<span className="music-bars" aria-hidden="true"><i /><i /><i /></span></button>

            {chatOpen && <div className="overlay" role="presentation" onClick={() => setChatOpen(false)}><section className="assistant-drawer" role="dialog" aria-modal="true" aria-label="Asistente Stickman" onClick={(event) => event.stopPropagation()}><div className="drawer-heading"><div><span className="live-pill"><i /> {t('chat.title')}</span><h2>{t('chat.heading')}</h2></div><button onClick={() => setChatOpen(false)} type="button" aria-label={t('chat.close')}>×</button></div><div className="salesman-card" onPointerMove={handleSalesmanPointerMove} onPointerLeave={handleSalesmanPointerLeave}><img src="/stickman-salesman.png" alt="Stickman, asesor inmobiliario" style={{ transform: `rotateX(${salesmanTilt.x}deg) rotateY(${salesmanTilt.y}deg)` }} /><div><b>{t('chat.salesmanGreeting')}</b><span>{t('chat.salesmanSub')}</span></div></div><div className="voice-controls"><button className={listening ? 'voice-active' : ''} onClick={toggleListening} type="button">{listening ? t('chat.listeningLabel') : t('chat.talkLabel')}</button><button className={voiceEnabled ? 'voice-on' : ''} onClick={() => setVoiceEnabled((enabled) => !enabled)} type="button" aria-label="Activar o desactivar respuestas habladas">{voiceEnabled ? t('chat.voiceOn') : t('chat.voiceOff')}</button></div><div className="chat-messages">{messages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? 'S' : 'T'}</span><p>{message.text}</p></div>)}{chatBusy && <div className="chat-bubble assistant"><span>S</span><p>Estoy pensando<span className="typing">...</span></p></div>}</div><div className="quick-prompts"><button onClick={() => setChatInput(t('chat.quick1'))} type="button">{t('chat.quick1')}</button><button onClick={() => setChatInput(t('chat.quick2'))} type="button">{t('chat.quick2')}</button></div><form className="chat-input" onSubmit={sendMessage}><input autoFocus placeholder={t('chat.placeholder')} value={chatInput} onChange={(event) => setChatInput(event.target.value)} /><button type="button" onClick={toggleListening} aria-label={t('chat.dictateAria')}>🎙</button><button type="submit">↑</button></form><small className="human-note">{t('chat.humanNote')}<a href="tel:+576015802040">llama a nuestro call center</a>.</small></section></div>}
            {cartOpen && <div className="overlay" role="presentation" onClick={() => setCartOpen(false)}><section className="side-panel" role="dialog" aria-modal="true" aria-label="Mi bolsa" onClick={(event) => event.stopPropagation()}><div className="drawer-heading"><div><span className="eyebrow">{t('cart.eyebrow')}</span><h2>{t('cart.heading')} <small>{cart.length} {t('cart.savedSuffix')}</small></h2></div><button onClick={() => setCartOpen(false)} type="button" aria-label={t('cart.close')}>×</button></div>{cart.length === 0 ? <div className="empty-bag"><span>⌂</span><p>{t('cart.emptyText')}</p><button className="button button-primary" onClick={() => setCartOpen(false)} type="button">{t('cart.emptyCta')}</button></div> : <><div className="bag-list">{cart.map((property) => <div className="bag-item" key={property.id}><img src={property.image} alt="" /><div><b>{property.title}</b><span>{property.location}</span><strong>{money(property.price)}</strong></div><button onClick={() => setCart((current) => current.filter((item) => item.id !== property.id))} type="button">×</button></div>)}</div><div className="bag-next"><p>{t('cart.nextStepLabel')}</p><b>{t('cart.nextStepTitle')}</b><button className="button button-primary" onClick={() => setChatOpen(true)} type="button">{t('cart.nextStepCta')}</button></div></>}</section></div>}
            {loginOpen && <div className="overlay" role="presentation" onClick={() => setLoginOpen(false)}><section className="login-modal" role="dialog" aria-modal="true" aria-label="Iniciar sesión" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setLoginOpen(false)} type="button">×</button><span className="login-mark">S</span><p className="eyebrow">{t('login.eyebrow')}</p><h2>{t('login.h2Line1')}<br /><em>{t('login.h2Em')}</em></h2><p>{t('login.body')}</p><input placeholder={t('login.emailPlaceholder')} type="email" /><input placeholder={t('login.passwordPlaceholder')} type="password" /><button className="button button-primary" onClick={() => setLoginOpen(false)} type="button">{t('login.submit')}</button><small>{t('login.adminQuestion')} <button onClick={() => { setLoginOpen(false); setActiveView('owner'); }} type="button">{t('login.adminCta')}</button></small></section></div>}
            {calculatorOpen && <div className="overlay" role="presentation" onClick={() => setCalculatorOpen(false)}><section className="login-modal calculator-modal" role="dialog" aria-modal="true" aria-label={t('calculator.h2Line1')} onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setCalculatorOpen(false)} type="button">×</button><p className="eyebrow">{t('calculator.eyebrow')}</p><h2>{t('calculator.h2Line1')}<br /><em>{t('calculator.h2Em')}</em></h2><p>{t('calculator.body')}</p><label>{t('calculator.amountLabel')}<input type="number" min="0" value={calcAmount} onChange={(event) => setCalcAmount(Number(event.target.value) || 0)} /></label><label>{t('calculator.rateLabel')}<input type="number" min="0" step="0.1" value={calcRate} onChange={(event) => setCalcRate(Number(event.target.value) || 0)} /></label><label>{t('calculator.yearsLabel')}<input type="number" min="1" value={calcYears} onChange={(event) => setCalcYears(Number(event.target.value) || 1)} /></label><div className="calc-result"><div><span>{t('calculator.monthlyLabel')}</span><b>{money(calcPayment)}</b></div><div><span>{t('calculator.totalLabel')}</span><b>{money(calcTotal)}</b></div><div><span>{t('calculator.interestLabel')}</span><b>{money(calcInterest)}</b></div></div><small className="calc-disclaimer">{t('calculator.disclaimer')}</small><button className="button button-primary" onClick={() => { setCalculatorOpen(false); setChatOpen(true); }} type="button">{t('calculator.ctaTalk')}</button></section></div>}
        </main>
    );
}

type PropertyFormValues = {
    title: string;
    location: string;
    price: number;
    type: string;
    beds: number;
    baths: number;
    area: number;
    image: string;
    tag: string;
    stock: number;
    status: string;
};

function OwnerDashboard({ onBack }: { onBack: () => void }) {
    const [status, setStatus] = useState<'checking' | 'locked' | 'unlocked'>('checking');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginBusy, setLoginBusy] = useState(false);
    const [properties, setProperties] = useState<Property[]>([]);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Property | null>(null);
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [importBusy, setImportBusy] = useState(false);
    const [importResult, setImportResult] = useState<{ count: number; rowErrors: string[] } | null>(null);

    async function loadProperties() {
        const response = await fetch('/api/admin/properties');
        if (response.status === 401) { setStatus('locked'); return; }
        const data = await response.json() as { properties?: Property[] };
        setProperties(data.properties ?? []);
        setStatus('unlocked');
    }

    useEffect(() => {
        fetch('/api/admin/properties')
            .then((response) => response.status === 401 ? null : response.json())
            .then((data: { properties?: Property[] } | null) => {
                if (!data) { setStatus('locked'); return; }
                setProperties(data.properties ?? []);
                setStatus('unlocked');
            })
            .catch(() => setStatus('locked'));
    }, []);

    async function handleLogin(event: FormEvent) {
        event.preventDefault();
        setLoginError('');
        setLoginBusy(true);
        try {
            const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
            if (!response.ok) {
                const data = await response.json().catch(() => ({})) as { error?: string };
                setLoginError(data.error ?? 'No se pudo iniciar sesión.');
                return;
            }
            setPassword('');
            await loadProperties();
        } finally {
            setLoginBusy(false);
        }
    }

    async function handleLogout() {
        await fetch('/api/admin/logout', { method: 'POST' });
        setStatus('locked');
        setProperties([]);
    }

    function openCreateForm() {
        setEditing(null);
        setFormError('');
        setFormOpen(true);
    }

    function openEditForm(property: Property) {
        setEditing(property);
        setFormError('');
        setFormOpen(true);
    }

    async function handleDelete(property: Property) {
        if (!window.confirm(`¿Eliminar "${property.title}"? Esta acción no se puede deshacer.`)) return;
        const response = await fetch(`/api/admin/properties/${property.id}`, { method: 'DELETE' });
        if (response.ok) setProperties((current) => current.filter((item) => item.id !== property.id));
    }

    async function handleCsvImport(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setImportBusy(true);
        setImportResult(null);
        try {
            const text = await file.text();
            const rows = csvToPropertyRows(text);
            if (rows.length === 0) {
                setImportResult({ count: 0, rowErrors: ['El archivo esta vacio o no tiene el encabezado esperado.'] });
                return;
            }
            const response = await fetch('/api/admin/properties/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
            const data = await response.json() as { created?: Property[]; count?: number; rowErrors?: string[]; error?: string };
            if (!response.ok) { setImportResult({ count: 0, rowErrors: [data.error ?? 'Error desconocido', ...(data.rowErrors ?? [])] }); return; }
            setImportResult({ count: data.count ?? 0, rowErrors: data.rowErrors ?? [] });
            if (data.created?.length) setProperties((current) => [...data.created!, ...current]);
        } catch {
            setImportResult({ count: 0, rowErrors: ['No se pudo leer el archivo CSV.'] });
        } finally {
            setImportBusy(false);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setFormError('');
        const form = new FormData(event.currentTarget);
        const payload: PropertyFormValues = {
            title: String(form.get('title') ?? ''),
            location: String(form.get('location') ?? ''),
            price: Number(form.get('price') ?? 0),
            type: String(form.get('type') ?? 'Casa'),
            beds: Number(form.get('beds') ?? 0),
            baths: Number(form.get('baths') ?? 0),
            area: Number(form.get('area') ?? 0),
            image: String(form.get('image') ?? ''),
            tag: String(form.get('tag') ?? ''),
            stock: Number(form.get('stock') ?? 1),
            status: String(form.get('status') ?? 'activa'),
        };

        try {
            const response = editing
                ? await fetch(`/api/admin/properties/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                : await fetch('/api/admin/properties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            const data = await response.json() as { property?: Property; error?: string };
            if (!response.ok || !data.property) { setFormError(data.error ?? 'No se pudo guardar.'); return; }

            const saved = data.property;
            setProperties((current) => editing
                ? current.map((item) => item.id === saved.id ? saved : item)
                : [saved, ...current]);
            setFormOpen(false);
        } finally {
            setSaving(false);
        }
    }

    if (status === 'checking') {
        return <section className="owner-dashboard"><p className="eyebrow">Cargando…</p></section>;
    }

    if (status === 'locked') {
        return <section className="owner-dashboard">
            <div className="owner-welcome">
                <button className="back-link" onClick={onBack} type="button">← Volver al catálogo</button>
                <p className="eyebrow">Portal de administrador</p>
                <h1>Acceso <em>restringido.</em></h1>
                <p>Ingresa la contraseña de administrador para gestionar el inventario de propiedades.</p>
            </div>
            <form className="admin-login-form" onSubmit={handleLogin}>
                <input type="password" placeholder="Contraseña de administrador" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
                <button className="button button-primary" type="submit" disabled={loginBusy}>{loginBusy ? 'Entrando…' : 'Entrar →'}</button>
                {loginError && <small className="form-feedback">{loginError}</small>}
            </form>
        </section>;
    }

    const activeCount = properties.filter((property) => property.status === 'activa').length;
    const totalStock = properties.reduce((sum, property) => sum + property.stock, 0);

    return <section className="owner-dashboard">
        <div className="owner-welcome">
            <button className="back-link" onClick={onBack} type="button">← Volver al catálogo</button>
            <p className="eyebrow">Portal de administrador</p>
            <h1>Panel de <em>control.</em></h1>
            <p>Gestiona el inventario de propiedades en tiempo real.</p>
            <div className="owner-actions">
                <button className="button button-primary" onClick={openCreateForm} type="button">Publicar nueva propiedad +</button>
                <label className="button button-quiet file-button">{importBusy ? 'Importando…' : 'Importar CSV ↑'}<input type="file" accept=".csv,text/csv" onChange={handleCsvImport} disabled={importBusy} hidden /></label>
                <a className="text-link csv-template-link" href="/plantilla-propiedades.csv" download>Descargar plantilla ↓</a>
                <button className="button button-quiet" onClick={handleLogout} type="button">Cerrar sesión</button>
            </div>
            {importResult && <div className={`import-feedback${importResult.rowErrors.length ? ' has-errors' : ''}`}>
                <p>{importResult.count} propiedad{importResult.count === 1 ? '' : 'es'} importada{importResult.count === 1 ? '' : 's'} correctamente.</p>
                {importResult.rowErrors.length > 0 && <ul>{importResult.rowErrors.map((rowError, index) => <li key={index}>{rowError}</li>)}</ul>}
            </div>}
        </div>
        <div className="owner-stats">
            <div><span>Propiedades activas</span><b>{String(activeCount).padStart(2, '0')}</b><small>de {properties.length} totales</small></div>
            <div><span>Stock total</span><b>{totalStock}</b><small>unidades disponibles</small></div>
            <div><span>Solicitudes</span><b>—</b><small>Próximamente</small></div>
            <div><span>Reclamos</span><b>—</b><small>Próximamente</small></div>
        </div>
        <div className="admin-nav-pills">
            <span className="pill-active">Propiedades</span>
            <span className="pill-soon">Solicitudes</span>
            <span className="pill-soon">Reclamos</span>
            <span className="pill-soon">Cálculos</span>
            <span className="pill-soon">Ingresos</span>
            <span className="pill-soon">Innovación</span>
        </div>
        <section className="owner-table owner-table-full">
            <div className="owner-heading"><div><p className="eyebrow">Inventario</p><h2>Tus propiedades ({properties.length})</h2></div></div>
            {properties.length === 0 && <p className="empty-inventory">No hay propiedades todavía. Crea la primera con &quot;Publicar nueva propiedad&quot;.</p>}
            {properties.map((property) => <div className="owner-property" key={property.id}>
                <img src={property.image} alt="" />
                <div><b>{property.title}</b><span>{property.location} · stock: {property.stock}</span></div>
                <span className={`owner-status status-${property.status}`}>{property.status.toUpperCase()}</span>
                <strong>{money(property.price)}</strong>
                <div className="owner-property-actions">
                    <button onClick={() => openEditForm(property)} type="button">Editar</button>
                    <button className="btn-delete" onClick={() => handleDelete(property)} type="button">Eliminar</button>
                </div>
            </div>)}
        </section>

        {formOpen && <div className="overlay" role="presentation" onClick={() => setFormOpen(false)}>
            <section className="login-modal admin-form" role="dialog" aria-modal="true" aria-label={editing ? 'Editar propiedad' : 'Nueva propiedad'} onClick={(event) => event.stopPropagation()}>
                <button className="modal-close" onClick={() => setFormOpen(false)} type="button">×</button>
                <p className="eyebrow">{editing ? 'Editar propiedad' : 'Nueva propiedad'}</p>
                <h2>{editing ? editing.title : 'Publicar propiedad'}</h2>
                <form className="admin-property-form" onSubmit={handleSubmit}>
                    <input name="title" placeholder="Título" defaultValue={editing?.title} required />
                    <input name="location" placeholder="Ubicación" defaultValue={editing?.location} required />
                    <div className="form-row">
                        <input name="price" type="number" min="0" placeholder="Precio (COP)" defaultValue={editing?.price} required />
                        <select name="type" defaultValue={editing?.type ?? 'Casa'}>
                            <option>Casa</option><option>Apartamento</option><option>Loft</option><option>Lote</option><option>Oficina</option><option>Local</option>
                        </select>
                    </div>
                    <div className="form-row">
                        <input name="beds" type="number" min="0" placeholder="Habitaciones" defaultValue={editing?.beds} required />
                        <input name="baths" type="number" min="0" placeholder="Baños" defaultValue={editing?.baths} required />
                        <input name="area" type="number" min="0" placeholder="Área m²" defaultValue={editing?.area} required />
                    </div>
                    <input name="image" placeholder="URL de imagen" defaultValue={editing?.image} required />
                    <input name="tag" placeholder="Etiqueta (ej. Nuevo, Exclusiva)" defaultValue={editing?.tag} />
                    <div className="form-row">
                        <input name="stock" type="number" min="0" placeholder="Stock" defaultValue={editing?.stock ?? 1} required />
                        <select name="status" defaultValue={editing?.status ?? 'activa'}>
                            <option value="activa">Activa</option><option value="reservada">Reservada</option><option value="vendida">Vendida</option><option value="arrendada">Arrendada</option>
                        </select>
                    </div>
                    <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                    {formError && <small className="form-feedback">{formError}</small>}
                </form>
            </section>
        </div>}
    </section>;
}
