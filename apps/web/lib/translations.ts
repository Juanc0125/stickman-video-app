export type SiteLanguage = 'es' | 'en' | 'zh' | 'ar' | 'fr';

export const LANGUAGE_OPTIONS: { value: SiteLanguage; label: string; locale: string }[] = [
    { value: 'es', label: 'Español', locale: 'es-CO' },
    { value: 'en', label: 'English', locale: 'en-US' },
    { value: 'zh', label: '中文', locale: 'zh-CN' },
    { value: 'ar', label: 'العربية', locale: 'ar-SA' },
    { value: 'fr', label: 'Français', locale: 'fr-FR' },
];

export function localeFor(language: SiteLanguage) {
    return LANGUAGE_OPTIONS.find((option) => option.value === language)?.locale ?? 'es-CO';
}

// Right-to-left languages need the page direction flipped.
export function dirFor(language: SiteLanguage) {
    return language === 'ar' ? 'rtl' : 'ltr';
}

type Keys =
    | 'nav.propiedades' | 'nav.herramientas' | 'nav.firma' | 'nav.contacto'
    | 'header.administrador' | 'header.verCatalogo' | 'header.iniciarSesion' | 'header.bolsa'
    | 'hero.eyebrow' | 'hero.h1Line1' | 'hero.h1Em' | 'hero.copy' | 'hero.ctaExplorar' | 'hero.ctaHablar'
    | 'hero.trust1Label' | 'hero.trust2Label' | 'hero.trust3Label'
    | 'heroNote.label' | 'heroNote.title'
    | 'properties.eyebrow' | 'properties.h2Line1' | 'properties.h2Em' | 'properties.intro'
    | 'properties.searchPlaceholder' | 'properties.filterTodos' | 'properties.filterCasa' | 'properties.filterApartamento' | 'properties.filterLoft'
    | 'properties.resultadosSuffix'
    | 'property.habAbbrev' | 'property.banosAbbrev' | 'property.areaUnit' | 'property.addToBag' | 'property.inBag' | 'property.save'
    | 'tools.eyebrow' | 'tools.h2Line1' | 'tools.h2Em' | 'tools.intro'
    | 'tools.card1Title' | 'tools.card1Desc' | 'tools.card1Cta'
    | 'tools.card2Title' | 'tools.card2Desc' | 'tools.card2Cta'
    | 'tools.card3Title' | 'tools.card3Desc' | 'tools.card3Cta'
    | 'about.eyebrow' | 'about.h2Line1' | 'about.h2Em' | 'about.body' | 'about.linkText'
    | 'about.fact1' | 'about.fact2' | 'about.fact3'
    | 'studio.eyebrow' | 'studio.h2Line1' | 'studio.h2Em' | 'studio.body' | 'studio.label' | 'studio.placeholder' | 'studio.button'
    | 'studio.successMsg' | 'studio.errorMsg' | 'studio.queueSuffix'
    | 'footer.tagline' | 'footer.col1Title' | 'footer.hours' | 'footer.col2Title' | 'footer.col3Title' | 'footer.callcenter' | 'footer.security' | 'footer.copyright'
    | 'companion.label' | 'companion.sublabel' | 'companion.ariaLabel'
    | 'chat.title' | 'chat.heading' | 'chat.close'
    | 'chat.salesmanGreeting' | 'chat.salesmanSub'
    | 'chat.listeningLabel' | 'chat.talkLabel' | 'chat.voiceOn' | 'chat.voiceOff'
    | 'chat.quick1' | 'chat.quick2' | 'chat.placeholder' | 'chat.dictateAria' | 'chat.humanNote' | 'chat.welcomeMessage'
    | 'chat.noSpeechSupport' | 'chat.genericFallback' | 'chat.connectionError'
    | 'cart.eyebrow' | 'cart.heading' | 'cart.savedSuffix' | 'cart.close' | 'cart.emptyText' | 'cart.emptyCta'
    | 'cart.nextStepLabel' | 'cart.nextStepTitle' | 'cart.nextStepCta'
    | 'login.eyebrow' | 'login.h2Line1' | 'login.h2Em' | 'login.body' | 'login.emailPlaceholder' | 'login.passwordPlaceholder'
    | 'login.submit' | 'login.adminQuestion' | 'login.adminCta'
    | 'calculator.eyebrow' | 'calculator.h2Line1' | 'calculator.h2Em' | 'calculator.body'
    | 'calculator.amountLabel' | 'calculator.rateLabel' | 'calculator.yearsLabel'
    | 'calculator.monthlyLabel' | 'calculator.totalLabel' | 'calculator.interestLabel' | 'calculator.ctaTalk' | 'calculator.disclaimer'
    | 'music.play' | 'music.pause' | 'music.error';

type Dictionary = Record<Keys, string>;

