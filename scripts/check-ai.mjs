// Answers one question: which language model, if any, will actually answer.
//
// The studio degrades silently when a provider is out of credit - it falls back
// to keyword matching and keeps replying - so "the assistant sounds stupid" and
// "the key is dead" look identical from the outside. This calls every provider
// for real, with tools, and prints what came back.
//
//   node scripts/check-ai.mjs

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Same precedence scripts/dev.mjs uses when it starts the app: apps/web first,
// the repo root last so it wins. Checking with the other order would report a
// key the running app never reads.
for (const file of [join(root, 'apps', 'web', '.env.local'), join(root, '.env.local')]) {
    let text;
    try {
        text = readFileSync(file, 'utf8');
    } catch {
        continue;
    }
    for (const line of text.split('\n')) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match && match[2].trim()) process.env[match[1]] = match[2].trim();
    }
}

const TOOL = {
    type: 'function',
    function: {
        name: 'crear_video',
        description: 'Crea un video con un tema y una plataforma.',
        parameters: {
            type: 'object',
            properties: {
                tema: { type: 'string' },
                plataforma: { type: 'string', enum: ['reels', 'tiktok', 'shorts'] },
            },
            required: ['tema', 'plataforma'],
        },
    },
};

const PROVIDERS = [
    {
        id: 'groq',
        key: 'GROQ_API_KEY',
        url: process.env.GROQ_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions',
        model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
        headers: () => ({ Authorization: `Bearer ${process.env.GROQ_API_KEY}` }),
    },
    {
        id: 'openrouter',
        key: 'OPENROUTER_API_KEY',
        url: process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions',
        model: process.env.OPENROUTER_MODEL ?? 'google/gemma-4-31b-it:free',
        headers: () => ({ Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'X-Title': 'Stickman Video Studio' }),
    },
    {
        id: 'openai/anthropic (heredado)',
        key: 'LLM_API_KEY',
        url: process.env.LLM_API_URL ?? 'https://api.openai.com/v1/chat/completions',
        model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
        headers: () => ({ Authorization: `Bearer ${process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY}` }),
    },
];

async function probe(provider) {
    const key = process.env[provider.key];
    if (!key) return { estado: 'sin clave', detalle: `falta ${provider.key}` };

    let response;
    try {
        response = await fetch(provider.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...provider.headers() },
            body: JSON.stringify({
                model: provider.model,
                max_tokens: 120,
                messages: [
                    { role: 'system', content: 'Eres un asistente que opera un estudio de video. Usa la herramienta cuando corresponda.' },
                    { role: 'user', content: 'crea un video sobre tasas fijas para tiktok' },
                ],
                tools: [TOOL],
                tool_choice: 'auto',
            }),
            signal: AbortSignal.timeout(40000),
        });
    } catch (error) {
        return { estado: 'FALLA', detalle: `sin respuesta: ${error.message}` };
    }

    const body = await response.json().catch(() => null);
    if (!response.ok) {
        const error = body?.error ?? {};
        return { estado: 'FALLA', detalle: `HTTP ${response.status} ${error.code ?? error.type ?? ''} ${String(error.message ?? '').slice(0, 90)}`.trim() };
    }

    // Tool calling is the whole point: a model that only talks cannot drive the
    // studio, so it is reported as a partial pass rather than a pass.
    const message = body?.choices?.[0]?.message ?? {};
    const call = message.tool_calls?.[0];
    return call
        ? { estado: 'OK', detalle: `llamo a ${call.function?.name} con ${call.function?.arguments}` }
        : { estado: 'PARCIAL', detalle: `respondio texto pero no uso la herramienta: "${String(message.content ?? '').slice(0, 70)}"` };
}

let alguno = false;
for (const provider of PROVIDERS) {
    const { estado, detalle } = await probe(provider);
    if (estado === 'OK') alguno = true;
    console.log(`${estado.padEnd(9)} ${provider.id} (${provider.model})\n          ${detalle}\n`);
}

console.log(alguno
    ? 'Hay al menos un proveedor con tool calling: el copiloto puede razonar de verdad.'
    : 'Ningun proveedor responde. El copiloto seguira en modo basico (palabras clave).');
// exitCode rather than exit(): killing the process while undici is still
// closing its sockets trips an assertion in libuv on Windows.
process.exitCode = alguno ? 0 : 1;
