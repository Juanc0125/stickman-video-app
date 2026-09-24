import { generateAiText } from './ai';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    name?: string;
    // An assistant turn is replayed together with the calls it made: without
    // them the tool results that follow have no request to attach to and the
    // OpenAI-compatible APIs reject the conversation.
    tool_calls?: ToolCall[];
}

export interface ToolSchema { name: string; description: string; parameters: Record<string, unknown> }
export interface ToolCall { id: string; name: string; arguments: Record<string, unknown> }
export interface GenerationResult { text: string; toolCalls: ToolCall[]; provider: string }
export interface GenerateOptions { tools?: ToolSchema[]; maxTokens?: number; temperature?: number }

// Checked against console.groq.com/docs/models and console.groq.com/docs/tool-use
// on 2026-09-23: gpt-oss-120b is on the production tier (preview models can be
// withdrawn without notice) and is listed first for tool use.
const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-120b';

// Checked against the openrouter.ai/models catalogue on 2026-09-23: free on both
// prompt and completion, with `tools` among its supported parameters. Free
// endpoints are the ones that disappear first, hence OPENROUTER_MODEL.
const OPENROUTER_DEFAULT_MODEL = 'google/gemma-4-31b-it:free';

const TIMEOUT_MS = 30000;

interface Provider {
    id: string;
    url: string;
    model: string;
    apiKey: string | undefined;
    headers: Record<string, string>;
}

type WireToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };

type WireMessage = {
    role: ChatMessage['role'];
    content: string;
    tool_call_id?: string;
    name?: string;
    tool_calls?: WireToolCall[];
};

type CompletionResponse = {
    choices?: {
        message?: {
            content?: unknown;
            tool_calls?: { id?: unknown; function?: { name?: unknown; arguments?: unknown } }[];
        };
    }[];
    error?: { message?: unknown };
};

function providers(): Provider[] {
    // OpenRouter attributes traffic by these headers; the referer only goes out
    // when the deployment declares a public URL.
    const openRouterHeaders: Record<string, string> = { 'X-Title': 'Stickman Video Studio' };
    const siteUrl = process.env.OPENROUTER_SITE_URL;
    if (siteUrl) openRouterHeaders['HTTP-Referer'] = siteUrl;

    return [
        {
            id: 'groq',
            url: process.env.GROQ_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions',
            model: process.env.GROQ_MODEL ?? GROQ_DEFAULT_MODEL,
            apiKey: process.env.GROQ_API_KEY,
            headers: {},
        },
        {
            id: 'openrouter',
            url: process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions',
            model: process.env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL,
            apiKey: process.env.OPENROUTER_API_KEY,
            headers: openRouterHeaders,
        },
    ];
}

function toWireMessage(message: ChatMessage): WireMessage {
    const wire: WireMessage = { role: message.role, content: message.content };
    if (message.tool_call_id) wire.tool_call_id = message.tool_call_id;
    if (message.name) wire.name = message.name;
    if (message.tool_calls?.length) {
        wire.tool_calls = message.tool_calls.map((call) => ({
            id: call.id,
            type: 'function',
            function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) },
        }));
    }
    return wire;
}

function parseToolArguments(raw: unknown, toolName: string): Record<string, unknown> {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
    if (typeof raw !== 'string' || !raw.trim()) return {};
    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
        // Models mangle or truncate their own JSON often enough that throwing
        // here would lose whole turns. The caller validates the arguments
        // anyway, so an empty object degrades into "ask again" instead.
        console.warn(`Argumentos ilegibles para la herramienta ${toolName}; se continua sin ellos.`);
    }
    return {};
}

function toToolCalls(choices: CompletionResponse['choices'], provider: Provider): ToolCall[] {
    const calls = choices?.[0]?.message?.tool_calls ?? [];
    return calls.flatMap((call) => {
        const name = call.function?.name;
        if (typeof name !== 'string' || !name) return [];
        // Some OpenAI-compatible backends omit the id; one is invented so the
        // caller can still send back a matching tool_call_id next turn.
        const id = typeof call.id === 'string' && call.id ? call.id : `${provider.id}-${crypto.randomUUID()}`;
        return [{ id, name, arguments: parseToolArguments(call.function?.arguments, name) }];
    });
}