const es: Dictionary = {
    'nav.propiedades': 'Propiedades', 'nav.herramientas': 'Herramientas', 'nav.firma': 'La firma', 'nav.contacto': 'Contacto',
    'header.administrador': 'Administrador', 'header.verCatalogo': 'Ver catálogo', 'header.iniciarSesion': 'Iniciar sesión', 'header.bolsa': 'Bolsa',
    'hero.eyebrow': 'Decisiones inmobiliarias, mejor acompañadas', 'hero.h1Line1': 'Encuentra el lugar', 'hero.h1Em': 'que se siente tuyo.',
    'hero.copy': 'Somos los hermanos Urquijo: una firma boutique que combina criterio local, negociación transparente y tecnología para hacer más simple comprar, vender o invertir.',
    'hero.ctaExplorar': 'Explorar propiedades', 'hero.ctaHablar': 'Hablar con Stickman AI',
    'hero.trust1Label': 'años de experiencia', 'hero.trust2Label': 'operaciones acompañadas', 'hero.trust3Label': 'satisfacción',
    'heroNote.label': 'Propiedad destacada', 'heroNote.title': 'La calma también se compra',
    'properties.eyebrow': 'Inventario curado · actualizado hoy', 'properties.h2Line1': 'Propiedades con una historia', 'properties.h2Em': 'por contar.',
    'properties.intro': 'Desde tu primera búsqueda hasta la firma, te damos contexto para decidir con confianza.',
    'properties.searchPlaceholder': 'Buscar ciudad, barrio o propiedad', 'properties.filterTodos': 'Todos', 'properties.filterCasa': 'Casa', 'properties.filterApartamento': 'Apartamento', 'properties.filterLoft': 'Loft',
    'properties.resultadosSuffix': 'resultados',
    'property.habAbbrev': 'hab.', 'property.banosAbbrev': 'baños', 'property.areaUnit': 'm²', 'property.addToBag': 'Agregar a bolsa +', 'property.inBag': 'En tu bolsa ✓', 'property.save': 'Guardar',
    'tools.eyebrow': 'Herramientas Urquijo + Stickman', 'tools.h2Line1': 'Menos vueltas.', 'tools.h2Em': 'Más claridad.',
    'tools.intro': 'Inspiradas en las mejores experiencias de brokers digitales, reunimos en un solo lugar lo que necesitas para avanzar.',
    'tools.card1Title': 'Stickman AI', 'tools.card1Desc': 'Un asesor que entiende tu conversación, filtra el inventario y te conecta con una persona cuando la necesitas.', 'tools.card1Cta': 'Empezar conversación →',
    'tools.card2Title': 'Calcula tu capacidad', 'tools.card2Desc': 'Conoce una cuota orientativa para llegar preparado a tu próxima visita.', 'tools.card2Cta': 'Abrir calculadora →',
    'tools.card3Title': 'Compra sin perderte', 'tools.card3Desc': 'Guarda opciones en tu bolsa y sigue visitas, documentos, ofertas y próximos pasos.', 'tools.card3Cta': 'Ver mi bolsa →',
    'about.eyebrow': 'Una firma de hermanos', 'about.h2Line1': 'El criterio humano', 'about.h2Em': 'sigue siendo la diferencia.',
    'about.body': 'Urquijo Brokers nació entre dos hermanos y una convicción: una propiedad no es una ficha, es el comienzo de una etapa. Combinamos sensibilidad arquitectónica, datos honestos y negociación firme para cuidar cada decisión.',
    'about.linkText': 'Conoce nuestra forma de trabajar ↗',
    'about.fact1': 'Escuchamos antes de recomendar.', 'about.fact2': 'Mostramos el contexto completo.', 'about.fact3': 'Seguimos contigo hasta después de la firma.',
    'studio.eyebrow': 'Urquijo content desk', 'studio.h2Line1': 'Una propiedad bien contada', 'studio.h2Em': 'encuentra a su gente.',
    'studio.body': 'Genera un brief para que nuestro equipo cree un video de venta con Stickman AI. Todo contenido pasa por revisión humana antes de publicarse.',
    'studio.label': '¿Qué propiedad quieres presentar?', 'studio.placeholder': 'Ej. Apartamento con terraza en El Poblado', 'studio.button': 'Crear brief AI →',
    'studio.successMsg': 'Brief creado para revisión del equipo.', 'studio.errorMsg': 'No se pudo crear el brief.', 'studio.queueSuffix': 'briefs en cola',
    'footer.tagline': 'Tu próxima dirección empieza con una conversación.', 'footer.col1Title': 'Hablemos', 'footer.hours': 'Lun–Sáb · 8:00–18:00',
    'footer.col2Title': 'Encuéntranos', 'footer.col3Title': 'Atención', 'footer.callcenter': 'Call center humano + AI', 'footer.security': 'Seguridad y privacidad', 'footer.copyright': '© 2026 Urquijo',
    'companion.label': 'STICKMAN AI', 'companion.sublabel': '¿Te ayudo a encontrar?', 'companion.ariaLabel': 'Abrir conversación con Stickman. Mantén presionado y arrastra para moverlo por la pantalla.',
    'chat.title': 'STICKMAN AI · SALESMAN', 'chat.heading': 'Tu asesor, cuando quieras.', 'chat.close': 'Cerrar asistente',
    'chat.salesmanGreeting': 'Hola, soy Stickman.', 'chat.salesmanSub': 'Háblame o escríbeme. Estoy listo para ayudarte a encontrar tu próxima propiedad.',
    'chat.listeningLabel': '● Escuchando...', 'chat.talkLabel': '◉ Hablar con Stickman', 'chat.voiceOn': '◖ Voz activa', 'chat.voiceOff': '◌ Voz apagada',
    'chat.quick1': 'Quiero comprar una casa de hasta 1.000 millones', 'chat.quick2': 'Quiero agendar una visita', 'chat.placeholder': 'Escribe tu pregunta...', 'chat.dictateAria': 'Dictar pregunta',
    'chat.humanNote': 'Si prefieres hablar con una persona: ', 'chat.welcomeMessage': 'Hola, soy Stickman. Puedo encontrar propiedades según tu presupuesto, comparar opciones y coordinar una visita con un asesor humano.',
    'chat.noSpeechSupport': 'Tu navegador no habilita dictado por voz. Puedes escribirme o llamar al +57 601 580 2040.',
    'chat.genericFallback': 'Puedo ayudarte a comparar propiedades o agendar una llamada.',
    'chat.connectionError': 'Ahora mismo no puedo conectarme. Un asesor humano puede ayudarte en el +57 601 580 2040.',
    'cart.eyebrow': 'Tu proceso de compra', 'cart.heading': 'Mi bolsa', 'cart.savedSuffix': 'guardadas', 'cart.close': 'Cerrar bolsa',
    'cart.emptyText': 'Aún no has guardado propiedades.', 'cart.emptyCta': 'Seguir explorando',
    'cart.nextStepLabel': 'Próximo paso', 'cart.nextStepTitle': 'Solicitar recorrido privado', 'cart.nextStepCta': 'Hablar con un asesor →',
    'login.eyebrow': 'Tu espacio Urquijo', 'login.h2Line1': 'Todo tu proceso,', 'login.h2Em': 'en un solo lugar.',
    'login.body': 'Guarda propiedades, revisa solicitudes, documentos, pagos y el seguimiento de tus visitas.',
    'login.emailPlaceholder': 'Correo electrónico', 'login.passwordPlaceholder': 'Contraseña', 'login.submit': 'Entrar a mi cuenta →',
    'login.adminQuestion': '¿Eres administrador?', 'login.adminCta': 'Gestiona el inventario',
    'calculator.eyebrow': 'Herramienta Urquijo', 'calculator.h2Line1': 'Calcula tu', 'calculator.h2Em': 'capacidad.',
    'calculator.body': 'Estima una cuota mensual orientativa según el monto, la tasa y el plazo.',
    'calculator.amountLabel': 'Monto del crédito', 'calculator.rateLabel': 'Tasa anual (%)', 'calculator.yearsLabel': 'Plazo (años)',
    'calculator.monthlyLabel': 'Cuota mensual estimada', 'calculator.totalLabel': 'Total a pagar', 'calculator.interestLabel': 'Intereses totales',
    'calculator.ctaTalk': 'Hablar con Stickman sobre esto →', 'calculator.disclaimer': 'Guía educativa; no reemplaza una oferta formal.',
    'music.play': 'Reproducir musica', 'music.pause': 'Pausar musica', 'music.error': 'No se pudo reproducir la musica.',
};

