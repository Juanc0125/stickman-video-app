// Reports which tracked files the knowledge graph has not ingested yet.
//
// graphify-out/manifest.json records, per file, the mtime it had when the
// graph last read it (`seen`). A file whose mtime is newer than `seen` is a
// file the graph does not know about, so a query about it answers from stale
// structure.
//
// The post-commit hook rebuilds the AST side on every commit, so code usually
// self-heals. What the hook does NOT cover is documents and images; those need
// a full run by graphify-agent. This script exists to make that distinction
// visible instead of guessed at.
//
//   node .claude/skills/verificar/scripts/grafo-pendiente.mjs
//
// Exit code 0 always: staleness is information, not a build failure.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { extname, join } from 'node:path';

const raiz = process.cwd();
const manifestPath = join(raiz, 'graphify-out', 'manifest.json');

if (!existsSync(manifestPath)) {
    console.log('No hay grafo en graphify-out/. Nada que comparar.');
    process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

let rastreados;
try {
    rastreados = execSync('git ls-files', { cwd: raiz, encoding: 'utf8' })
        .split('\n').map((l) => l.trim()).filter(Boolean);
} catch {
    console.log('No pude listar los archivos de git. Nada que comparar.');
    process.exit(0);
}

// Which extensions does graphify actually index? Rather than hardcode a guess
// - and then cry wolf about every .gitignore and favicon it deliberately skips
// - derive the set from the manifest itself. Whatever is already in there is,
// by definition, something the graph ingests. A detector that raises false
// alarms gets ignored, and then it may as well not exist.
const INDEXADAS = new Set(
    Object.keys(manifest).map((f) => extname(f).toLowerCase()).filter(Boolean),
);

// Lockfiles share an extension with files the graph does index (.json), so
// they need naming: they are enormous, machine-written, and say nothing about
// how the code fits together.
const esLockfile = (f) => /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(f);

const pendientes = { codigo: [], documentos: [], imagenes: [], otros: [] };
const CODIGO = /\.(ts|tsx|js|jsx|mjs|cjs|py)$/;
const DOCS = /\.(md|txt)$/;
const IMAGENES = /\.(png|jpe?g|gif|svg|webp)$/;

for (const archivo of rastreados) {
    if (archivo.startsWith('graphify-out/') || esLockfile(archivo)) continue;
    if (!INDEXADAS.has(extname(archivo).toLowerCase())) continue;

    let mtime;
    try {
        mtime = statSync(join(raiz, archivo)).mtimeMs / 1000;
    } catch {
        continue; // deleted between ls-files and now
    }

    // Absent from the manifest means never ingested; past `seen` means changed
    // after the graph last looked. One second of slack absorbs filesystem
    // timestamp rounding.
    if (mtime <= (manifest[archivo]?.seen ?? 0) + 1) continue;

    const grupo = CODIGO.test(archivo) ? 'codigo'
        : DOCS.test(archivo) ? 'documentos'
            : IMAGENES.test(archivo) ? 'imagenes' : 'otros';
    pendientes[grupo].push(archivo);
}

const total = Object.values(pendientes).reduce((n, l) => n + l.length, 0);

if (total === 0) {
    console.log('Grafo al día: no hay archivos rastreados que el grafo no haya leído.');
    process.exit(0);
}

console.log(`El grafo no ha leído ${total} archivo(s):`);
const etiquetas = {
    codigo: 'código      (lo cubre el enganche de post-commit)',
    documentos: 'documentos  (NO lo cubre el enganche)',
    imagenes: 'imágenes    (NO lo cubre el enganche)',
    otros: 'otros       (NO lo cubre el enganche)',
};
for (const [grupo, lista] of Object.entries(pendientes)) {
    if (!lista.length) continue;
    console.log(`\n  ${etiquetas[grupo]} — ${lista.length}`);
    for (const f of lista.slice(0, 12)) console.log(`    ${f}`);
    if (lista.length > 12) console.log(`    ...y ${lista.length - 12} más`);
}

const soloCodigo = total === pendientes.codigo.length;
console.log('');
if (soloCodigo) {
    console.log('Solo código: el enganche de post-commit lo reconstruye en el próximo commit.');
} else {
    console.log('Hay algo que el enganche no cubre. Pásale esta lista a graphify-agent');
    console.log('para una corrida completa, o el grafo responderá con estructura vieja.');
}