async function requestCompletion(provider: Provider, system: string, messages: ChatMessage[], options: GenerateOptions): Promise<GenerationResult> {
    const body: Record<string, unknown> = {
        model: provider.model,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 1024,
        messages: [{ role: 'system', content: system }, ...messages.map(toWireMessage)],
    };
    if (options.tools?.length) {
        body.tools = options.tools.map((tool) => ({
            type: 'function',
            function: { name: tool.name, description: tool.description, parameters: tool.parameters },
        }));
        body.tool_choice = 'auto';
    }

    const response = await fetch(provider.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey ?? ''}`, ...provider.headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`${provider.id} respondio con ${response.status}.`);

    // An empty or truncated body throws here, which is the same signal as a bad
    // status: try the next provider.
    const data = await response.json() as CompletionResponse;
    if (data.error) throw new Error(`${provider.id} devolvio un error: ${String(data.error.message ?? 'sin detalle')}.`);

    const content = data.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content.trim() : '';
    const toolCalls = toToolCalls(data.choices, provider);
    if (!text && toolCalls.length === 0) throw new Error(`${provider.id} no devolvio contenido.`);
    return { text, toolCalls, provider: provider.id };
}

// ai.ts speaks plain text over two roles only, so tool results are folded into
// the narrative and consecutive turns are merged: Claude rejects a conversation
// whose roles do not alternate, and rejects empty turns.
function toLegacyMessages(messages: ChatMessage[]): { role: 'user' | 'assistant'; content: string }[] {
    const flattened: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const message of messages) {
        const content = message.role === 'tool'
            ? `Resultado de ${message.name ?? 'la herramienta'}: ${message.content}`
            : message.content;
        if (!content.trim()) continue;
        const role = message.role === 'assistant' ? 'assistant' : 'user';
        const previous = flattened[flattened.length - 1];
        if (previous && previous.role === role) previous.content = `${previous.content}\n\n${content}`;
        else flattened.push({ role, content });
    }
    while (flattened.length > 0 && flattened[0].role === 'assistant') flattened.shift();
    return flattened;
}

async function requestLegacy(system: string, messages: ChatMessage[], options: GenerateOptions): Promise<GenerationResult | null> {
    const legacyMessages = toLegacyMessages(messages);
    if (legacyMessages.length === 0) return null;

    const result = await generateAiText(system, legacyMessages, options.maxTokens ?? 1024);
    if (!result) return null;
    if (options.tools?.length) console.warn('El ultimo recurso no admite herramientas; la respuesta llega solo como texto.');
    console.info(`Respondio el proveedor de respaldo ${result.provider}.`);
    return { text: result.text, toolCalls: [], provider: result.provider };
}

// The last-resort path counts as configured: hiding the copilot while ai.ts can
// still answer would turn a degraded feature into an absent one.
export function isCopilotConfigured(): boolean {
    return Boolean(
        process.env.GROQ_API_KEY
        || process.env.OPENROUTER_API_KEY
        || process.env.LLM_API_KEY
        || process.env.OPENAI_API_KEY
        || process.env.ANTHROPIC_API_KEY,
    );
}

export async function generateWithFallback(system: string, messages: ChatMessage[], options: GenerateOptions = {}): Promise<GenerationResult | null> {
    for (const provider of providers()) {
        if (!provider.apiKey) {
            console.info(`Sin clave configurada para ${provider.id}; se omite.`);
            continue;
        }
        try {
            const result = await requestCompletion(provider, system, messages, options);
            console.info(`Respondio ${provider.id} con el modelo ${provider.model}.`);
            return result;
        } catch (error) {
            console.warn(`Fallo ${provider.id}; se intentara el siguiente proveedor.`, error);
        }
    }

    const legacy = await requestLegacy(system, messages, options);
    if (legacy) return legacy;
    console.warn('Ningun proveedor de lenguaje respondio; la funcion queda sin modelo.');
    return null;
}
