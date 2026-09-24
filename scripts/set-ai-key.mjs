// Sets one AI-provider key end to end: prompts for it without echoing, refuses
// an obviously wrong one, proves it actually answers before touching disk, and
// only then writes it to .env.local and to Vercel.
//
// Two keys have already been lost in this project by being pasted into a chat
// window. This script exists so that never has to happen again: the value only
// ever travels from the operator's terminal, through a hidden prompt, into a
// child process's stdin - never through an argument, a log line, or a file
// this script does not own.
//
//   npm run set:ai-key -- groq
//   npm run set:ai-key -- openrouter
//   npm run set:ai-key            (asks which provider)

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = join(root, '.env.local');

// Same tool-calling probe scripts/check-ai.mjs uses: a key that returns 200
// but never calls the tool is still a working key, just an unhelpful reply
// pattern, so this shape (not just "did the HTTP call succeed") is what tells
// a live key apart from a dead one.
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

const PROVIDERS = {
    groq: {
        envVar: 'GROQ_API_KEY',
        prefix: 'gsk_',
        url: process.env.GROQ_API_URL ?? 'https://api.groq.com/openai/v1/chat/completions',
        model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
        headers: (key) => ({ Authorization: `Bearer ${key}` }),
    },
    openrouter: {
        envVar: 'OPENROUTER_API_KEY',
        prefix: 'sk-or-v1-',
        url: process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions',
        model: process.env.OPENROUTER_MODEL ?? 'google/gemma-4-31b-it:free',
        headers: (key) => ({ Authorization: `Bearer ${key}`, 'X-Title': 'Stickman Video Studio' }),
    },
};

// Marks a Ctrl+C so the caller can tell "the operator cancelled" apart from
// "something actually broke".
class Cancelled extends Error {}

// One readline interface for the whole interactive part of the script (at
// most two questions: which provider, then the key). Two separate interfaces
// created back to back on the same stdin can each only see the input that
// arrives after they are created - a line typed (or piped) ahead of time can
// land in the first interface's internal buffer and be lost when it closes
// before the second interface is created to read it. Reusing one interface
// for every question, and closing it only once, is the pattern readline
// itself is designed around.
function createSession() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    // readline puts a TTY into raw mode to read keystrokes and re-echoes them
    // itself through _writeToOutput; muting that method (after it has already
    // written the prompt text once) is what hides typed input without
    // disabling the prompt. Off by default so the plain provider question
    // (ask, below) still echoes normally; askHidden turns it on per call.
    rl._writeToOutput = (chunk) => {
        if (!muted) rl.output.write(chunk);
    };

    function question(promptText, { hidden } = {}) {
        return new Promise((resolve, reject) => {
            // Belt and suspenders: if the input stream ends without a line
            // ever being submitted (stdin closed, terminal disconnected),
            // 'close' fires without the question callback ever running.
            // Without this, nothing keeps the event loop alive and the
            // process exits silently with status 0 having asked a question
            // nobody answered - indistinguishable from success.
            const onClose = () => reject(new Cancelled());
            const onSigint = () => {
                muted = false;
                rl.removeListener('close', onClose);
                process.stdout.write('\n');
                reject(new Cancelled());
            };
            rl.once('SIGINT', onSigint);
            rl.once('close', onClose);
            rl.question(promptText, (answer) => {
                muted = false;
                rl.removeListener('SIGINT', onSigint);
                rl.removeListener('close', onClose);
                if (hidden) process.stdout.write('\n');
                resolve(answer);
            });
            if (hidden) muted = true;
        });
    }

    return {
        ask: (promptText) => question(promptText),
        askHidden: (promptText) => question(promptText, { hidden: true }),
        close: () => rl.close(),
    };
}

async function pickProvider(session) {
    while (true) {
        const answer = (await session.ask('Proveedor (groq/openrouter): ')).trim().toLowerCase();
        if (PROVIDERS[answer]) return answer;
        console.log('Escribe "groq" u "openrouter".');
    }
}

// Identical request shape to scripts/check-ai.mjs's probe(): same tool, same
// prompt, same timeout. A second, slightly different version of this call
// would be one more place for the two to quietly disagree.
async function probe(provider, key) {
    let response;
    try {
        response = await fetch(provider.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...provider.headers(key) },
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

    const message = body?.choices?.[0]?.message ?? {};
    const call = message.tool_calls?.[0];
    return call
        ? { estado: 'OK', detalle: `llamo a ${call.function?.name} con ${call.function?.arguments}` }
        : { estado: 'PARCIAL', detalle: `respondio texto pero no uso la herramienta: "${String(message.content ?? '').slice(0, 70)}"` };
}

function runCommand(command, args, options = {}) {
    // vercel and (on some setups) git are .cmd shims on Windows; without a
    // shell, spawn() can fail to find them even though they work from a prompt.
    return spawnSync(command, args, {
        cwd: root,
        shell: process.platform === 'win32',
        encoding: 'utf8',
        ...options,
    });
}

// .env.local is only safe to write to if git will actually refuse to track it -
// checking .gitignore by eye is exactly the kind of thing that can silently
// stop being true after an unrelated edit.
function envFileIsIgnored() {
    const result = runCommand('git', ['check-ignore', '-q', ENV_FILE]);
    return !result.error && result.status === 0;
}

function writeLocalEnv(name, value) {
    let content = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, 'm');
    if (pattern.test(content)) {
        content = content.replace(pattern, line);
    } else {
        if (content && !content.endsWith('\n')) content += '\n';
        content += `${line}\n`;
    }
    writeFileSync(ENV_FILE, content, 'utf8');
}

