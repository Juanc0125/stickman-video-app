# Graph Report - stickman-video-app  (2026-09-24)

## Corpus Check
- 93 files · ~51,814 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 2, .example 2, .ico 1)

## Summary
- 782 nodes · 1507 edges · 57 communities (42 shown, 15 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 57 edges (avg confidence: 0.86)
- Token cost: 84,781 input · 0 output

## Community Hubs (Navigation)
- Cliente HTTP de la UI
- Plantillas de marca (API)
- Copiloto y proveedor de IA
- Edicion y regeneracion de escena
- Config de ESLint y paquete web
- Dibujo de personajes
- Orquestacion del render
- Paquete raiz del monorepo
- Asistente por palabras clave
- TypeScript de la web
- Reglas de agentes: worker y QA
- Planificador de escenas
- Voz offline (TTS)
- Propiedad de archivos por agente
- Reglas de interfaz y del grafo
- Reglas compartidas del proyecto
- Paquete del render worker
- Panel del asistente
- Config de Next.js
- Generador del fondo
- Reglas de backend y devops
- Reglas de devops, grafo y QA
- TypeScript del worker
- Suite end-to-end
- Video con IA (fal.ai)
- Dependencias del worker
- Shell de la app y PWA
- Paridad de tipos del dominio
- Arranque de desarrollo
- Despliegue y render asincrono
- TypeScript de la comprobacion
- Migracion: esquema inicial
- Esquema de Supabase
- DevDependencies del worker
- Scripts del worker
- Regla: mirar la salida real
- Iconos de la PWA
- Vercel (web)
- Migracion: plantillas
- Vercel (raiz)
- Iconos por defecto
- Restos del boilerplate
- CI: workflow verify
- Instrucciones de la web
- PostCSS
- Config MCP
- Migracion: properties (obsoleta)
- Tabla scenes
- Migracion: fuentes (videos)
- Migracion: campos (videos)
- Migracion: render (videos)
- Migracion: plantillas (videos)

## God Nodes (most connected - your core abstractions)
1. `getSupabaseClient()` - 24 edges
2. `getVideo()` - 20 edges
3. `VideoRecord` - 17 edges
4. `render()` - 16 edges
5. `toVideoRecord()` - 16 edges
6. `compilerOptions` - 16 edges
7. `getTemplate()` - 16 edges
8. `generateAiText()` - 15 edges
9. `PATCH()` - 14 edges
10. `BrandingPanel()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Alcances de archivo sin solape entre agentes` --semantically_similar_to--> `RNF-002: separacion en guion, escenas, audio/subtitulos, branding, render, persistencia y copiloto`  [INFERRED] [semantically similar]
  CLAUDE.md → .claude/agents/graphify-agent.md
- `Sin Supabase la app funciona con almacenamiento en memoria` --semantically_similar_to--> `Todo camino opcional degrada al local: sin fal.ai, sin clave de TTS y sin nube`  [INFERRED] [semantically similar]
  README.md → .claude/agents/render-worker-agent.md
- `Los dos servicios se comunican solo por HTTP y no comparten codigo` --rationale_for--> `apps/render-worker`  [INFERRED]
  README.md → CLAUDE.md
- `apps/web/.env.local.example` --references--> `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)`  [AMBIGUOUS]
  .claude/agents/backend-agent.md → CLAUDE.md
- `Instalacion como aplicacion (manifiesto y service worker que cachea solo el armazon)` --conceptually_related_to--> `frontend-agent`  [INFERRED]
  README.md → .claude/agents/frontend-agent.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Unreplaced create-next-app Scaffolding (README + public SVGs)** — apps_web_readme_create_next_app_boilerplate, apps_web_public_file_file_icon, apps_web_public_globe_globe_icon, apps_web_public_next_next_wordmark, apps_web_public_vercel_vercel_logo, apps_web_public_window_window_icon [INFERRED 0.85]
- **Stickman PWA Icon Set (192 / 512 / maskable / apple-touch)** — apps_web_public_icons_icon_192_stickman_icon, apps_web_public_icons_icon_512_stickman_icon, apps_web_public_icons_icon_maskable_512_stickman_icon, apps_web_public_icons_apple_touch_icon_stickman_icon [INFERRED 0.95]
- **Particion de propiedad de archivos entre los seis agentes** — _claude_agents_backend_agent_backend_agent, _claude_agents_frontend_agent_frontend_agent, _claude_agents_render_worker_agent_render_worker_agent, _claude_agents_devops_agent_devops_agent, _claude_agents_qa_agent_qa_agent, _claude_agents_graphify_agent_graphify_agent, claude_non_overlapping_file_scopes [EXTRACTED 1.00]
- **Puerta antes del push a master: verify, end-to-end y actualizacion del grafo** — claude_pre_commit_gate, _claude_agents_qa_agent_qa_agent, claude_npm_run_verify, claude_scripts_e2e, _claude_agents_graphify_agent_graphify_agent [EXTRACTED 1.00]
- **Produccion de un video de extremo a extremo** — readme_video_pipeline, _claude_agents_backend_agent_video_persistence, readme_approval_states, _claude_agents_render_worker_agent_index, _claude_agents_render_worker_agent_voice, _claude_agents_render_worker_agent_drawing, readme_mp4_storage [INFERRED 0.85]

## Communities (57 total, 15 thin omitted)

### Community 0 - "Cliente HTTP de la UI"
Cohesion: 0.05
Nodes (87): applyBrandTemplate(), BrandingPatch, createVideo(), deleteBrandTemplate(), deleteScene(), deleteVideo(), duplicateVideo(), fetchBrandTemplates() (+79 more)

### Community 1 - "Plantillas de marca (API)"
Cohesion: 0.05
Nodes (73): DELETE(), RouteContext, coerceBranding(), CreateBody, GET(), LOGO_POSITIONS, POST(), POST() (+65 more)

### Community 2 - "Copiloto y proveedor de IA"
Cohesion: 0.08
Nodes (59): POST(), VideoRecord, isCopilotConfigured(), abrirVideo(), ACTIONS, aplicarBranding(), aplicarMarca(), borrarEscena() (+51 more)

### Community 3 - "Edicion y regeneracion de escena"
Cohesion: 0.07
Nodes (43): ACTIONS, buildRegenerateSystemPrompt(), CHARACTERS, coerceAction(), coerceCharacter(), coerceDescription(), coerceProp(), DELETE() (+35 more)

### Community 4 - "Config de ESLint y paquete web"
Cohesion: 0.05
Nodes (38): eslintConfig, dependencies, next, react, react-dom, @supabase/supabase-js, devDependencies, autoprefixer (+30 more)

### Community 5 - "Dibujo de personajes"
Cohesion: 0.11
Nodes (33): drawBackground(), drawFigure(), drawHand(), drawHead(), drawProp(), drawSceneFrame(), drawShadow(), drawShoe() (+25 more)

### Community 6 - "Orquestacion del render"
Cohesion: 0.10
Nodes (30): aiVideoModel(), isAiVideoEnabled(), createFrameCanvas(), applyLogoOverlayOrFallback(), CharacterType, DEFAULT_BRANDING, ENCODER_THREADS, getLogoOverlayPosition() (+22 more)

### Community 7 - "Paquete raiz del monorepo"
Cohesion: 0.08
Nodes (25): dependencies, next, react, react-dom, next, react, react-dom, name (+17 more)

### Community 8 - "Asistente por palabras clave"
Cohesion: 0.12
Nodes (22): POST(), ACTION_WORDS, AssistantAction, AssistantContext, AssistantReply, BrandPatch, CHARACTER_WORDS, COLOR_WORDS (+14 more)

### Community 9 - "TypeScript de la web"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "Reglas de agentes: worker y QA"
Cohesion: 0.14
Nodes (18): Usar process.exitCode: process.exit() rompe libuv en Windows, Verificar el dato almacenado, no el mensaje de respuesta, ai-video.ts (camino opcional de fal.ai), ffmpeg drawbox evalua sus expresiones una sola vez al inicializar el filtro, drawing.ts (figuras, props, subtitulos, branding), Todo camino opcional degrada al local: sin fal.ai, sin clave de TTS y sin nube, index.ts (orquesta el render: job, frames, ffmpeg, subida), Convencion de angulos de extremidades en drawing.ts (grados desde abajo, positivo hacia +x) (+10 more)

### Community 11 - "Planificador de escenas"
Cohesion: 0.20
Nodes (16): ACTIONS, buildScenesFromAiJson(), buildSentenceFallback(), buildSystemPrompt(), CHARACTERS, coerceAction(), coerceCharacter(), coerceDescription() (+8 more)

### Community 12 - "Voz offline (TTS)"
Cohesion: 0.16
Nodes (13): unbzip2-stream, downloadModel(), ensureVoiceModel(), exists(), getTts(), mouthEnvelope(), speak(), SPEAKING_RATE (+5 more)

### Community 13 - "Propiedad de archivos por agente"
Cohesion: 0.19
Nodes (13): Las reglas de negocio viven en un solo lugar, lib/copilot.ts (tool calling del copiloto), lib/video-persistence.ts (el hub de persistencia), Vercel construye desde la raiz del repo, app/components/api.ts (unico punto donde la UI habla con el servidor), assistant.tsx (panel del copiloto), Dos caminos al mismo estado: el formulario y el chat, video-studio.tsx (lista, asistente y workspace) (+5 more)

### Community 14 - "Reglas de interfaz y del grafo"
Cohesion: 0.17
Nodes (13): Todo control necesita un nombre accesible (el panel se maneja por voz), Tema oscuro con colores explicitos en los controles de formulario, frontend-agent, localStorage solo para conveniencias por visor, envuelto en try/catch, Comunidades que cruzan las costuras previstas, RNF-002: separacion en guion, escenas, audio/subtitulos, branding, render, persistencia y copiloto, apps/web/app/components, App shell de web (layout.tsx, page.tsx, globals.css, manifest.ts) (+5 more)

### Community 15 - "Reglas compartidas del proyecto"
Cohesion: 0.26
Nodes (12): backend-agent, Validar todo lo que llega de un modelo o de un cliente y degradar a valores por defecto, render-worker-agent, Sangria con tabs en este workspace, a diferencia de apps/web, Migraciones append-only, apps/web/lib, Agente lider de Stickman, Sin asesoria financiera personalizada ni tasas inventadas (+4 more)

### Community 16 - "Paquete del render worker"
Cohesion: 0.17
Nodes (11): @supabase/supabase-js, @types/node, typescript, name, private, version, dejavu-fonts-ttf, ffmpeg-static (+3 more)

### Community 17 - "Panel del asistente"
Cohesion: 0.24
Nodes (10): Assistant(), say(), send(), toggleMic(), AssistantProps, getRecognition(), Recognition, speak() (+2 more)

### Community 18 - "Config de Next.js"
Cohesion: 0.18
Nodes (9): nextConfig, rootEnvPath, ref_node_fs, ref_node_path, ref_node_process, ref_node_url, PROVIDERS, root (+1 more)

### Community 19 - "Generador del fondo"
Cohesion: 0.18
Nodes (10): @napi-rs/canvas, base, blooms, buffer, canvas, ctx, image, OUT (+2 more)

### Community 20 - "Reglas de backend y devops"
Cohesion: 0.25
Nodes (11): lib/ai-provider.ts (generateWithFallback: Groq, OpenRouter, legacy), lib/assistant.ts (interprete por palabras clave), apps/web/.env.local.example, devops-agent, Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json), scripts/check-ai.mjs (que proveedor de lenguaje responde), Hoy ningun proveedor de lenguaje responde; el copiloto cae al modo basico por palabras clave, Ninguna clave en un archivo versionado (+3 more)

