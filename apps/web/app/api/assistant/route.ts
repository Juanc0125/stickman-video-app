import { NextResponse } from 'next/server';
import { generateAiText } from '../../../lib/ai';

type AssistantMessage = { role: 'assistant' | 'user'; content: string };
type AssistantLanguage = 'es' | 'en';
type AssistantRequest = { message?: unknown; messages?: unknown; language?: unknown };

function systemPrompt(language: AssistantLanguage) {
    return language === 'en'
        ? 'You are Stickman, a virtual seller and financial education assistant. Respond in clear, brief English. Help compare mortgages, payments, rates, terms, insurance, and total cost. Do not promise approvals or provide personalized financial recommendations without enough data. Include an educational disclaimer when appropriate. If the user wants a video, describe a three-scene Stickman Seller idea.'
        : 'Eres Stickman, un asistente virtual vendedor y educador financiero. Responde en espanol claro, breve y conversacional. Ayuda a comparar creditos hipotecarios, cuotas, tasas, plazos, seguros y costo total. No prometas aprobaciones ni presentes una opcion como recomendacion personalizada sin datos suficientes. Incluye una advertencia educativa cuando corresponda. Si el usuario quiere crear un video, describe una idea de tres escenas para un Stickman Seller.';
}

function isAssistantHistory(value: unknown): value is AssistantMessage[] {
    return Array.isArray(value) && value.every((entry) => entry && typeof entry === 'object' && 'role' in entry && 'content' in entry && (entry.role === 'assistant' || entry.role === 'user') && typeof entry.content === 'string');
}

async function answerWithModel(message: string, history: AssistantMessage[], language: AssistantLanguage) {
    const result = await generateAiText(systemPrompt(language), [...history.slice(-10), { role: 'user', content: message }], 350);
    return result ? { reply: result.text, suggestedTopic: '', mode: result.provider } : null;
}

function answer(message: string, language: AssistantLanguage) {
    if (language === 'en') return { reply: 'I can compare mortgages, explain monthly payments, and prepare a Stickman Seller video. Tell me the buyer profile or ask a specific question.', suggestedTopic: '', mode: 'local' as const };
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
    const language: AssistantLanguage = body?.language === 'en' ? 'en' : 'es';
    if (!message) return NextResponse.json({ error: 'Escribe un mensaje.' }, { status: 400 });

    try {
        const modelAnswer = await answerWithModel(message, isAssistantHistory(body?.messages) ? body.messages : [], language);
        return NextResponse.json(modelAnswer ?? answer(message, language));
    } catch (error) {
        console.warn('Fallo el modelo AI, usando respuesta local.', error);
        return NextResponse.json({ ...answer(message, language), notice: language === 'en' ? 'The configured AI model could not be reached.' : 'No se pudo conectar al modelo configurado.' });
    }
}
