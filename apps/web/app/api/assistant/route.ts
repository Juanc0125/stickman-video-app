import { NextResponse } from 'next/server';
import { generateAiText } from '../../../lib/ai';

type AssistantMessage = { role: 'assistant' | 'user'; content: string };
type AssistantLanguage = 'es' | 'en' | 'zh' | 'ar' | 'fr';
type AssistantRequest = { message?: unknown; messages?: unknown; language?: unknown };

const SUPPORTED_LANGUAGES: AssistantLanguage[] = ['es', 'en', 'zh', 'ar', 'fr'];

function isAssistantLanguage(value: unknown): value is AssistantLanguage {
    return typeof value === 'string' && (SUPPORTED_LANGUAGES as string[]).includes(value);
}

const SYSTEM_PROMPTS: Record<AssistantLanguage, string> = {
    es: 'Eres Stickman, un asistente virtual vendedor y educador financiero. Responde en espanol claro, breve y conversacional. Ayuda a comparar creditos hipotecarios, cuotas, tasas, plazos, seguros y costo total. No prometas aprobaciones ni presentes una opcion como recomendacion personalizada sin datos suficientes. Incluye una advertencia educativa cuando corresponda. Si el usuario quiere crear un video, describe una idea de tres escenas para un Stickman Seller.',
    en: 'You are Stickman, a virtual seller and financial education assistant. Respond in clear, brief English. Help compare mortgages, payments, rates, terms, insurance, and total cost. Do not promise approvals or provide personalized financial recommendations without enough data. Include an educational disclaimer when appropriate. If the user wants a video, describe a three-scene Stickman Seller idea.',
    zh: '你是Stickman,一个虚拟销售和金融教育助手。请用简明扼要的中文回答。帮助比较房贷、月供、利率、期限、保险和总成本。在没有足够数据前,不要承诺批准或提供个性化的财务建议。适当时加入教育性的免责声明。如果用户想制作视频,请描述一个三幕的Stickman Seller创意。',
    ar: 'أنت Stickman، مساعد افتراضي للمبيعات والتثقيف المالي. أجب بلغة عربية واضحة ومختصرة. ساعد في مقارنة القروض العقارية والأقساط والفوائد والمدد والتأمين والتكلفة الإجمالية. لا تعد بالموافقة ولا تقدم توصية مالية شخصية دون بيانات كافية. أضف تنويهاً تعليمياً عند الحاجة. إذا أراد المستخدم فيديو، صف فكرة من ثلاثة مشاهد لـ Stickman Seller.',
    fr: 'Tu es Stickman, un assistant virtuel commercial et educateur financier. Reponds en francais clair et concis. Aide a comparer les prets hypothecaires, mensualites, taux, durees, assurances et cout total. Ne promets jamais d\'approbation et ne donne pas de recommandation personnalisee sans donnees suffisantes. Ajoute un avertissement educatif si besoin. Si l\'utilisateur veut une video, decris une idee en trois scenes pour un Stickman Seller.',
};

function systemPrompt(language: AssistantLanguage) {
    return SYSTEM_PROMPTS[language];
}

function isAssistantHistory(value: unknown): value is AssistantMessage[] {
    return Array.isArray(value) && value.every((entry) => entry && typeof entry === 'object' && 'role' in entry && 'content' in entry && (entry.role === 'assistant' || entry.role === 'user') && typeof entry.content === 'string');
}

async function answerWithModel(message: string, history: AssistantMessage[], language: AssistantLanguage) {
    const result = await generateAiText(systemPrompt(language), [...history.slice(-10), { role: 'user', content: message }], 350);
    return result ? { reply: result.text, suggestedTopic: '', mode: result.provider } : null;
}

const GENERIC_REPLIES: Record<Exclude<AssistantLanguage, 'es'>, string> = {
    en: 'I can compare mortgages, explain monthly payments, and prepare a Stickman Seller video. Tell me the buyer profile or ask a specific question.',
    zh: '我可以比较房贷方案、解释月供,并准备一个Stickman Seller视频。请告诉我买家的情况或提出具体问题。',
    ar: 'يمكنني مقارنة القروض العقارية وشرح الأقساط الشهرية وإعداد فيديو Stickman Seller. أخبرني بملف المشتري أو اطرح سؤالاً محدداً.',
    fr: 'Je peux comparer des prets hypothecaires, expliquer les mensualites et preparer une video Stickman Seller. Dis-moi le profil de l\'acheteur ou pose une question precise.',
};

function answer(message: string, language: AssistantLanguage) {
    if (language !== 'es') return { reply: GENERIC_REPLIES[language], suggestedTopic: '', mode: 'local' as const };
    const normalized = message.toLowerCase();
    if (normalized.includes('compar') || normalized.includes('opcion')) {
        return {
            reply: 'Claro. Para comparar opciones mira la tasa, el plazo, la cuota, los seguros y el costo total. Puedo convertir esta comparacion en un video de Stickman Seller.',
            suggestedTopic: 'Comparar opciones de credito hipotecario: cuota, tasa y costo total',
            mode: 'local' as const,
        };
    }
    if (normalized.includes('cuota') || normalized.includes('calcular')) {
        return {
            reply: 'La cuota depende del monto, la tasa y el plazo. Como regla practica, prueba varios escenarios y verifica que la cuota sea sostenible con tus ingresos. No reemplaza una cotizacion formal.',
            suggestedTopic: 'Como calcular y comparar la cuota mensual de un credito hipotecario',
            mode: 'local' as const,
        };
    }
    if (normalized.includes('video') || normalized.includes('vendedor') || normalized.includes('stickman')) {
        return {
            reply: 'Perfecto. Preparare una historia breve: el Stickman plantea el problema, compara las mejores opciones y cierra con una recomendacion educativa para revisar antes de publicar.',
            suggestedTopic: 'Stickman Seller recomienda la mejor opcion hipotecaria para cada perfil',
            mode: 'local' as const,
        };
    }
    return {
        reply: 'Puedo ayudarte a comparar creditos, explicar cuotas y preparar un video vendedor. Cuentame el perfil del cliente o pega una pregunta concreta.',
        suggestedTopic: '',
        mode: 'local' as const,
    };
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => null) as AssistantRequest | null;
    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const language: AssistantLanguage = isAssistantLanguage(body?.language) ? body.language : 'es';
    if (!message) return NextResponse.json({ error: 'Escribe un mensaje.' }, { status: 400 });

    try {
        const modelAnswer = await answerWithModel(message, isAssistantHistory(body?.messages) ? body.messages : [], language);
        return NextResponse.json(modelAnswer ?? answer(message, language));
    } catch (error) {
        console.warn('Fallo el modelo AI, usando respuesta local.', error);
        const notice = language === 'en' ? 'The configured AI model could not be reached.'
            : language === 'zh' ? '无法连接到已配置的AI模型。'
            : language === 'ar' ? 'تعذر الاتصال بنموذج الذكاء الاصطناعي المهيأ.'
            : language === 'fr' ? 'Impossible de contacter le modele IA configure.'
            : 'No se pudo conectar al modelo configurado.';
        return NextResponse.json({ ...answer(message, language), notice });
    }
}
