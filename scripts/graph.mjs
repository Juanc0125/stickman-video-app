// Runs graphify without needing it on PATH.
//
// It is installed as a uv tool here, so the executable lives inside uv's tool
// directory and a bare `graphify` fails. The path differs per machine, so it is
// resolved at run time rather than written down: uv's tool dir, then pipx's,
// then PATH. The interpreter the last full build used is cached in
// graphify-out/.graphify_python, which is git-ignored for the same reason.
//
//   npm run graph -- query "como se genera el guion?"
//   npm run graph -- path "copilot" "video-persistence"
//   npm run graph -- explain "generateWithFallback"
//   npm run graph -- update .

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function candidates() {
    const found = [];

    // What the last build used: its sibling is the graphify executable.
    const cached = join(root, 'graphify-out', '.graphify_python');
    if (existsSync(cached)) {
        const python = readFileSync(cached, 'utf8').trim();
        if (python) found.push(join(dirname(python), 'graphify.exe'), join(dirname(python), 'graphify'));
    }

    for (const command of ['uv tool dir', 'pipx environment --value PIPX_LOCAL_VENVS']) {
        const probe = spawnSync(command, { encoding: 'utf8', shell: true });
        const dir = probe.status === 0 ? probe.stdout.trim() : '';
        if (dir) {
            found.push(join(dir, 'graphifyy', 'Scripts', 'graphify.exe'), join(dir, 'graphifyy', 'bin', 'graphify'));
        }
    }

    found.push('graphify');
    return found;
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Falta el subcomando. Por ejemplo: npm run graph -- query "como se genera el guion?"');
    process.exitCode = 1;
} else {
    const executable = candidates().find((path) => path === 'graphify' || existsSync(path));
    const needsShell = executable === 'graphify' || executable.endsWith('.cmd') || executable.endsWith('.bat');
    const result = spawnSync(executable, args, { cwd: root, stdio: 'inherit', shell: needsShell });
    if (result.error) {
        console.error('No se encontro graphify. Instalalo con: uv tool install graphifyy');
        process.exitCode = 1;
    } else {
        process.exitCode = result.status ?? 1;
    }
}