const en: Dictionary = {
    'nav.propiedades': 'Properties', 'nav.herramientas': 'Tools', 'nav.firma': 'The firm', 'nav.contacto': 'Contact',
    'header.administrador': 'Admin', 'header.verCatalogo': 'View catalog', 'header.iniciarSesion': 'Sign in', 'header.bolsa': 'Bag',
    'hero.eyebrow': 'Real estate decisions, better supported', 'hero.h1Line1': 'Find the place', 'hero.h1Em': 'that feels like yours.',
    'hero.copy': 'We are the Urquijo brothers: a boutique firm that combines local judgment, transparent negotiation, and technology to make buying, selling, or investing simpler.',
    'hero.ctaExplorar': 'Explore properties', 'hero.ctaHablar': 'Talk to Stickman AI',
    'hero.trust1Label': 'years of experience', 'hero.trust2Label': 'deals supported', 'hero.trust3Label': 'satisfaction',
    'heroNote.label': 'Featured property', 'heroNote.title': 'Calm is worth buying too',
    'properties.eyebrow': 'Curated inventory · updated today', 'properties.h2Line1': 'Properties with a story', 'properties.h2Em': 'worth telling.',
    'properties.intro': 'From your first search to closing, we give you context to decide with confidence.',
    'properties.searchPlaceholder': 'Search city, neighborhood, or property', 'properties.filterTodos': 'All', 'properties.filterCasa': 'House', 'properties.filterApartamento': 'Apartment', 'properties.filterLoft': 'Loft',
    'properties.resultadosSuffix': 'results',
    'property.habAbbrev': 'bd', 'property.banosAbbrev': 'ba', 'property.areaUnit': 'm²', 'property.addToBag': 'Add to bag +', 'property.inBag': 'In your bag ✓', 'property.save': 'Save',
    'tools.eyebrow': 'Urquijo + Stickman tools', 'tools.h2Line1': 'Fewer detours.', 'tools.h2Em': 'More clarity.',
    'tools.intro': 'Inspired by the best digital broker experiences, we bring together in one place what you need to move forward.',
    'tools.card1Title': 'Stickman AI', 'tools.card1Desc': 'An advisor that understands your conversation, filters the inventory, and connects you with a person when you need one.', 'tools.card1Cta': 'Start conversation →',
    'tools.card2Title': 'Calculate your capacity', 'tools.card2Desc': 'Get an estimated payment so you arrive prepared for your next visit.', 'tools.card2Cta': 'Open calculator →',
    'tools.card3Title': 'Shop without losing track', 'tools.card3Desc': 'Save options in your bag and track visits, documents, offers, and next steps.', 'tools.card3Cta': 'View my bag →',
    'about.eyebrow': 'A firm of brothers', 'about.h2Line1': 'Human judgment', 'about.h2Em': 'is still the difference.',
    'about.body': 'Urquijo Brokers was born between two brothers and one conviction: a property is not a spreadsheet row, it is the start of a new chapter. We combine architectural sensitivity, honest data, and firm negotiation to look after every decision.',
    'about.linkText': 'See how we work ↗',
    'about.fact1': 'We listen before we recommend.', 'about.fact2': 'We show the full context.', 'about.fact3': 'We stay with you even after closing.',
    'studio.eyebrow': 'Urquijo content desk', 'studio.h2Line1': 'A well-told property', 'studio.h2Em': 'finds its people.',
    'studio.body': 'Generate a brief so our team can create a sales video with Stickman AI. All content goes through human review before publishing.',
    'studio.label': 'Which property do you want to feature?', 'studio.placeholder': 'E.g. Apartment with terrace in El Poblado', 'studio.button': 'Create AI brief →',
    'studio.successMsg': 'Brief created for team review.', 'studio.errorMsg': 'Could not create the brief.', 'studio.queueSuffix': 'briefs queued',
    'footer.tagline': 'Your next address starts with a conversation.', 'footer.col1Title': "Let's talk", 'footer.hours': 'Mon–Sat · 8:00–18:00',
    'footer.col2Title': 'Find us', 'footer.col3Title': 'Support', 'footer.callcenter': 'Human + AI call center', 'footer.security': 'Security and privacy', 'footer.copyright': '© 2026 Urquijo',
    'companion.label': 'STICKMAN AI', 'companion.sublabel': 'Need help finding something?', 'companion.ariaLabel': 'Open conversation with Stickman. Press and hold to drag it anywhere on screen.',
    'chat.title': 'STICKMAN AI · SALESMAN', 'chat.heading': 'Your advisor, whenever you want.', 'chat.close': 'Close assistant',
    'chat.salesmanGreeting': "Hi, I'm Stickman.", 'chat.salesmanSub': "Talk or type to me. I'm ready to help you find your next property.",
    'chat.listeningLabel': '● Listening...', 'chat.talkLabel': '◉ Talk to Stickman', 'chat.voiceOn': '◖ Voice on', 'chat.voiceOff': '◌ Voice off',
    'chat.quick1': 'I want to buy a house up to 250,000 USD', 'chat.quick2': 'I want to book a visit', 'chat.placeholder': 'Type your question...', 'chat.dictateAria': 'Dictate question',
    'chat.humanNote': "If you'd rather talk to a person: ", 'chat.welcomeMessage': 'Hi, I\'m Stickman. I can find properties based on your budget, compare options, and set up a visit with a human advisor.',
    'chat.noSpeechSupport': "Your browser doesn't support voice dictation. You can type to me or call +57 601 580 2040.",
    'chat.genericFallback': 'I can help you compare properties or schedule a call.',
    'chat.connectionError': "I can't connect right now. A human advisor can help you at +57 601 580 2040.",
    'cart.eyebrow': 'Your buying journey', 'cart.heading': 'My bag', 'cart.savedSuffix': 'saved', 'cart.close': 'Close bag',
    'cart.emptyText': "You haven't saved any properties yet.", 'cart.emptyCta': 'Keep exploring',
    'cart.nextStepLabel': 'Next step', 'cart.nextStepTitle': 'Request a private tour', 'cart.nextStepCta': 'Talk to an advisor →',
    'login.eyebrow': 'Your Urquijo space', 'login.h2Line1': 'Your whole process,', 'login.h2Em': 'in one place.',
    'login.body': 'Save properties, review requests, documents, payments, and follow up on your visits.',
    'login.emailPlaceholder': 'Email', 'login.passwordPlaceholder': 'Password', 'login.submit': 'Sign in to my account →',
    'login.adminQuestion': 'Are you an admin?', 'login.adminCta': 'Manage the inventory',
    'calculator.eyebrow': 'Urquijo tool', 'calculator.h2Line1': 'Calculate your', 'calculator.h2Em': 'capacity.',
    'calculator.body': 'Estimate a monthly payment based on the amount, rate, and term.',
    'calculator.amountLabel': 'Loan amount', 'calculator.rateLabel': 'Annual rate (%)', 'calculator.yearsLabel': 'Term (years)',
    'calculator.monthlyLabel': 'Estimated monthly payment', 'calculator.totalLabel': 'Total to pay', 'calculator.interestLabel': 'Total interest',
    'calculator.ctaTalk': 'Talk to Stickman about this →', 'calculator.disclaimer': 'Educational guide; does not replace a formal offer.',
    'music.play': 'Play music', 'music.pause': 'Pause music', 'music.error': 'Could not play the music.',
};