// Defensive only: Vercel is not expected to echo the value back, but nothing
// printed from a child process that just received a secret should be trusted
// blindly before it reaches the terminal.
function redact(text, secret) {
    return secret ? text.split(secret).join('[oculto]') : text;
}

function lastLine(text) {
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
    return lines.length ? lines[lines.length - 1] : 'sin detalle';
}

async function run() {
    const rawArg = process.argv[2];
    const providerArg = (rawArg ?? '').toLowerCase();

    if (rawArg && !PROVIDERS[providerArg]) {
        console.error(`Proveedor desconocido: "${rawArg}". Usa "groq" u "openrouter".`);
        process.exitCode = 1;
        return;
    }

    const session = createSession();
    let providerName;
    let key;
    try {
        providerName = providerArg || (await pickProvider(session));
        key = (await session.askHidden(`Pega la clave de ${providerName} (no se mostrara en pantalla): `)).trim();
    } finally {
        session.close();
    }
    const provider = PROVIDERS[providerName];

    if (!key) {
        console.error('No se ingreso ninguna clave. No se guardo nada.');
        process.exitCode = 1;
        return;
    }

    // Reject before doing anything else with it: no network call, no disk write.
    if (!key.startsWith(provider.prefix)) {
        console.error(`Esa clave no empieza con "${provider.prefix}", que es el prefijo esperado para ${providerName}. No se guardo nada.`);
        process.exitCode = 1;
        return;
    }

    console.log(`Probando la clave contra ${provider.url} ...`);
    const test = await probe(provider, key);
    if (test.estado === 'FALLA') {
        console.error(`La clave no funciono: ${test.detalle}`);
        console.error('No se guardo nada.');
        process.exitCode = 1;
        return;
    }
    console.log(`Clave valida (${test.estado}): ${test.detalle}`);

    if (!envFileIsIgnored()) {
        console.error('No se pudo confirmar que .env.local esta ignorado por git. Por seguridad no se escribio la clave en ningun lado.');
        process.exitCode = 1;
        return;
    }
    writeLocalEnv(provider.envVar, key);
    console.log(`Guardada en .env.local (raiz del repo) como ${provider.envVar}.`);

    const who = runCommand('vercel', ['whoami']);
    if (who.status !== 0) {
        console.log('');
        console.log('Vercel CLI no tiene sesion iniciada: se omite el envio a Vercel.');
        console.log('La clave ya quedo en .env.local. Ejecuta "vercel login" y vuelve a correr este comando para tambien guardarla ahi.');
    } else {
        let anyVercelFailure = false;
        for (const target of ['production', 'preview']) {
            // Vercel refuses to add a variable that already exists, so clear it
            // first. "not found" just means there was nothing to clear.
            const removed = runCommand('vercel', ['env', 'rm', provider.envVar, target, '--yes']);
            if (removed.status !== 0) {
                const text = `${removed.stdout ?? ''}${removed.stderr ?? ''}`;
                if (!/not found/i.test(text)) {
                    console.warn(`Aviso al limpiar ${provider.envVar} (${target}) en Vercel: ${lastLine(text)}`);
                }
            }

            const added = runCommand('vercel', ['env', 'add', provider.envVar, target], { input: `${key}\n` });
            if (added.status === 0) {
                console.log(`Vercel (${target}): ${provider.envVar} guardada.`);
            } else {
                anyVercelFailure = true;
                const text = redact(`${added.stdout ?? ''}${added.stderr ?? ''}`, key);
                console.error(`Vercel (${target}): no se pudo guardar ${provider.envVar}. ${lastLine(text)}`);
            }
        }
        if (anyVercelFailure) process.exitCode = 1;
    }

    console.log('');
    console.log('Pendiente para un humano:');
    console.log('- Vercel solo aplica variables nuevas a partir del proximo deploy: hace falta volver a desplegar.');
    console.log('- Reinicia el servidor de desarrollo local (npm run dev) para que recoja el nuevo valor de .env.local.');
}

async function main() {
    try {
        await run();
    } catch (error) {
        if (error instanceof Cancelled) {
            console.log('Cancelado. No se guardo nada.');
            process.exitCode = 130;
            return;
        }
        throw error;
    }
}

main().catch((error) => {
    console.error(`Error inesperado: ${error.message}`);
    process.exitCode = 1;
});