### Community 21 - "Reglas de devops, grafo y QA"
Cohesion: 0.25
Nodes (11): .github/workflows/verify.yml (CI en cada push y PR a master), graphify-out/GRAPH_REPORT.md, graphify-agent, graphify-out/.graphify_python (graphify instalado como uv tool, fuera del PATH), Archivo huerfano (codigo muerto o mal cableado), Nunca dejar datos de prueba en Supabase (el mismo proyecto guarda registros reales), qa-agent, Trampa EPERM: apps/web/.next tomado por el dev server u OneDrive (+3 more)

### Community 22 - "TypeScript del worker"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, module, moduleResolution, outDir, skipLibCheck, strict (+2 more)

### Community 23 - "Suite end-to-end"
Cohesion: 0.18
Nodes (6): ref_node_os, fail, mp4Path, results, S, W

### Community 24 - "Video con IA (fal.ai)"
Cohesion: 0.24
Nodes (9): ACTION_VERBS, buildScenePrompt(), CHARACTER_SUBJECTS, extractVideoUrl(), FAL_KEY, falFetch(), generateSceneVideo(), PROP_SCENERY (+1 more)

### Community 25 - "Dependencias del worker"
Cohesion: 0.22
Nodes (9): dependencies, dejavu-fonts-ttf, ffmpeg-static, fluent-ffmpeg, @napi-rs/canvas, sherpa-onnx, @supabase/supabase-js, tar-stream (+1 more)

