// End-to-end check of the whole studio against a running app: it creates a
// video, writes the script, splits it into scenes, edits one, brands it, walks
// the approval gate, renders asynchronously until a real MP4 lands in Supabase,
// publishes, duplicates, exercises the narrative templates, the brand templates
// and the assistant, and finally deletes everything it made.
//
// It needs the app already running - `npm run dev` puts the web app on 3000 and
// the render worker on 8080 - and it talks to the real Supabase project, so it
// cleans up every record it creates. The render is a real render: allow a few
// minutes.
//
//   npm run e2e
//   E2E_WEB_URL=https://staging.example E2E_WORKER_URL=https://worker.example node scripts/e2e.mjs
//
// Exits non-zero when any check fails, so CI can gate on it.
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const withoutTrailingSlash = (url) => url.replace(/\/+$/, '');

const S = withoutTrailingSlash(process.env.E2E_WEB_URL ?? 'http://localhost:3000');
const W = withoutTrailingSlash(process.env.E2E_WORKER_URL ?? 'http://localhost:8080');

// The downloaded MP4 is proof the render is real, not a repo artifact: it goes
// to the system temp directory so a green run leaves the working tree clean.
const mp4Path = join(tmpdir(), 'stickman-qa.mp4');

const results = [];

function record(name, ok, detail) {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'OK  ' : 'FALLA'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function api(path, options = {}, base = S) {
    const response = await fetch(base + path, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: response.status, body };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let videoId = null;

console.log(`web=${S}  worker=${W}\n`);

try {
    // 1. health
    const health = await api('/health', {}, W);
    record('worker /health', health.status === 200 && health.body?.ok === true,
        `storage=${health.body?.storage} engine=${health.body?.video_engine}`);

    const list = await api('/api/videos');
    record('GET /api/videos', list.status === 200 && Array.isArray(list.body?.videos),
        `${list.body?.videos?.length} videos`);

    // 2. create
    const created = await api('/api/videos', {
        method: 'POST',
        body: JSON.stringify({ topic: 'QA end to end', platform: 'reels', target_duration_seconds: 12 }),
    });
    videoId = created.body?.video?.id;
    record('crear video', created.status === 201 && !!videoId,
        created.body?.video?.script ? `guion de ${created.body.video.script.length} chars` : 'sin guion');

    // 3. scenes
    const scenes = await api(`/api/videos/${videoId}/scenes`, { method: 'POST' });
    const sceneList = scenes.body?.video?.scenes ?? [];
    record('generar escenas', scenes.status === 200 && sceneList.length > 0, `${sceneList.length} escenas`);

    // 4. edit a scene
    const first = [...sceneList].sort((a, b) => a.order - b.order)[0];
    const edited = await api(`/api/videos/${videoId}/scenes/${first.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ character: 'broker', action: 'caminar', prop: 'casa' }),
    });
    const e1 = edited.body?.video?.scenes?.find((s) => s.id === first.id);
    record('editar escena', edited.status === 200 && e1?.action === 'caminar' && e1?.prop === 'casa',
        `${e1?.character}/${e1?.action}/${e1?.prop}`);

    // 5. manual script edit
    const script = await api(`/api/videos/${videoId}`, {
        method: 'PATCH',
        body: JSON.stringify({ script: 'Guion editado a mano por la prueba automatica.' }),
    });
    record('editar guion', script.status === 200 && script.body?.video?.script?.includes('editado a mano'));

    // 6. branding, including the typeface that used to be ignored
    const branding = await api(`/api/videos/${videoId}/branding`, {
        method: 'PATCH',
        body: JSON.stringify({ font_family: 'serif', primary_color: '#1b2a3a' }),
    });
    record('branding (tipografia + color)', branding.status === 200
        && branding.body?.video?.branding?.font_family === 'serif'
        && branding.body?.video?.branding?.primary_color === '#1b2a3a');

    // 7. approval gate
    const submit = await api(`/api/videos/${videoId}`, { method: 'PATCH', body: JSON.stringify({ action: 'submit' }) });
    record('enviar a aprobacion', submit.body?.video?.status === 'pendiente_aprobacion');

    const earlyRender = await api(`/api/videos/${videoId}`, { method: 'PATCH', body: JSON.stringify({ action: 'render' }) });
    record('render bloqueado sin aprobar', earlyRender.status >= 400, `HTTP ${earlyRender.status}`);

    const approve = await api(`/api/videos/${videoId}`, { method: 'PATCH', body: JSON.stringify({ action: 'approve' }) });
    record('aprobar', approve.body?.video?.status === 'aprobado');

    // 8. async render with progress
    const started = Date.now();
    const render = await api(`/api/videos/${videoId}`, { method: 'PATCH', body: JSON.stringify({ action: 'render' }) });
    record('render devuelve al instante', render.status === 200 && Date.now() - started < 5000,
        `${Date.now() - started}ms, estado=${render.body?.video?.render_status}`);

    let seenProgress = false, final = null;
    for (let i = 0; i < 40; i += 1) {
        await sleep(4000);
        const poll = await api('/api/videos');
        const v = poll.body.videos.find((x) => x.id === videoId);
        if (v.render_progress > 0 && v.render_progress < 100) seenProgress = true;
        if (v.render_status === 'listo' || v.render_status === 'error') { final = v; break; }
    }
    record('render termina', final?.render_status === 'listo',
        `estado=${final?.render_status} error=${final?.render_error ?? 'ninguno'}`);
    record('progreso intermedio visible', seenProgress);
    record('URL en Supabase', !!final?.video_url?.includes('supabase.co'), final?.video_url?.slice(0, 60));

    // 9. the file itself
    if (final?.video_url) {
        const head = await fetch(final.video_url);
        const buf = Buffer.from(await head.arrayBuffer());
        writeFileSync(mp4Path, buf);
        record('MP4 descargable', head.ok && buf.length > 10000,
            `${head.status}, ${(buf.length / 1024).toFixed(0)} KB, ${head.headers.get('content-type')} -> ${mp4Path}`);
    }

    // 10. publish
    const publish = await api(`/api/videos/${videoId}`, { method: 'PATCH', body: JSON.stringify({ action: 'publish' }) });
    record('publicar', publish.body?.video?.status === 'publicado');

    // 11. reuse across platforms
    const dup = await api(`/api/videos/${videoId}/duplicate`, { method: 'POST', body: JSON.stringify({ platform: 'tiktok' }) });
    const dupId = dup.body?.video?.id;
    record('duplicar a otra plataforma', dup.status === 201 && dup.body?.video?.platform === 'tiktok'
        && dup.body?.video?.status === 'borrador', `escenas copiadas: ${dup.body?.video?.scenes?.length}`);
    if (dupId) await api(`/api/videos/${dupId}`, { method: 'DELETE' });

    // 12. assistant
    const a1 = await api('/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'crea un video sobre plazos del credito para shorts', context: { total: 1, porEstado: {}, seleccionado: null } }),
    });
    record('asistente entiende "crear"', a1.body?.action?.kind === 'crear' && a1.body?.action?.platform === 'shorts');

    const a2 = await api('/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'aprueba y publica este video', context: { total: 1, porEstado: {}, seleccionado: null } }),
    });
    record('asistente RECHAZA aprobar', a2.body?.action?.kind === 'rechazado');

    const a3 = await api('/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'en la escena 3 que la pareja hable con un banco', context: { total: 1, porEstado: {}, seleccionado: null } }),
    });
    record('asistente entiende editar escena',
        a3.body?.action?.kind === 'editar_escena' && a3.body?.action?.sceneNumber === 3 && a3.body?.action?.prop === 'banco');

    // 14. plantillas (RF-019)
    const tpl = await api('/api/videos', {
        method: 'POST',
        body: JSON.stringify({ topic: 'QA plantilla llamada', platform: 'reels', target_duration_seconds: 12, template: 'llamada' }),
    });
    const tplId = tpl.body?.video?.id;
    record('crear con plantilla', tpl.status === 201 && tpl.body?.video?.template === 'llamada',
        `template=${tpl.body?.video?.template}`);

    if (tplId) {
        const tplScenes = await api(`/api/videos/${tplId}/scenes`, { method: 'POST' });
        const list2 = [...(tplScenes.body?.video?.scenes ?? [])].sort((a, b) => a.order - b.order);
        const first2 = list2[0];
        const last2 = list2[list2.length - 1];
        record('la plantilla monta las escenas', list2.length > 0
            && first2?.action === 'telefono' && last2?.character === 'pareja',
            `1a=${first2?.character}/${first2?.action}/${first2?.prop} ultima=${last2?.character}/${last2?.action}/${last2?.prop}`);

        const dup2 = await api(`/api/videos/${tplId}/duplicate`, { method: 'POST', body: JSON.stringify({ platform: 'tiktok' }) });
        record('duplicar conserva la plantilla', dup2.body?.video?.template === 'llamada', `template=${dup2.body?.video?.template}`);
        if (dup2.body?.video?.id) await api(`/api/videos/${dup2.body.video.id}`, { method: 'DELETE' });

        await api(`/api/videos/${tplId}`, { method: 'DELETE' });
    }

    const bad = await api('/api/videos', {
        method: 'POST',
        body: JSON.stringify({ topic: 'QA plantilla invalida', platform: 'reels', target_duration_seconds: 12, template: 'inventada' }),
    });
    record('plantilla desconocida cae en libre', bad.status === 201 && bad.body?.video?.template === 'libre',
        `template=${bad.body?.video?.template}`);
    if (bad.body?.video?.id) await api(`/api/videos/${bad.body.video.id}`, { method: 'DELETE' });

    const a4 = await api('/api/assistant', {
        method: 'POST',
        body: JSON.stringify({ message: 'crea un video sobre la cuota inicial en formato conversacion', context: { total: 1, porEstado: {}, seleccionado: null } }),
    });
    record('asistente entiende la plantilla',
        a4.body?.action?.kind === 'crear' && a4.body?.action?.template === 'conversacion',
        `template=${a4.body?.action?.template} tema="${a4.body?.action?.topic}"`);

    // 15. plantillas de marca (RF-028)
    const brandA = await api('/api/videos', {
        method: 'POST',
        body: JSON.stringify({ topic: 'QA marca origen', platform: 'reels', target_duration_seconds: 12 }),
    });
    const brandB = await api('/api/videos', {
        method: 'POST',
        body: JSON.stringify({ topic: 'QA marca destino', platform: 'reels', target_duration_seconds: 12 }),
    });
    const aId = brandA.body?.video?.id;
    const bId = brandB.body?.video?.id;

    await api(`/api/videos/${aId}/branding`, {
        method: 'PATCH',
        body: JSON.stringify({ primary_color: '#0a3d2f', secondary_color: '#f5c542', font_family: 'mono', logo_position: 'bottom-left' }),
    });

    const savedTpl = await api('/api/brand-templates', {
        method: 'POST',
        body: JSON.stringify({ name: 'QA marca del negocio', video_id: aId }),
    });
    const brandTplId = savedTpl.body?.template?.id;
    record('guardar plantilla de marca', savedTpl.status === 201 && !!brandTplId
        && savedTpl.body?.template?.branding?.primary_color === '#0a3d2f',
        `${savedTpl.body?.template?.name} / ${savedTpl.body?.template?.branding?.font_family}`);

    const tplList = await api('/api/brand-templates');
    record('listar plantillas de marca', tplList.status === 200
        && (tplList.body?.templates ?? []).some((t) => t.id === brandTplId),
        `${tplList.body?.templates?.length} plantillas`);

    const applied = await api(`/api/videos/${bId}/brand-template`, {
        method: 'POST',
        body: JSON.stringify({ template_id: brandTplId }),
    });
    const ab = applied.body?.video?.branding;
    record('aplicar plantilla a otro video', applied.status === 200
        && ab?.primary_color === '#0a3d2f' && ab?.secondary_color === '#f5c542'
        && ab?.font_family === 'mono' && ab?.logo_position === 'bottom-left',
        `${ab?.primary_color}/${ab?.font_family}/${ab?.logo_position}`);

    const missingTpl = await api(`/api/videos/${bId}/brand-template`, {
        method: 'POST',
        body: JSON.stringify({ template_id: '00000000-0000-0000-0000-000000000000' }),
    });
    record('plantilla de marca inexistente da 404', missingTpl.status === 404, `HTTP ${missingTpl.status}`);

    const noName = await api('/api/brand-templates', { method: 'POST', body: JSON.stringify({ video_id: aId }) });
    record('plantilla de marca sin nombre se rechaza', noName.status === 400, `HTTP ${noName.status}`);

    const delTpl = await fetch(`${S}/api/brand-templates/${brandTplId}`, { method: 'DELETE' });
    const afterTpl = await api('/api/brand-templates');
    record('eliminar plantilla de marca', delTpl.status === 204
        && !(afterTpl.body?.templates ?? []).some((t) => t.id === brandTplId));

    if (aId) await api(`/api/videos/${aId}`, { method: 'DELETE' });
    if (bId) await api(`/api/videos/${bId}`, { method: 'DELETE' });

    // 13. delete
    const del = await api(`/api/videos/${videoId}`, { method: 'DELETE' });
    const after = await api('/api/videos');
    record('eliminar video', del.status === 204 && !after.body.videos.some((v) => v.id === videoId));
    videoId = null;
} catch (error) {
    record('EXCEPCION', false, error.message);
} finally {
    if (videoId) await api(`/api/videos/${videoId}`, { method: 'DELETE' }).catch(() => {});
}

const fail = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - fail.length}/${results.length} pruebas OK ===`);
if (fail.length) fail.forEach((f) => console.log(`  FALLA: ${f.name} — ${f.detail ?? ''}`));

// process.exit() while fetch sockets are still closing trips a libuv assertion
// on Windows; setting the code lets Node drain and exit on its own.
process.exitCode = fail.length > 0 ? 1 : 0;
