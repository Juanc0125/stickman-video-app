'use client';

import { FormEvent, useEffect, useState } from 'react';

type Property = {
    id: string;
    title: string;
    location: string;
    price: number;
    type: string;
    beds: number;
    baths: number;
    area: number;
    image: string;
    tag: string;
};

type ChatMessage = { role: 'assistant' | 'user'; text: string };
type VideoRecord = { id: string; topic: string; status: string };
type SpeechRecognitionInstance = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
    interface Window {
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
        SpeechRecognition?: SpeechRecognitionConstructor;
    }
}

const properties: Property[] = [
    { id: 'urq-01', title: 'Casa Patio del Prado', location: 'Chapinero Alto, Bogotá', price: 1680000000, type: 'Casa', beds: 4, baths: 3, area: 245, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85', tag: 'Selección Urquijo' },
    { id: 'urq-02', title: 'Apartamento Brisa Norte', location: 'El Poblado, Medellín', price: 895000000, type: 'Apartamento', beds: 3, baths: 2, area: 128, image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85', tag: 'Nuevo' },
    { id: 'urq-03', title: 'Loft 72 / 14', location: 'Zona G, Bogotá', price: 620000000, type: 'Loft', beds: 2, baths: 2, area: 86, image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1000&q=85', tag: 'Listo para habitar' },
    { id: 'urq-04', title: 'Villa Agua Clara', location: 'Rionegro, Antioquia', price: 1240000000, type: 'Casa', beds: 5, baths: 4, area: 310, image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=85', tag: 'Exclusiva' },
];

const money = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

export default function VideoStudio() {
    const [activeView, setActiveView] = useState<'explore' | 'owner'>('explore');
    const [query, setQuery] = useState('');
    const [type, setType] = useState('Todos');
    const [cart, setCart] = useState<Property[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatBusy, setChatBusy] = useState(false);
    const [listening, setListening] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'assistant', text: 'Hola, soy Stickman. Puedo encontrar propiedades según tu presupuesto, comparar opciones y coordinar una visita con un asesor humano.' }]);
    const [videos, setVideos] = useState<VideoRecord[]>([]);
    const [studioTopic, setStudioTopic] = useState('');
    const [studioMessage, setStudioMessage] = useState('');

    useEffect(() => {
        fetch('/api/videos').then((response) => response.json()).then((data: { videos?: VideoRecord[] }) => setVideos(data.videos ?? [])).catch(() => setVideos([]));
    }, []);

    const filteredProperties = properties.filter((property) => {
        const matchesType = type === 'Todos' || property.type === type;
        const text = `${property.title} ${property.location}`.toLowerCase();
        return matchesType && text.includes(query.toLowerCase());
    });

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
            setMessages((current) => [...current, { role: 'assistant', text: 'Tu navegador no habilita dictado por voz. Puedes escribirme o llamar al +57 601 580 2040.' }]);
            return;
        }
        const recognition = new Recognition();
        recognition.lang = 'es-CO';
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
            const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: clean, language: 'es', messages: messages.map((message) => ({ role: message.role, content: message.text })) }) });
            const data = await response.json() as { reply?: string };
            const reply = data.reply ?? 'Puedo ayudarte a comparar propiedades o agendar una llamada.';
            setMessages((current) => [...current, { role: 'assistant', text: reply }]);
            if (voiceEnabled && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(reply);
                utterance.lang = 'es-CO';
                utterance.rate = .96;
                window.speechSynthesis.speak(utterance);
            }
        } catch {
            setMessages((current) => [...current, { role: 'assistant', text: 'Ahora mismo no puedo conectarme. Un asesor humano puede ayudarte en el +57 601 580 2040.' }]);
        } finally {
            setChatBusy(false);
        }

    }

    async function createStudioBrief(event: FormEvent) {
        event.preventDefault();
        if (!studioTopic.trim()) return;
        const response = await fetch('/api/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: `Inmueble: ${studioTopic}`, referenceUrl: 'https://urquijobrokers.com' }) });
        setStudioMessage(response.ok ? 'Brief creado para revisión del equipo.' : 'No se pudo crear el brief.');
        if (response.ok) setStudioTopic('');
    }

    return (
        <main className="broker-app">
            <header className="site-header">
                <a className="brand" href="#inicio" aria-label="Urquijo Brokers de Inmuebles">
                    <span className="brand-avatar"><img src="/stickman-salesman.png" alt="" /></span>
                    <span><strong>STICKMAN URQUIJO</strong><small>BROKERS DE INMUEBLES</small></span>
                </a>
                <nav className="main-nav" aria-label="Navegación principal"><a href="#propiedades">Propiedades</a><a href="#herramientas">Herramientas</a><a href="#nosotros">La firma</a><a href="#contacto">Contacto</a></nav>
                <div className="header-actions"><button className="owner-link" onClick={() => setActiveView(activeView === 'owner' ? 'explore' : 'owner')} type="button">{activeView === 'owner' ? 'Ver catálogo' : 'Soy propietario'}</button><button className="login-button" onClick={() => setLoginOpen(true)} type="button">Iniciar sesión</button><button className="cart-button" onClick={() => setCartOpen(true)} type="button" aria-label="Abrir carrito">Bolsa <b>{cart.length}</b></button></div>
            </header>

            {activeView === 'explore' ? <section id="inicio" className="hero-section">
                <div className="hero-content"><p className="eyebrow">Decisiones inmobiliarias, mejor acompañadas</p><h1>Encuentra el lugar<br /><em>que se siente tuyo.</em></h1><p className="hero-copy">Somos los hermanos Urquijo: una firma boutique que combina criterio local, negociación transparente y tecnología para hacer más simple comprar, vender o invertir.</p><div className="hero-actions"><a className="button button-primary" href="#propiedades">Explorar propiedades <span>↗</span></a><button className="button button-quiet" onClick={() => setChatOpen(true)} type="button">Hablar con Stickman AI <span>✦</span></button></div><div className="trust-row"><span><b>15+</b> años de experiencia</span><span><b>480</b> operaciones acompañadas</span><span><b>4.9/5</b> satisfacción</span></div></div>
                <div className="hero-image"><img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85" alt="Interior luminoso de una propiedad Urquijo" /><div className="hero-note"><span className="note-dot" /><span>Propiedad destacada<br /><strong>La calma también se compra</strong></span></div></div>
            </section> : <OwnerDashboard onBack={() => setActiveView('explore')} />}

            {activeView === 'explore' && <><section id="propiedades" className="properties-section"><div className="section-intro"><div><p className="eyebrow">Inventario curado · actualizado hoy</p><h2>Propiedades con una historia<br /><em>por contar.</em></h2></div><p>Desde tu primera búsqueda hasta la firma, te damos contexto para decidir con confianza.</p></div><div className="property-toolbar"><div className="search-field"><span>⌕</span><input aria-label="Buscar por ciudad o nombre" placeholder="Buscar ciudad, barrio o propiedad" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="filter-tabs">{['Todos', 'Casa', 'Apartamento', 'Loft'].map((filter) => <button className={type === filter ? 'filter-active' : ''} key={filter} onClick={() => setType(filter)} type="button">{filter}</button>)}</div><span className="result-count">{filteredProperties.length} resultados</span></div><div className="property-grid">{filteredProperties.map((property) => <article className="property-card" key={property.id}><div className="property-image"><img src={property.image} alt={property.title} /><span className="property-tag">{property.tag}</span><button className="save-button" type="button" aria-label={`Guardar ${property.title}`}>♡</button></div><div className="property-card-body"><div className="property-title-row"><div><h3>{property.title}</h3><p>{property.location}</p></div><span className="property-type">{property.type}</span></div><div className="property-specs"><span><b>{property.beds}</b> hab.</span><span><b>{property.baths}</b> baños</span><span><b>{property.area}</b> m²</span></div><div className="property-footer"><strong>{money(property.price)}</strong><button onClick={() => addToCart(property)} type="button">{cart.some((item) => item.id === property.id) ? 'En tu bolsa ✓' : 'Agregar a bolsa +'}</button></div></div></article>)}</div></section>

                <section id="herramientas" className="tools-section"><div className="section-intro compact"><div><p className="eyebrow">Herramientas Urquijo + Stickman</p><h2>Menos vueltas.<br /><em>Más claridad.</em></h2></div><p>Inspiradas en las mejores experiencias de brokers digitales, reunimos en un solo lugar lo que necesitas para avanzar.</p></div><div className="tools-grid"><article className="tool-card tool-dark"><span className="tool-icon">✦</span><h3>Stickman AI</h3><p>Un asesor que entiende tu conversación, filtra el inventario y te conecta con una persona cuando la necesitas.</p><button onClick={() => setChatOpen(true)} type="button">Empezar conversación →</button></article><article className="tool-card"><span className="tool-icon">◎</span><h3>Calcula tu capacidad</h3><p>Conoce una cuota orientativa para llegar preparado a tu próxima visita.</p><a href="#calculadora">Abrir calculadora →</a></article><article className="tool-card"><span className="tool-icon">⌂</span><h3>Compra sin perderte</h3><p>Guarda opciones en tu bolsa y sigue visitas, documentos, ofertas y próximos pasos.</p><button onClick={() => setCartOpen(true)} type="button">Ver mi bolsa →</button></article></div></section>

                <section id="nosotros" className="about-section"><div className="about-stamp"><span className="stickman-mini" /> U + S / 2011</div><div><p className="eyebrow">Una firma de hermanos</p><h2>El criterio humano<br />sigue siendo <em>la diferencia.</em></h2><p>Urquijo Brokers nació entre dos hermanos y una convicción: una propiedad no es una ficha, es el comienzo de una etapa. Combinamos sensibilidad arquitectónica, datos honestos y negociación firme para cuidar cada decisión.</p><a className="text-link" href="#contacto">Conoce nuestra forma de trabajar ↗</a></div><div className="about-facts"><div><b>01</b><span>Escuchamos antes de recomendar.</span></div><div><b>02</b><span>Mostramos el contexto completo.</span></div><div><b>03</b><span>Seguimos contigo hasta después de la firma.</span></div></div></section>

                <section className="studio-section"><div><p className="eyebrow">Urquijo content desk</p><h2>Una propiedad bien contada<br /><em>encuentra a su gente.</em></h2><p>Genera un brief para que nuestro equipo cree un video de venta con Stickman AI. Todo contenido pasa por revisión humana antes de publicarse.</p></div><form onSubmit={createStudioBrief}><label htmlFor="studio-topic">¿Qué propiedad quieres presentar?</label><input id="studio-topic" placeholder="Ej. Apartamento con terraza en El Poblado" value={studioTopic} onChange={(event) => setStudioTopic(event.target.value)} /><button className="button button-primary" type="submit">Crear brief AI →</button>{studioMessage && <small className="form-feedback">{studioMessage} {videos.length ? `· ${videos.length} briefs en cola` : ''}</small>}</form></section></>}

            <footer id="contacto" className="site-footer"><div className="footer-brand"><a className="brand" href="#inicio"><span className="stickman-logo" aria-hidden="true"><span className="logo-head" /><span className="logo-body" /><span className="logo-arm logo-arm-left" /><span className="logo-arm logo-arm-right" /><span className="logo-leg logo-leg-left" /><span className="logo-leg logo-leg-right" /></span><span><strong>STICKMAN URQUIJO</strong><small>BROKERS DE INMUEBLES</small></span></a><p>Tu próxima dirección empieza con una conversación.</p></div><div className="footer-column"><b>Hablemos</b><a href="tel:+576015802040">+57 601 580 2040</a><a href="mailto:hola@urquijobrokers.com">hola@urquijobrokers.com</a><span>Lun–Sáb · 8:00–18:00</span></div><div className="footer-column"><b>Encuéntranos</b><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram ↗</a><a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook ↗</a><a href="https://x.com" target="_blank" rel="noreferrer">X / Twitter ↗</a></div><div className="footer-column"><b>Atención</b><span>Call center humano + AI</span><span>Seguridad y privacidad</span><span>© 2026 Urquijo</span></div></footer>
            <button className="stickman-companion" onClick={() => setChatOpen(true)} type="button" aria-label="Abrir conversación con Stickman"><span className="companion-figure"><img src="/stickman-salesman.png" alt="" /></span><span className="companion-label"><b>STICKMAN AI</b><small>¿Te ayudo a encontrar?</small></span><span className="companion-pulse" /></button>

            {chatOpen && <div className="overlay" role="presentation" onClick={() => setChatOpen(false)}><section className="assistant-drawer" role="dialog" aria-modal="true" aria-label="Asistente Stickman" onClick={(event) => event.stopPropagation()}><div className="drawer-heading"><div><span className="live-pill"><i /> STICKMAN AI · SALESMAN</span><h2>Tu asesor, cuando quieras.</h2></div><button onClick={() => setChatOpen(false)} type="button" aria-label="Cerrar asistente">×</button></div><div className="salesman-card"><img src="/stickman-salesman.png" alt="Stickman, asesor inmobiliario" /><div><b>Hola, soy Stickman.</b><span>Háblame o escríbeme. Estoy listo para ayudarte a encontrar tu próxima propiedad.</span></div></div><div className="voice-controls"><button className={listening ? 'voice-active' : ''} onClick={toggleListening} type="button">{listening ? '● Escuchando...' : '◉ Hablar con Stickman'}</button><button className={voiceEnabled ? 'voice-on' : ''} onClick={() => setVoiceEnabled((enabled) => !enabled)} type="button" aria-label="Activar o desactivar respuestas habladas">{voiceEnabled ? '◖ Voz activa' : '◌ Voz apagada'}</button></div><div className="chat-messages">{messages.map((message, index) => <div className={`chat-bubble ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === 'assistant' ? 'S' : 'T'}</span><p>{message.text}</p></div>)}{chatBusy && <div className="chat-bubble assistant"><span>S</span><p>Estoy pensando<span className="typing">...</span></p></div>}</div><div className="quick-prompts"><button onClick={() => setChatInput('Quiero comprar una casa de hasta 1.000 millones')} type="button">Buscar por presupuesto</button><button onClick={() => setChatInput('Quiero agendar una visita')} type="button">Agendar visita</button></div><form className="chat-input" onSubmit={sendMessage}><input autoFocus placeholder="Escribe tu pregunta..." value={chatInput} onChange={(event) => setChatInput(event.target.value)} /><button type="button" onClick={toggleListening} aria-label="Dictar pregunta">🎙</button><button type="submit">↑</button></form><small className="human-note">Si prefieres hablar con una persona: <a href="tel:+576015802040">llama a nuestro call center</a>.</small></section></div>}
            {cartOpen && <div className="overlay" role="presentation" onClick={() => setCartOpen(false)}><section className="side-panel" role="dialog" aria-modal="true" aria-label="Mi bolsa" onClick={(event) => event.stopPropagation()}><div className="drawer-heading"><div><span className="eyebrow">Tu proceso de compra</span><h2>Mi bolsa <small>{cart.length} guardadas</small></h2></div><button onClick={() => setCartOpen(false)} type="button" aria-label="Cerrar bolsa">×</button></div>{cart.length === 0 ? <div className="empty-bag"><span>⌂</span><p>Aún no has guardado propiedades.</p><button className="button button-primary" onClick={() => setCartOpen(false)} type="button">Seguir explorando</button></div> : <><div className="bag-list">{cart.map((property) => <div className="bag-item" key={property.id}><img src={property.image} alt="" /><div><b>{property.title}</b><span>{property.location}</span><strong>{money(property.price)}</strong></div><button onClick={() => setCart((current) => current.filter((item) => item.id !== property.id))} type="button">×</button></div>)}</div><div className="bag-next"><p>Próximo paso</p><b>Solicitar recorrido privado</b><button className="button button-primary" onClick={() => setChatOpen(true)} type="button">Hablar con un asesor →</button></div></>}</section></div>}
            {loginOpen && <div className="overlay" role="presentation" onClick={() => setLoginOpen(false)}><section className="login-modal" role="dialog" aria-modal="true" aria-label="Iniciar sesión" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setLoginOpen(false)} type="button">×</button><span className="login-mark">S</span><p className="eyebrow">Tu espacio Urquijo</p><h2>Todo tu proceso,<br /><em>en un solo lugar.</em></h2><p>Guarda propiedades, revisa solicitudes, documentos, pagos y el seguimiento de tus visitas.</p><input placeholder="Correo electrónico" type="email" /><input placeholder="Contraseña" type="password" /><button className="button button-primary" onClick={() => setLoginOpen(false)} type="button">Entrar a mi cuenta →</button><small>¿Eres propietario? <button onClick={() => { setLoginOpen(false); setActiveView('owner'); }} type="button">Gestiona tu inventario</button></small></section></div>}
        </main>
    );
}

function OwnerDashboard({ onBack }: { onBack: () => void }) {
    return <section className="owner-dashboard"><div className="owner-welcome"><button className="back-link" onClick={onBack} type="button">← Volver al catálogo</button><p className="eyebrow">Portal de propietarios</p><h1>Buenos días, <em>Camila.</em></h1><p>Todo lo que pasa con tu propiedad, en una vista clara.</p><button className="button button-primary" type="button">Publicar nueva propiedad +</button></div><div className="owner-stats"><div><span>Propiedades activas</span><b>04</b><small>+1 este mes</small></div><div><span>Solicitudes nuevas</span><b>12</b><small className="warm">3 requieren respuesta</small></div><div><span>Visitas agendadas</span><b>08</b><small>Próxima hoy · 16:30</small></div><div><span>Interesados</span><b>47</b><small>+18% vs. mes anterior</small></div></div><div className="owner-content"><section className="owner-table"><div className="owner-heading"><div><p className="eyebrow">Inventario</p><h2>Tus propiedades</h2></div><button type="button">Ver reportes ↗</button></div>{properties.slice(0, 3).map((property) => <div className="owner-property" key={property.id}><img src={property.image} alt="" /><div><b>{property.title}</b><span>{property.location}</span></div><span className="owner-status">ACTIVA</span><strong>{money(property.price)}</strong><button type="button">•••</button></div>)}</section><aside className="owner-activity"><p className="eyebrow">Seguimiento en vivo</p><h2>Lo que necesita tu atención.</h2><div><span className="activity-dot coral" /><p><b>Nueva solicitud</b><br />Andrés quiere visitar Casa Patio del Prado <small>Hace 18 min</small></p></div><div><span className="activity-dot mint" /><p><b>Pago confirmado</b><br />Reserva procesada correctamente <small>Hoy · 09:42</small></p></div><div><span className="activity-dot yellow" /><p><b>Reclamo abierto</b><br />Ticket #URQ-204 requiere respuesta <small>Ayer · 17:20</small></p></div><button className="text-link" type="button">Ver centro de operaciones →</button></aside></div></section>;
}