### Community 26 - "Shell de la app y PWA"
Cohesion: 0.25
Nodes (6): ServiceWorker(), apps_web_app_globals, geistMono, geistSans, metadata, viewport

### Community 27 - "Paridad de tipos del dominio"
Cohesion: 0.25
Nodes (7): Exact, CharacterType, SceneAction, ScenePropType, Branding, LogoPosition, Platform

### Community 28 - "Arranque de desarrollo"
Cohesion: 0.29
Nodes (7): ref_node_child_process, children, envFiles, loaded, repoRoot, shutdown(), start()

### Community 29 - "Despliegue y render asincrono"
Cohesion: 0.29
Nodes (7): Railway despliega apps/render-worker como servicio aparte, RENDER_WORKER_URL, Los paneles que copian un registro van keyed por lo que lo sembro, El progreso se escribe en la fila del video, no se guarda en memoria, apps/render-worker, Render asincrono: POST /render responde 202 y procesa en segundo plano, GET /health (estado, almacenamiento y motor de video)

### Community 30 - "TypeScript de la comprobacion"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, extends, include, ./tsconfig.json

### Community 31 - "Migracion: esquema inicial"
Cohesion: 0.53
Nodes (5): public.scenes, public.videos, scenes_video_id_order_idx, auth.users, videos_user_id_created_at_idx