const zh: Dictionary = {
    'nav.propiedades': '房产', 'nav.herramientas': '工具', 'nav.firma': '关于我们', 'nav.contacto': '联系我们',
    'header.administrador': '管理员', 'header.verCatalogo': '查看目录', 'header.iniciarSesion': '登录', 'header.bolsa': '收藏袋',
    'hero.eyebrow': '更贴心的房产决策', 'hero.h1Line1': '找到那个', 'hero.h1Em': '属于你的地方。',
    'hero.copy': '我们是Urquijo兄弟:一家精品经纪公司,结合本地经验、透明谈判和技术,让买卖或投资房产更简单。',
    'hero.ctaExplorar': '浏览房产', 'hero.ctaHablar': '与Stickman AI对话',
    'hero.trust1Label': '年经验', 'hero.trust2Label': '成功交易', 'hero.trust3Label': '满意度',
    'heroNote.label': '精选房产', 'heroNote.title': '宁静也值得投资',
    'properties.eyebrow': '精选库存 · 今日更新', 'properties.h2Line1': '每套房产', 'properties.h2Em': '都有故事。',
    'properties.intro': '从第一次搜索到最终签约,我们为你提供全面信息,助你自信决策。',
    'properties.searchPlaceholder': '搜索城市、社区或房产', 'properties.filterTodos': '全部', 'properties.filterCasa': '独栋房屋', 'properties.filterApartamento': '公寓', 'properties.filterLoft': 'loft',
    'properties.resultadosSuffix': '个结果',
    'property.habAbbrev': '卧室', 'property.banosAbbrev': '浴室', 'property.areaUnit': '平方米', 'property.addToBag': '加入收藏袋 +', 'property.inBag': '已在收藏袋 ✓', 'property.save': '收藏',
    'tools.eyebrow': 'Urquijo + Stickman 工具', 'tools.h2Line1': '少走弯路。', 'tools.h2Em': '更清晰。',
    'tools.intro': '汲取顶尖数字经纪体验的灵感,我们把你所需要的一切都汇聚在一处。',
    'tools.card1Title': 'Stickman AI', 'tools.card1Desc': '一个能理解你对话、筛选房源,并在你需要时为你连接真人顾问的助手。', 'tools.card1Cta': '开始对话 →',
    'tools.card2Title': '计算你的承受能力', 'tools.card2Desc': '了解一个参考月供,让你为下次看房做好准备。', 'tools.card2Cta': '打开计算器 →',
    'tools.card3Title': '轻松购房不迷路', 'tools.card3Desc': '在收藏袋中保存选项,跟踪看房、文件、报价和下一步。', 'tools.card3Cta': '查看我的收藏袋 →',
    'about.eyebrow': '兄弟携手创立', 'about.h2Line1': '人性化的判断', 'about.h2Em': '依然是关键所在。',
    'about.body': 'Urquijo Brokers诞生于两兄弟的信念:一套房产不只是一行数据,而是人生新篇章的开始。我们结合建筑美感、真实数据和坚定谈判,悉心对待每一个决定。',
    'about.linkText': '了解我们的工作方式 ↗',
    'about.fact1': '我们先倾听,再推荐。', 'about.fact2': '我们展示完整信息。', 'about.fact3': '签约之后我们依然陪伴你。',
    'studio.eyebrow': 'Urquijo 内容工作室', 'studio.h2Line1': '讲得好的房产故事', 'studio.h2Em': '能找到属于它的人。',
    'studio.body': '生成一份简报,让我们的团队用Stickman AI制作销售视频。所有内容在发布前都经过人工审核。',
    'studio.label': '你想展示哪套房产?', 'studio.placeholder': '例如:El Poblado带露台的公寓', 'studio.button': '创建AI简报 →',
    'studio.successMsg': '简报已创建,等待团队审核。', 'studio.errorMsg': '无法创建简报。', 'studio.queueSuffix': '份简报排队中',
    'footer.tagline': '你的下一个家,从一次对话开始。', 'footer.col1Title': '联系我们', 'footer.hours': '周一至周六 · 8:00–18:00',
    'footer.col2Title': '关注我们', 'footer.col3Title': '客户支持', 'footer.callcenter': '真人 + AI 客服中心', 'footer.security': '安全与隐私', 'footer.copyright': '© 2026 Urquijo',
    'companion.label': 'STICKMAN AI', 'companion.sublabel': '需要帮忙找房吗?', 'companion.ariaLabel': '打开与Stickman的对话。按住并拖动可将它移到屏幕任意位置。',
    'chat.title': 'STICKMAN AI · 销售顾问', 'chat.heading': '你的顾问,随时为你服务。', 'chat.close': '关闭助手',
    'chat.salesmanGreeting': '你好,我是Stickman。', 'chat.salesmanSub': '跟我说话或打字。我随时准备帮你找到下一套房产。',
    'chat.listeningLabel': '● 正在聆听...', 'chat.talkLabel': '◉ 和Stickman说话', 'chat.voiceOn': '◖ 语音已开启', 'chat.voiceOff': '◌ 语音已关闭',
    'chat.quick1': '我想买一套预算25万美元以内的房子', 'chat.quick2': '我想预约看房', 'chat.placeholder': '输入你的问题...', 'chat.dictateAria': '语音输入问题',
    'chat.humanNote': '如果你更想和真人交流:', 'chat.welcomeMessage': '你好,我是Stickman。我可以根据你的预算寻找房产、比较不同选项,并为你安排真人顾问看房。',
    'chat.noSpeechSupport': '你的浏览器不支持语音输入。你可以打字给我,或致电 +57 601 580 2040。',
    'chat.genericFallback': '我可以帮你比较房产或安排一通电话。',
    'chat.connectionError': '现在无法连接。真人顾问可以通过 +57 601 580 2040 帮助你。',
    'cart.eyebrow': '你的购房流程', 'cart.heading': '我的收藏袋', 'cart.savedSuffix': '个已保存', 'cart.close': '关闭收藏袋',
    'cart.emptyText': '你还没有保存任何房产。', 'cart.emptyCta': '继续浏览',
    'cart.nextStepLabel': '下一步', 'cart.nextStepTitle': '预约私人看房', 'cart.nextStepCta': '联系顾问 →',
    'login.eyebrow': '你的Urquijo专属空间', 'login.h2Line1': '所有流程,', 'login.h2Em': '一处搞定。',
    'login.body': '保存房产、查看申请、文件、付款并跟踪你的看房进度。',
    'login.emailPlaceholder': '电子邮箱', 'login.passwordPlaceholder': '密码', 'login.submit': '登录我的账户 →',
    'login.adminQuestion': '你是管理员吗?', 'login.adminCta': '管理房源库存',
    'calculator.eyebrow': 'Urquijo 工具', 'calculator.h2Line1': '计算你的', 'calculator.h2Em': '承受能力。',
    'calculator.body': '根据金额、利率和期限,估算一个月供参考值。',
    'calculator.amountLabel': '贷款金额', 'calculator.rateLabel': '年利率 (%)', 'calculator.yearsLabel': '期限(年)',
    'calculator.monthlyLabel': '预计月供', 'calculator.totalLabel': '总还款额', 'calculator.interestLabel': '总利息',
    'calculator.ctaTalk': '和Stickman聊聊这个 →', 'calculator.disclaimer': '仅供参考,不能替代正式报价。',
    'music.play': '播放音乐', 'music.pause': '暂停音乐', 'music.error': '无法播放音乐。',
};

