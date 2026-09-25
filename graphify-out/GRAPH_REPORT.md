# Graph Report - stickman-video-app  (2026-09-25)

## Corpus Check
- 87 files · ~60,392 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 2, .ico 1)

## Summary
- 838 nodes · 1633 edges · 62 communities (46 shown, 16 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bed16fd8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- video-persistence.ts
- copilot.ts
- SceneRow
- web/package.json
- drawing.ts
- index.ts
- scripts
- assistant.ts
- compilerOptions
- index.ts (orquesta el render: job, frames, ffmpeg, subida)
- check-ai.mjs
- voice.ts
- apps/web/app/api (rutas de API)
- frontend-agent
- backend-agent
- set-ai-key.mjs
- assistant.tsx
- ref_node_fs
- make-backdrop.mjs
- devops-agent
- qa-agent
- compilerOptions
- e2e.mjs
- ai-video.ts
- dependencies
- layout.tsx
- type-parity.ts
- dev.mjs
- apps/render-worker
- tsconfig.check.json
- 20260910000000_initial_schema.sql
- schema.sql
- [sceneId]/route.ts
- scenes/route.ts
- Una captura que no miraste no prueba nada
- Stickman PWA Icon 192
- web/vercel.json
- public.brand_templates
- vercel.json
- Browser Window Glyph Icon (SVG)
- create-next-app Boilerplate README
- npm run verify (lint + typecheck + build)
- Next.js Agent Rules Block
- postcss.config.mjs
- .mcp.json
- 20260917000000_properties.sql
- public.scenes
- public.videos
- public.videos
- public.videos
- public.videos
- render-worker/package.json
- devDependencies
- cameraFor
- scripts
- types.d.ts

## God Nodes (most connected - your core abstractions)
1. `getSupabaseClient()` - 24 edges
2. `getVideo()` - 20 edges
3. `render()` - 20 edges
4. `getTemplate()` - 19 edges
5. `next` - 18 edges
6. `VideoRecord` - 17 edges
7. `toVideoRecord()` - 16 edges
8. `scripts` - 16 edges
9. `compilerOptions` - 16 edges
10. `readText()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `Sin Supabase la app funciona con almacenamiento en memoria` --semantically_similar_to--> `Todo camino opcional degrada al local: sin fal.ai, sin clave de TTS y sin nube`  [INFERRED] [semantically similar]
  README.md → .claude/agents/render-worker-agent.md
- `Alcances de archivo sin solape entre agentes` --semantically_similar_to--> `RNF-002: separacion en guion, escenas, audio/subtitulos, branding, render, persistencia y copiloto`  [INFERRED] [semantically similar]
  CLAUDE.md → .claude/agents/graphify-agent.md
- `index.ts (orquesta el render: job, frames, ffmpeg, subida)` --references--> `GET /health (estado, almacenamiento y motor de video)`  [INFERRED]
  .claude/agents/render-worker-agent.md → README.md
- `index.ts (orquesta el render: job, frames, ffmpeg, subida)` --references--> `Subida del MP4 al bucket SUPABASE_RENDERS_BUCKET`  [INFERRED]
  .claude/agents/render-worker-agent.md → README.md
- `RNF-002: separacion en guion, escenas, audio/subtitulos, branding, render, persistencia y copiloto` --conceptually_related_to--> `Pipeline: tema -> guion (LLM) -> escenas -> voz (TTS) -> MP4 con subtitulos`  [INFERRED]
  .claude/agents/graphify-agent.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Particion de propiedad de archivos entre los seis agentes** — _claude_agents_backend_agent_backend_agent, _claude_agents_frontend_agent_frontend_agent, _claude_agents_render_worker_agent_render_worker_agent, _claude_agents_devops_agent_devops_agent, _claude_agents_qa_agent_qa_agent, _claude_agents_graphify_agent_graphify_agent, claude_non_overlapping_file_scopes [EXTRACTED 1.00]
- **Puerta antes del push a master: verify, end-to-end y actualizacion del grafo** — claude_pre_commit_gate, _claude_agents_qa_agent_qa_agent, claude_npm_run_verify, claude_scripts_e2e, _claude_agents_graphify_agent_graphify_agent [EXTRACTED 1.00]
- **Unreplaced create-next-app Scaffolding (README + public SVGs)** — apps_web_readme_create_next_app_boilerplate, apps_web_public_file_file_icon, apps_web_public_globe_globe_icon, apps_web_public_next_next_wordmark, apps_web_public_vercel_vercel_logo, apps_web_public_window_window_icon [INFERRED 0.85]
- **Produccion de un video de extremo a extremo** — readme_video_pipeline, _claude_agents_backend_agent_video_persistence, readme_approval_states, _claude_agents_render_worker_agent_index, _claude_agents_render_worker_agent_voice, _claude_agents_render_worker_agent_drawing, readme_mp4_storage [INFERRED 0.85]
- **Stickman PWA Icon Set (192 / 512 / maskable / apple-touch)** — apps_web_public_icons_icon_192_stickman_icon, apps_web_public_icons_icon_512_stickman_icon, apps_web_public_icons_icon_maskable_512_stickman_icon, apps_web_public_icons_apple_touch_icon_stickman_icon [INFERRED 0.95]

## Communities (62 total, 16 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.05
Nodes (78): globalStore, transitions, videos, applyBrandTemplate(), BrandingPatch, createVideo(), deleteBrandTemplate(), deleteVideo() (+70 more)

### Community 1 - "video-persistence.ts"
Cohesion: 0.06
Nodes (63): DELETE(), RouteContext, coerceBranding(), CreateBody, GET(), LOGO_POSITIONS, POST(), POST() (+55 more)

### Community 2 - "copilot.ts"
Cohesion: 0.05
Nodes (81): POST(), apps_web_lib_ai_models, ChatMessage, CompletionResponse, EXHAUSTED, GenerateOptions, generateWithFallback(), GenerationResult (+73 more)

### Community 3 - "SceneRow"
Cohesion: 0.31
Nodes (11): deleteScene(), regenerateScene(), updateScene(), SceneRow(), applyPatch(), handleActionChange(), handleCharacterChange(), handleDelete() (+3 more)

### Community 4 - "web/package.json"
Cohesion: 0.05
Nodes (38): eslintConfig, dependencies, next, react, react-dom, @supabase/supabase-js, devDependencies, autoprefixer (+30 more)

### Community 5 - "drawing.ts"
Cohesion: 0.09
Nodes (39): CAMERA_PROFILES, CameraProfile, drawBackground(), drawFigure(), drawHand(), drawHead(), drawHouseShape(), drawPlaceDetails() (+31 more)

### Community 6 - "index.ts"
Cohesion: 0.09
Nodes (33): aiVideoModel(), isAiVideoEnabled(), createFrameCanvas(), FrameScene, TRANSITION_SECONDS, applyLogoOverlayOrFallback(), CharacterType, DEFAULT_BRANDING (+25 more)

### Community 7 - "scripts"
Cohesion: 0.08
Nodes (25): dependencies, next, react, react-dom, name, private, scripts, build (+17 more)

### Community 8 - "assistant.ts"
Cohesion: 0.11
Nodes (24): POST(), ABOUT_APPROVAL, ACTION_WORDS, AssistantAction, AssistantContext, AssistantReply, BrandPatch, CHARACTER_WORDS (+16 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "index.ts (orquesta el render: job, frames, ffmpeg, subida)"
Cohesion: 0.14
Nodes (18): Usar process.exitCode: process.exit() rompe libuv en Windows, Verificar el dato almacenado, no el mensaje de respuesta, ai-video.ts (camino opcional de fal.ai), ffmpeg drawbox evalua sus expresiones una sola vez al inicializar el filtro, drawing.ts (figuras, props, subtitulos, branding), Todo camino opcional degrada al local: sin fal.ai, sin clave de TTS y sin nube, index.ts (orquesta el render: job, frames, ffmpeg, subida), Convencion de angulos de extremidades en drawing.ts (grados desde abajo, positivo hacia +x) (+10 more)

### Community 11 - "check-ai.mjs"
Cohesion: 0.29
Nodes (5): ref_node_url, MODELS, PROVIDERS, root, TOOL

### Community 12 - "voice.ts"
Cohesion: 0.17
Nodes (14): clampIndex(), downloadModel(), ensureVoiceModel(), estimateWordTimings(), exists(), getTts(), mouthEnvelope(), speak() (+6 more)

### Community 13 - "apps/web/app/api (rutas de API)"
Cohesion: 0.19
Nodes (13): Las reglas de negocio viven en un solo lugar, lib/copilot.ts (tool calling del copiloto), lib/video-persistence.ts (el hub de persistencia), Vercel construye desde la raiz del repo, app/components/api.ts (unico punto donde la UI habla con el servidor), assistant.tsx (panel del copiloto), Dos caminos al mismo estado: el formulario y el chat, video-studio.tsx (lista, asistente y workspace) (+5 more)

### Community 14 - "frontend-agent"
Cohesion: 0.17
Nodes (13): Todo control necesita un nombre accesible (el panel se maneja por voz), Tema oscuro con colores explicitos en los controles de formulario, frontend-agent, localStorage solo para conveniencias por visor, envuelto en try/catch, Comunidades que cruzan las costuras previstas, RNF-002: separacion en guion, escenas, audio/subtitulos, branding, render, persistencia y copiloto, apps/web/app/components, App shell de web (layout.tsx, page.tsx, globals.css, manifest.ts) (+5 more)

### Community 15 - "backend-agent"
Cohesion: 0.26
Nodes (12): backend-agent, Validar todo lo que llega de un modelo o de un cliente y degradar a valores por defecto, render-worker-agent, Sangria con tabs en este workspace, a diferencia de apps/web, Migraciones append-only, apps/web/lib, Agente lider de Stickman, Sin asesoria financiera personalizada ni tasas inventadas (+4 more)

### Community 16 - "set-ai-key.mjs"
Cohesion: 0.16
Nodes (19): ref_node_readline, Cancelled, createSession(), question(), ENV_FILE, envFileIsIgnored(), lastLine(), main() (+11 more)

### Community 17 - "assistant.tsx"
Cohesion: 0.24
Nodes (10): Assistant(), say(), send(), toggleMic(), AssistantProps, getRecognition(), Recognition, speak() (+2 more)

### Community 18 - "ref_node_fs"
Cohesion: 0.22
Nodes (7): nextConfig, rootEnvPath, ref_node_fs, ref_node_path, ref_node_process, args, root

### Community 19 - "make-backdrop.mjs"
Cohesion: 0.18
Nodes (10): @napi-rs/canvas, base, blooms, buffer, canvas, ctx, image, OUT (+2 more)

### Community 20 - "devops-agent"
Cohesion: 0.25
Nodes (11): lib/ai-provider.ts (generateWithFallback: Groq, OpenRouter, legacy), lib/assistant.ts (interprete por palabras clave), apps/web/.env.local.example, devops-agent, Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json), scripts/check-ai.mjs (que proveedor de lenguaje responde), Hoy ningun proveedor de lenguaje responde; el copiloto cae al modo basico por palabras clave, Ninguna clave en un archivo versionado (+3 more)

### Community 21 - "qa-agent"
Cohesion: 0.25
Nodes (11): .github/workflows/verify.yml (CI en cada push y PR a master), graphify-out/GRAPH_REPORT.md, graphify-agent, graphify-out/.graphify_python (graphify instalado como uv tool, fuera del PATH), Archivo huerfano (codigo muerto o mal cableado), Nunca dejar datos de prueba en Supabase (el mismo proyecto guarda registros reales), qa-agent, Trampa EPERM: apps/web/.next tomado por el dev server u OneDrive (+3 more)

### Community 22 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, module, moduleResolution, outDir, skipLibCheck, strict (+2 more)

### Community 23 - "e2e.mjs"
Cohesion: 0.18
Nodes (6): ref_node_os, fail, mp4Path, results, S, W

### Community 24 - "ai-video.ts"
Cohesion: 0.24
Nodes (9): ACTION_VERBS, buildScenePrompt(), CHARACTER_SUBJECTS, extractVideoUrl(), FAL_KEY, falFetch(), generateSceneVideo(), PROP_SCENERY (+1 more)

### Community 25 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, dejavu-fonts-ttf, ffmpeg-static, fluent-ffmpeg, @napi-rs/canvas, sherpa-onnx, @supabase/supabase-js, tar-stream (+1 more)

### Community 26 - "layout.tsx"
Cohesion: 0.25
Nodes (6): ServiceWorker(), apps_web_app_globals, geistMono, geistSans, metadata, viewport

### Community 27 - "type-parity.ts"
Cohesion: 0.25
Nodes (7): Exact, CharacterType, SceneAction, ScenePropType, Branding, LogoPosition, Platform

### Community 28 - "dev.mjs"
Cohesion: 0.29
Nodes (7): ref_node_child_process, children, envFiles, loaded, repoRoot, shutdown(), start()

### Community 29 - "apps/render-worker"
Cohesion: 0.29
Nodes (7): Railway despliega apps/render-worker como servicio aparte, RENDER_WORKER_URL, Los paneles que copian un registro van keyed por lo que lo sembro, El progreso se escribe en la fila del video, no se guarda en memoria, apps/render-worker, Render asincrono: POST /render responde 202 y procesa en segundo plano, GET /health (estado, almacenamiento y motor de video)

### Community 30 - "tsconfig.check.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, extends, include, ./tsconfig.json

### Community 31 - "20260910000000_initial_schema.sql"
Cohesion: 0.53
Nodes (5): public.scenes, public.videos, scenes_video_id_order_idx, auth.users, videos_user_id_created_at_idx

### Community 32 - "schema.sql"
Cohesion: 0.53
Nodes (5): public.scenes, public.videos, scenes_video_id_order_idx, auth.users, videos_user_id_created_at_idx

### Community 33 - "[sceneId]/route.ts"
Cohesion: 0.14
Nodes (24): ACTIONS, buildRegenerateSystemPrompt(), CHARACTERS, coerceAction(), coerceCharacter(), coerceDescription(), coerceProp(), DELETE() (+16 more)

### Community 34 - "scenes/route.ts"
Cohesion: 0.10
Nodes (30): BatchFailure, planScenes(), PLATFORMS, POST(), ACTIONS, buildScenesFromAiJson(), buildSentenceFallback(), buildSystemPrompt() (+22 more)

### Community 35 - "Una captura que no miraste no prueba nada"
Cohesion: 0.50
Nodes (4): No reportar verde en un build que no viste terminar, Verificar en un navegador real con Playwright, no razonando sobre el JSX, Una captura que no miraste no prueba nada, Renderizar fotogramas y mirarlos antes de dar por buena una pose

### Community 36 - "Stickman PWA Icon 192"
Cohesion: 0.50
Nodes (4): Stickman Apple Touch Icon, Stickman PWA Icon 192, Stickman PWA Icon 512, Stickman Maskable Icon 512

### Community 37 - "web/vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 38 - "public.brand_templates"
Cohesion: 0.67
Nodes (3): brand_templates_user_id_idx, public.brand_templates, auth.users

### Community 39 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 40 - "Browser Window Glyph Icon (SVG)"
Cohesion: 0.67
Nodes (3): File Glyph Icon (SVG), Globe Glyph Icon (SVG), Browser Window Glyph Icon (SVG)

### Community 41 - "create-next-app Boilerplate README"
Cohesion: 0.67
Nodes (3): Next.js Wordmark (SVG), Vercel Triangle Logo (SVG), create-next-app Boilerplate README

### Community 57 - "render-worker/package.json"
Cohesion: 0.17
Nodes (11): @supabase/supabase-js, @types/node, typescript, name, private, version, dejavu-fonts-ttf, ffmpeg-static (+3 more)

### Community 58 - "devDependencies"
Cohesion: 0.40
Nodes (5): devDependencies, tsx, @types/node, @types/tar-stream, typescript

### Community 59 - "cameraFor"
Cohesion: 0.47
Nodes (6): cameraFor(), clamp(), drawTransitionFrame(), easeInOut(), lerp(), poseFor()

### Community 60 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, check:types, dev, start

## Ambiguous Edges - Review These
- `scripts/e2e.mjs y la suite de pruebas` → `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)`  [AMBIGUOUS]
  .claude/agents/qa-agent.md · relation: references
- `apps/web/.env.local.example` → `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)`  [AMBIGUOUS]
  .claude/agents/devops-agent.md · relation: references
- `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)` → `scripts/check-ai.mjs (que proveedor de lenguaje responde)`  [AMBIGUOUS]
  .claude/agents/devops-agent.md · relation: references

## Knowledge Gaps
- **279 isolated node(s):** `PLATFORMS`, `BatchFailure`, `CopilotResult`, `CopilotState`, `ToolArgs` (+274 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 335 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `scripts/e2e.mjs y la suite de pruebas` and `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `apps/web/.env.local.example` and `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)` and `scripts/check-ai.mjs (que proveedor de lenguaje responde)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `apps/web/app/api (rutas de API)` connect `apps/web/app/api (rutas de API)` to `video-persistence.ts`, `backend-agent`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `next` connect `video-persistence.ts` to `[sceneId]/route.ts`, `copilot.ts`, `scenes/route.ts`, `scripts`, `assistant.ts`, `ref_node_fs`, `layout.tsx`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `backend-agent` connect `backend-agent` to `qa-agent`, `devops-agent`, `apps/web/app/api (rutas de API)`, `frontend-agent`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **What connects `PLATFORMS`, `BatchFailure`, `CopilotResult` to the rest of the system?**
  _279 weakly-connected nodes found - possible documentation gaps or missing edges._