### Community 32 - "Esquema de Supabase"
Cohesion: 0.53
Nodes (5): public.scenes, public.videos, scenes_video_id_order_idx, auth.users, videos_user_id_created_at_idx

### Community 33 - "DevDependencies del worker"
Cohesion: 0.40
Nodes (5): devDependencies, tsx, @types/node, @types/tar-stream, typescript

### Community 34 - "Scripts del worker"
Cohesion: 0.40
Nodes (5): scripts, build, check:types, dev, start

### Community 35 - "Regla: mirar la salida real"
Cohesion: 0.50
Nodes (4): No reportar verde en un build que no viste terminar, Verificar en un navegador real con Playwright, no razonando sobre el JSX, Una captura que no miraste no prueba nada, Renderizar fotogramas y mirarlos antes de dar por buena una pose

### Community 36 - "Iconos de la PWA"
Cohesion: 0.50
Nodes (4): Stickman Apple Touch Icon, Stickman PWA Icon 192, Stickman PWA Icon 512, Stickman Maskable Icon 512

### Community 37 - "Vercel (web)"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 38 - "Migracion: plantillas"
Cohesion: 0.67
Nodes (3): brand_templates_user_id_idx, public.brand_templates, auth.users

### Community 39 - "Vercel (raiz)"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 40 - "Iconos por defecto"
Cohesion: 0.67
Nodes (3): File Glyph Icon (SVG), Globe Glyph Icon (SVG), Browser Window Glyph Icon (SVG)

### Community 41 - "Restos del boilerplate"
Cohesion: 0.67
Nodes (3): Next.js Wordmark (SVG), Vercel Triangle Logo (SVG), create-next-app Boilerplate README

## Ambiguous Edges - Review These
- `scripts/check-ai.mjs (que proveedor de lenguaje responde)` → `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)`  [AMBIGUOUS]
  .claude/agents/devops-agent.md · relation: references
- `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)` → `apps/web/.env.local.example`  [AMBIGUOUS]
  .claude/agents/devops-agent.md · relation: references
- `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)` → `scripts/e2e.mjs y la suite de pruebas`  [AMBIGUOUS]
  .claude/agents/qa-agent.md · relation: references

## Knowledge Gaps
- **263 isolated node(s):** `supabase`, `FAL_KEY`, `TIMEOUT_MS`, `CHARACTER_SUBJECTS`, `ACTION_VERBS` (+258 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 315 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `scripts/check-ai.mjs (que proveedor de lenguaje responde)` and `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)` and `apps/web/.env.local.example`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)` and `scripts/e2e.mjs y la suite de pruebas`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `apps/web/app/api (rutas de API)` connect `Propiedad de archivos por agente` to `Plantillas de marca (API)`, `Reglas compartidas del proyecto`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `backend-agent` connect `Reglas compartidas del proyecto` to `Reglas de devops, grafo y QA`, `Reglas de backend y devops`, `Propiedad de archivos por agente`, `Reglas de interfaz y del grafo`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `Platform` connect `Cliente HTTP de la UI` to `Asistente por palabras clave`, `Plantillas de marca (API)`, `Copiloto y proveedor de IA`, `Paridad de tipos del dominio`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `supabase`, `FAL_KEY`, `TIMEOUT_MS` to the rest of the system?**
  _263 weakly-connected nodes found - possible documentation gaps or missing edges._