const ar: Dictionary = {
    'nav.propiedades': 'العقارات', 'nav.herramientas': 'الأدوات', 'nav.firma': 'الشركة', 'nav.contacto': 'اتصل بنا',
    'header.administrador': 'المسؤول', 'header.verCatalogo': 'عرض الكتالوج', 'header.iniciarSesion': 'تسجيل الدخول', 'header.bolsa': 'حقيبتي',
    'hero.eyebrow': 'قرارات عقارية أكثر دعماً', 'hero.h1Line1': 'اعثر على المكان', 'hero.h1Em': 'الذي يشعرك بالانتماء.',
    'hero.copy': 'نحن الأخوان أوركيخو: شركة عقارية متخصصة تجمع بين المعرفة المحلية والتفاوض الشفاف والتكنولوجيا لتسهيل الشراء أو البيع أو الاستثمار.',
    'hero.ctaExplorar': 'استكشف العقارات', 'hero.ctaHablar': 'تحدث مع Stickman AI',
    'hero.trust1Label': 'سنوات خبرة', 'hero.trust2Label': 'صفقة منجزة', 'hero.trust3Label': 'نسبة الرضا',
    'heroNote.label': 'عقار مميز', 'heroNote.title': 'الهدوء أيضاً يستحق الشراء',
    'properties.eyebrow': 'مخزون منتقى · محدث اليوم', 'properties.h2Line1': 'عقارات لها قصة', 'properties.h2Em': 'تستحق أن تُروى.',
    'properties.intro': 'من أول بحث إلى توقيع العقد، نمنحك السياق الكامل لتقرر بثقة.',
    'properties.searchPlaceholder': 'ابحث عن مدينة أو حي أو عقار', 'properties.filterTodos': 'الكل', 'properties.filterCasa': 'منزل', 'properties.filterApartamento': 'شقة', 'properties.filterLoft': 'لوفت',
    'properties.resultadosSuffix': 'نتيجة',
    'property.habAbbrev': 'غرف', 'property.banosAbbrev': 'حمامات', 'property.areaUnit': 'م²', 'property.addToBag': 'أضف إلى الحقيبة +', 'property.inBag': 'في حقيبتك ✓', 'property.save': 'حفظ',
    'tools.eyebrow': 'أدوات Urquijo + Stickman', 'tools.h2Line1': 'خطوات أقل.', 'tools.h2Em': 'وضوح أكبر.',
    'tools.intro': 'مستوحاة من أفضل تجارب الوسطاء الرقميين، نجمع في مكان واحد كل ما تحتاجه للمضي قدماً.',
    'tools.card1Title': 'Stickman AI', 'tools.card1Desc': 'مستشار يفهم حديثك، يصفي المخزون، ويوصلك بشخص حقيقي عند الحاجة.', 'tools.card1Cta': 'ابدأ المحادثة ←',
    'tools.card2Title': 'احسب قدرتك المالية', 'tools.card2Desc': 'تعرف على قسط تقريبي لتصل مستعداً لزيارتك القادمة.', 'tools.card2Cta': 'افتح الحاسبة ←',
    'tools.card3Title': 'تسوق دون أن تضيع', 'tools.card3Desc': 'احفظ الخيارات في حقيبتك وتابع الزيارات والمستندات والعروض والخطوات التالية.', 'tools.card3Cta': 'عرض حقيبتي ←',
    'about.eyebrow': 'شركة أسسها أخوان', 'about.h2Line1': 'الحكمة الإنسانية', 'about.h2Em': 'لا تزال هي الفارق.',
    'about.body': 'وُلدت Urquijo Brokers بين أخوين وقناعة واحدة: العقار ليس مجرد بيانات، بل بداية مرحلة جديدة. نجمع بين الحس المعماري والبيانات الصادقة والتفاوض الحازم للاعتناء بكل قرار.',
    'about.linkText': 'تعرف على طريقة عملنا ←',
    'about.fact1': 'نستمع قبل أن ننصح.', 'about.fact2': 'نعرض السياق الكامل.', 'about.fact3': 'نبقى معك حتى بعد التوقيع.',
    'studio.eyebrow': 'مكتب محتوى Urquijo', 'studio.h2Line1': 'العقار الذي يُروى جيداً', 'studio.h2Em': 'يجد أصحابه.',
    'studio.body': 'أنشئ ملخصاً ليقوم فريقنا بإنتاج فيديو ترويجي باستخدام Stickman AI. كل المحتوى يمر بمراجعة بشرية قبل النشر.',
    'studio.label': 'ما هو العقار الذي تريد عرضه؟', 'studio.placeholder': 'مثال: شقة بشرفة في El Poblado', 'studio.button': 'إنشاء ملخص بالذكاء الاصطناعي ←',
    'studio.successMsg': 'تم إنشاء الملخص لمراجعة الفريق.', 'studio.errorMsg': 'تعذر إنشاء الملخص.', 'studio.queueSuffix': 'ملخصاً في الانتظار',
    'footer.tagline': 'عنوانك القادم يبدأ بمحادثة.', 'footer.col1Title': 'تحدث معنا', 'footer.hours': 'الإثنين–السبت · 8:00–18:00',
    'footer.col2Title': 'تواصل معنا', 'footer.col3Title': 'الدعم', 'footer.callcenter': 'مركز اتصال بشري + ذكاء اصطناعي', 'footer.security': 'الأمان والخصوصية', 'footer.copyright': '© 2026 Urquijo',
    'companion.label': 'STICKMAN AI', 'companion.sublabel': 'هل تحتاج مساعدة في البحث؟', 'companion.ariaLabel': 'افتح محادثة مع Stickman. اضغط مطولاً واسحب لتحريكه في أي مكان على الشاشة.',
    'chat.title': 'STICKMAN AI · مستشار المبيعات', 'chat.heading': 'مستشارك، في أي وقت تريد.', 'chat.close': 'إغلاق المساعد',
    'chat.salesmanGreeting': 'مرحباً، أنا Stickman.', 'chat.salesmanSub': 'تحدث معي أو اكتب لي. أنا جاهز لمساعدتك في إيجاد عقارك القادم.',
    'chat.listeningLabel': '● أستمع...', 'chat.talkLabel': '◉ تحدث مع Stickman', 'chat.voiceOn': '◖ الصوت مفعّل', 'chat.voiceOff': '◌ الصوت متوقف',
    'chat.quick1': 'أريد شراء منزل بميزانية تصل إلى 250 ألف دولار', 'chat.quick2': 'أريد حجز زيارة', 'chat.placeholder': 'اكتب سؤالك...', 'chat.dictateAria': 'أملِ سؤالك',
    'chat.humanNote': 'إذا كنت تفضل التحدث مع شخص: ', 'chat.welcomeMessage': 'مرحباً، أنا Stickman. يمكنني إيجاد عقارات حسب ميزانيتك، مقارنة الخيارات، وترتيب زيارة مع مستشار بشري.',
    'chat.noSpeechSupport': 'متصفحك لا يدعم الإملاء الصوتي. يمكنك الكتابة لي أو الاتصال بالرقم ‎+57 601 580 2040.',
    'chat.genericFallback': 'يمكنني مساعدتك في مقارنة العقارات أو تحديد موعد مكالمة.',
    'chat.connectionError': 'لا يمكنني الاتصال الآن. يمكن لمستشار بشري مساعدتك على ‎+57 601 580 2040.',
    'cart.eyebrow': 'رحلتك في الشراء', 'cart.heading': 'حقيبتي', 'cart.savedSuffix': 'محفوظ', 'cart.close': 'إغلاق الحقيبة',
    'cart.emptyText': 'لم تحفظ أي عقارات بعد.', 'cart.emptyCta': 'واصل الاستكشاف',
    'cart.nextStepLabel': 'الخطوة التالية', 'cart.nextStepTitle': 'اطلب جولة خاصة', 'cart.nextStepCta': 'تحدث مع مستشار ←',
    'login.eyebrow': 'مساحتك في Urquijo', 'login.h2Line1': 'كل إجراءاتك،', 'login.h2Em': 'في مكان واحد.',
    'login.body': 'احفظ العقارات، راجع الطلبات والمستندات والمدفوعات وتابع زياراتك.',
    'login.emailPlaceholder': 'البريد الإلكتروني', 'login.passwordPlaceholder': 'كلمة المرور', 'login.submit': 'الدخول إلى حسابي ←',
    'login.adminQuestion': 'هل أنت مسؤول؟', 'login.adminCta': 'إدارة المخزون',
    'calculator.eyebrow': 'أداة Urquijo', 'calculator.h2Line1': 'احسب', 'calculator.h2Em': 'قدرتك المالية.',
    'calculator.body': 'قدّر قسطاً شهرياً تقريبياً بناءً على المبلغ والفائدة والمدة.',
    'calculator.amountLabel': 'مبلغ القرض', 'calculator.rateLabel': 'الفائدة السنوية (%)', 'calculator.yearsLabel': 'المدة (سنوات)',
    'calculator.monthlyLabel': 'القسط الشهري التقديري', 'calculator.totalLabel': 'إجمالي المبلغ المدفوع', 'calculator.interestLabel': 'إجمالي الفوائد',
    'calculator.ctaTalk': 'تحدث مع Stickman حول هذا ←', 'calculator.disclaimer': 'دليل تعليمي؛ لا يغني عن عرض رسمي.',
    'music.play': 'تشغيل الموسيقى', 'music.pause': 'إيقاف الموسيقى', 'music.error': 'تعذر تشغيل الموسيقى.',
};

const fr: Dictionary = {
    'nav.propiedades': 'Propriétés', 'nav.herramientas': 'Outils', 'nav.firma': 'La firme', 'nav.contacto': 'Contact',
    'header.administrador': 'Administrateur', 'header.verCatalogo': 'Voir le catalogue', 'header.iniciarSesion': 'Se connecter', 'header.bolsa': 'Sac',
    'hero.eyebrow': 'Des décisions immobilières mieux accompagnées', 'hero.h1Line1': 'Trouvez le lieu', 'hero.h1Em': 'qui vous ressemble.',
    'hero.copy': "Nous sommes les frères Urquijo : une agence boutique qui combine connaissance locale, négociation transparente et technologie pour simplifier l'achat, la vente ou l'investissement.",
    'hero.ctaExplorar': 'Explorer les propriétés', 'hero.ctaHablar': 'Parler à Stickman AI',
    'hero.trust1Label': "ans d'expérience", 'hero.trust2Label': 'transactions accompagnées', 'hero.trust3Label': 'satisfaction',
    'heroNote.label': 'Propriété en vedette', 'heroNote.title': 'Le calme aussi, ça s\'achète',
    'properties.eyebrow': 'Inventaire sélectionné · mis à jour aujourd\'hui', 'properties.h2Line1': 'Des propriétés avec une histoire', 'properties.h2Em': 'à raconter.',
    'properties.intro': 'De votre première recherche jusqu\'à la signature, nous vous donnons le contexte pour décider en confiance.',
    'properties.searchPlaceholder': 'Rechercher une ville, un quartier ou une propriété', 'properties.filterTodos': 'Tous', 'properties.filterCasa': 'Maison', 'properties.filterApartamento': 'Appartement', 'properties.filterLoft': 'Loft',
    'properties.resultadosSuffix': 'résultats',
    'property.habAbbrev': 'ch.', 'property.banosAbbrev': 'sdb', 'property.areaUnit': 'm²', 'property.addToBag': 'Ajouter au sac +', 'property.inBag': 'Dans votre sac ✓', 'property.save': 'Enregistrer',
    'tools.eyebrow': 'Outils Urquijo + Stickman', 'tools.h2Line1': 'Moins de détours.', 'tools.h2Em': 'Plus de clarté.',
    'tools.intro': "Inspirés des meilleures expériences de courtiers digitaux, nous réunissons en un seul endroit ce dont vous avez besoin pour avancer.",
    'tools.card1Title': 'Stickman AI', 'tools.card1Desc': 'Un conseiller qui comprend votre conversation, filtre l\'inventaire et vous met en relation avec une personne quand vous en avez besoin.', 'tools.card1Cta': 'Démarrer la conversation →',
    'tools.card2Title': 'Calculez votre capacité', 'tools.card2Desc': 'Obtenez une mensualité indicative pour arriver préparé à votre prochaine visite.', 'tools.card2Cta': 'Ouvrir la calculatrice →',
    'tools.card3Title': 'Achetez sans vous perdre', 'tools.card3Desc': 'Enregistrez des options dans votre sac et suivez visites, documents, offres et prochaines étapes.', 'tools.card3Cta': 'Voir mon sac →',
    'about.eyebrow': 'Une firme de frères', 'about.h2Line1': 'Le jugement humain', 'about.h2Em': 'reste la différence.',
    'about.body': "Urquijo Brokers est née entre deux frères et une conviction : une propriété n'est pas une ligne de données, c'est le début d'une nouvelle étape. Nous combinons sensibilité architecturale, données honnêtes et négociation ferme pour soigner chaque décision.",
    'about.linkText': 'Découvrez notre façon de travailler ↗',
    'about.fact1': "Nous écoutons avant de recommander.", 'about.fact2': 'Nous montrons le contexte complet.', 'about.fact3': "Nous restons avec vous même après la signature.",
    'studio.eyebrow': 'Urquijo content desk', 'studio.h2Line1': 'Une propriété bien racontée', 'studio.h2Em': 'trouve son public.',
    'studio.body': "Générez un brief pour que notre équipe crée une vidéo de vente avec Stickman AI. Tout contenu passe par une révision humaine avant publication.",
    'studio.label': 'Quelle propriété voulez-vous présenter ?', 'studio.placeholder': 'Ex. Appartement avec terrasse à El Poblado', 'studio.button': 'Créer un brief IA →',
    'studio.successMsg': "Brief créé pour révision par l'équipe.", 'studio.errorMsg': 'Impossible de créer le brief.', 'studio.queueSuffix': 'briefs en file',
    'footer.tagline': 'Votre prochaine adresse commence par une conversation.', 'footer.col1Title': 'Parlons-en', 'footer.hours': 'Lun–Sam · 8h00–18h00',
    'footer.col2Title': 'Retrouvez-nous', 'footer.col3Title': 'Assistance', 'footer.callcenter': 'Centre d\'appel humain + IA', 'footer.security': 'Sécurité et confidentialité', 'footer.copyright': '© 2026 Urquijo',
    'companion.label': 'STICKMAN AI', 'companion.sublabel': "Besoin d'aide pour chercher ?", 'companion.ariaLabel': 'Ouvrir la conversation avec Stickman. Maintenez appuyé et faites glisser pour le déplacer sur l\'écran.',
    'chat.title': 'STICKMAN AI · CONSEILLER', 'chat.heading': 'Votre conseiller, quand vous voulez.', 'chat.close': "Fermer l'assistant",
    'chat.salesmanGreeting': 'Bonjour, je suis Stickman.', 'chat.salesmanSub': "Parlez-moi ou écrivez-moi. Je suis prêt à vous aider à trouver votre prochaine propriété.",
    'chat.listeningLabel': '● Écoute en cours...', 'chat.talkLabel': '◉ Parler à Stickman', 'chat.voiceOn': '◖ Voix activée', 'chat.voiceOff': '◌ Voix désactivée',
    'chat.quick1': "Je veux acheter une maison jusqu'à 250 000 $", 'chat.quick2': 'Je veux réserver une visite', 'chat.placeholder': 'Écrivez votre question...', 'chat.dictateAria': 'Dicter la question',
    'chat.humanNote': 'Si vous préférez parler à une personne : ', 'chat.welcomeMessage': "Bonjour, je suis Stickman. Je peux trouver des propriétés selon votre budget, comparer les options et organiser une visite avec un conseiller humain.",
    'chat.noSpeechSupport': 'Votre navigateur ne prend pas en charge la dictée vocale. Vous pouvez m\'écrire ou appeler le +57 601 580 2040.',
    'chat.genericFallback': 'Je peux vous aider à comparer des propriétés ou planifier un appel.',
    'chat.connectionError': "Je ne peux pas me connecter pour le moment. Un conseiller humain peut vous aider au +57 601 580 2040.",
    'cart.eyebrow': "Votre parcours d'achat", 'cart.heading': 'Mon sac', 'cart.savedSuffix': 'enregistrées', 'cart.close': 'Fermer le sac',
    'cart.emptyText': "Vous n'avez pas encore enregistré de propriétés.", 'cart.emptyCta': 'Continuer à explorer',
    'cart.nextStepLabel': 'Prochaine étape', 'cart.nextStepTitle': 'Demander une visite privée', 'cart.nextStepCta': 'Parler à un conseiller →',
    'login.eyebrow': 'Votre espace Urquijo', 'login.h2Line1': 'Tout votre parcours,', 'login.h2Em': 'en un seul endroit.',
    'login.body': 'Enregistrez des propriétés, consultez demandes, documents, paiements et le suivi de vos visites.',
    'login.emailPlaceholder': 'E-mail', 'login.passwordPlaceholder': 'Mot de passe', 'login.submit': 'Accéder à mon compte →',
    'login.adminQuestion': 'Êtes-vous administrateur ?', 'login.adminCta': "Gérer l'inventaire",
    'calculator.eyebrow': 'Outil Urquijo', 'calculator.h2Line1': 'Calculez votre', 'calculator.h2Em': 'capacité.',
    'calculator.body': 'Estimez une mensualité indicative selon le montant, le taux et la durée.',
    'calculator.amountLabel': 'Montant du prêt', 'calculator.rateLabel': 'Taux annuel (%)', 'calculator.yearsLabel': 'Durée (années)',
    'calculator.monthlyLabel': 'Mensualité estimée', 'calculator.totalLabel': 'Total à payer', 'calculator.interestLabel': 'Intérêts totaux',
    'calculator.ctaTalk': 'Parler à Stickman de ceci →', 'calculator.disclaimer': "Guide éducatif ; ne remplace pas une offre formelle.",
    'music.play': 'Jouer la musique', 'music.pause': 'Mettre en pause', 'music.error': 'Impossible de lire la musique.',
};

export const TRANSLATIONS: Record<SiteLanguage, Dictionary> = { es, en, zh, ar, fr };

export function createTranslator(language: SiteLanguage) {
    const dict = TRANSLATIONS[language] ?? TRANSLATIONS.es;
    return (key: Keys) => dict[key] ?? TRANSLATIONS.es[key] ?? key;
}
