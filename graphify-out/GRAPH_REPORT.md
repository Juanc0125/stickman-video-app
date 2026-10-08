# Graph Report - stickman-video-app  (2026-10-08)

## Corpus Check
- 111 files · ~83,844 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 2, .ico 1)

## Summary
- 922 nodes · 1669 edges · 88 communities (57 shown, 31 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 38 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `03921cb3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- branding-panel.tsx
- [sceneId]/route.ts
- copilot.ts
- Verificar: la puerta de calidad
- web/package.json
- drawing.ts
- index.ts
- scripts
- assistant.ts
- compilerOptions
- Agente lider de Stickman
- ref_node_fs
- voice.ts
- Los dos servicios se comunican solo por HTTP y no comparten codigo
- apps/web/app/components
- Migraciones append-only
- set-ai-key.mjs
- assistant.tsx
- video-persistence.ts
- make-backdrop.mjs
- Variables de entorno del proyecto
- graphify-out (grafo, reporte y cache)
- compilerOptions
- e2e.mjs
- ai-video.ts
- api.ts
- layout.tsx
- type-parity.ts
- dev.mjs
- Render asincrono: POST /render responde 202 y procesa en segundo plano
- tsconfig.check.json
- 20260910000000_initial_schema.sql
- schema.sql
- ai-provider.ts
- ScenePanel
- scenes/route.ts
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
- brand-templates.ts
- video-list.tsx
- video-workspace.tsx
- SceneRow
- Desplegar y comprobar
- video.ts
- cameraFor
- grafo-pendiente.mjs
- plugin.json
- login-form.tsx
- render-worker-agent.md
- frontend-agent.md
- graphify-agent.md
- getVideo
- getSupabaseClient
- devops-agent.md
- qa-agent.md
- duplicate/route.ts
- Sin Supabase la app funciona con almacenamiento en memoria
- App shell de web (layout.tsx, page.tsx, globals.css, manifest.ts)
- apps/web/lib
- Configuracion de build y despliegue (package.json, workflows, vercel.json, .mcp.json)
- scripts/check-ai.mjs (que proveedor de lenguaje responde)
- Hoy ningun proveedor de lenguaje responde; el copiloto cae al modo basico por palabras clave
- npm run dev (web en 3000 y worker en 8080)
- packages/shared-types
- scripts/e2e.mjs y la suite de pruebas
- Instalacion como aplicacion (manifiesto y service worker que cachea solo el armazon)
- supabase/migrations (esquema de la base de datos)

## God Nodes (most connected - your core abstractions)
1. `getSupabaseClient()` - 24 edges
2. `getVideo()` - 20 edges
3. `render()` - 20 edges
4. `getTemplate()` - 19 edges
5. `next` - 19 edges
6. `generateWithFallback()` - 18 edges
7. `toVideoRecord()` - 17 edges
8. `scripts` - 16 edges
9. `compilerOptions` - 16 edges
10. `VideoRecord` - 15 edges

## Surprising Connections (you probably didn't know these)
- `What is already there` --references--> `generateWithFallback()`  [INFERRED]
  plugin/agents/backend-agent.md → apps/web/lib/ai-provider.ts
- `Before you finish` --references--> `drawSceneFrame()`  [INFERRED]
  plugin/agents/render-worker-agent.md → apps/render-worker/drawing.ts
- `Before you finish` --references--> `createFrameCanvas()`  [INFERRED]
  plugin/agents/render-worker-agent.md → apps/render-worker/drawing.ts
- `toVideoRecord()` --calls--> `getTemplate()`  [EXTRACTED]
  apps/web/lib/video-persistence.ts → packages/shared-types/templates.ts
- `estadoProyecto()` --calls--> `getTemplate()`  [EXTRACTED]
  apps/web/lib/copilot.ts → packages/shared-types/templates.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Unreplaced create-next-app Scaffolding (README + public SVGs)** — apps_web_readme_create_next_app_boilerplate, apps_web_public_file_file_icon, apps_web_public_globe_globe_icon, apps_web_public_next_next_wordmark, apps_web_public_vercel_vercel_logo, apps_web_public_window_window_icon [INFERRED 0.85]
- **Stickman PWA Icon Set (192 / 512 / maskable / apple-touch)** — apps_web_public_icons_icon_192_stickman_icon, apps_web_public_icons_icon_512_stickman_icon, apps_web_public_icons_icon_maskable_512_stickman_icon, apps_web_public_icons_apple_touch_icon_stickman_icon [INFERRED 0.95]

## Communities (88 total, 31 thin omitted)

### Community 0 - "branding-panel.tsx"
Cohesion: 0.20
Nodes (17): applyBrandTemplate(), BrandingPatch, deleteBrandTemplate(), fetchBrandTemplates(), saveBrandTemplate(), updateBranding(), uploadLogo(), BrandingPanel() (+9 more)

### Community 1 - "[sceneId]/route.ts"
Cohesion: 0.18
Nodes (18): ACTIONS, buildRegenerateSystemPrompt(), CHARACTERS, coerceAction(), coerceCharacter(), coerceDescription(), coerceProp(), DELETE() (+10 more)

### Community 2 - "copilot.ts"
Cohesion: 0.08
Nodes (63): POST(), isCopilotConfigured(), abrirVideo(), ACTIONS, aplicarBranding(), aplicarMarca(), BatchWarning, BatchWarningCause (+55 more)

### Community 3 - "Verificar: la puerta de calidad"
Cohesion: 0.17
Nodes (11): 1. Liberar los puertos, 2. Borrar la salida del build anterior, 3. Verificar, 4. Revisar que el `.gitignore` no se haya ensuciado, 5. Levantar el entorno para la suite, 6. Comprobar que la suite no va a gastar dinero, 7. La suite end-to-end, 8. Retroalimentar el grafo (+3 more)

### Community 4 - "web/package.json"
Cohesion: 0.05
Nodes (38): eslintConfig, dependencies, next, react, react-dom, @supabase/supabase-js, devDependencies, autoprefixer (+30 more)

### Community 5 - "drawing.ts"
Cohesion: 0.09
Nodes (39): CAMERA_PROFILES, CameraProfile, drawBackground(), drawFigure(), drawHand(), drawHead(), drawHouseShape(), drawPlaceDetails() (+31 more)

### Community 6 - "index.ts"
Cohesion: 0.09
Nodes (35): aiVideoModel(), isAiVideoEnabled(), FrameScene, TRANSITION_SECONDS, applyLogoOverlayOrFallback(), CharacterType, DEFAULT_BRANDING, ENCODER_THREADS (+27 more)

### Community 7 - "scripts"
Cohesion: 0.08
Nodes (25): dependencies, next, react, react-dom, name, private, scripts, build (+17 more)

### Community 8 - "assistant.ts"
Cohesion: 0.11
Nodes (24): POST(), ABOUT_APPROVAL, ACTION_WORDS, AssistantAction, AssistantContext, AssistantReply, BrandPatch, CHARACTER_WORDS (+16 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "Agente lider de Stickman"
Cohesion: 0.12
Nodes (18): Politica de delegacion por dominio, Delegacion en orden cuando hay dependencias (backend fija el contrato, frontend lo consume), Trampa EPERM: apps/web/.next tomado por el dev server u OneDrive, Agente lider de Stickman, Sin asesoria financiera personalizada ni tasas inventadas, No inventar funcionalidad fuera de la tabla de requerimientos, Alcances de archivo sin solape entre agentes, npm run verify (lint + build de ambos workspaces) (+10 more)

### Community 11 - "ref_node_fs"
Cohesion: 0.18
Nodes (9): nextConfig, rootEnvPath, ref_node_fs, ref_node_path, ref_node_process, MODELS, PROVIDERS, root (+1 more)

### Community 12 - "voice.ts"
Cohesion: 0.15
Nodes (14): unbzip2-stream, clampIndex(), downloadModel(), ensureVoiceModel(), estimateWordTimings(), exists(), getTts(), speak() (+6 more)

### Community 13 - "Los dos servicios se comunican solo por HTTP y no comparten codigo"
Cohesion: 0.50
Nodes (4): apps/render-worker, apps/web/app/api (rutas de API), Deuda: el render worker redeclara los tipos del dominio en vez de importar shared-types, Los dos servicios se comunican solo por HTTP y no comparten codigo

### Community 16 - "set-ai-key.mjs"
Cohesion: 0.15
Nodes (19): ref_node_readline, Cancelled, createSession(), question(), ENV_FILE, envFileIsIgnored(), lastLine(), main() (+11 more)

### Community 17 - "assistant.tsx"
Cohesion: 0.13
Nodes (22): Assistant(), beginListening(), maybeResumeListening(), onSpeechEnd(), say(), send(), speak(), toggleHandsFree() (+14 more)

### Community 18 - "video-persistence.ts"
Cohesion: 0.13
Nodes (29): DELETE(), PATCH(), RouteContext, canTransition(), globalStore, transitions, VideoRecord, videos (+21 more)

### Community 19 - "make-backdrop.mjs"
Cohesion: 0.18
Nodes (10): @napi-rs/canvas, base, blooms, buffer, canvas, ctx, image, OUT (+2 more)

### Community 20 - "Variables de entorno del proyecto"
Cohesion: 0.67
Nodes (3): Ninguna clave en un archivo versionado, Variables de entorno del proyecto, Formatos validos de clave de Supabase (sb_publishable_ y sb_secret_)

### Community 22 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, module, moduleResolution, outDir, skipLibCheck, strict (+2 more)

### Community 23 - "e2e.mjs"
Cohesion: 0.15
Nodes (10): ref_node_os, api(), cookieHeader(), cookieJar, fail, mp4Path, raiz, results (+2 more)

### Community 24 - "ai-video.ts"
Cohesion: 0.22
Nodes (10): ACTION_VERBS, buildScenePrompt(), CHARACTER_SUBJECTS, extractVideoUrl(), FAL_KEY, falFetch(), generateSceneVideo(), MODEL_BASE (+2 more)

### Community 25 - "api.ts"
Cohesion: 0.16
Nodes (13): BatchCreateResult, BatchCreateWarning, BatchWarningCause, fetchSession(), fetchVideos(), JSON_HEADERS, logout(), parseJsonSafe() (+5 more)

### Community 26 - "layout.tsx"
Cohesion: 0.25
Nodes (6): ServiceWorker(), apps_web_app_globals, geistMono, geistSans, metadata, viewport

### Community 27 - "type-parity.ts"
Cohesion: 0.25
Nodes (7): Exact, CharacterType, SceneAction, ScenePropType, Branding, LogoPosition, Platform

### Community 28 - "dev.mjs"
Cohesion: 0.18
Nodes (10): ref_node_child_process, ref_node_url, children, envFiles, loaded, repoRoot, shutdown(), start() (+2 more)

### Community 30 - "tsconfig.check.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, extends, include, ./tsconfig.json

### Community 31 - "20260910000000_initial_schema.sql"
Cohesion: 0.53
Nodes (5): public.scenes, public.videos, scenes_video_id_order_idx, auth.users, videos_user_id_created_at_idx

### Community 32 - "schema.sql"
Cohesion: 0.53
Nodes (5): public.scenes, public.videos, scenes_video_id_order_idx, auth.users, videos_user_id_created_at_idx

### Community 33 - "ai-provider.ts"
Cohesion: 0.08
Nodes (35): AiProvider, configuredProviders(), generateAiText(), GeneratedResponse, apps_web_lib_ai_models, ChatMessage, CompletionResponse, EXHAUSTED (+27 more)

### Community 34 - "ScenePanel"
Cohesion: 0.60
Nodes (5): generateScenes(), generateVoice(), ScenePanel(), handleGenerateScenes(), handleGenerateVoice()

### Community 35 - "scenes/route.ts"
Cohesion: 0.10
Nodes (31): BatchFailure, BatchWarning, BatchWarningCause, buildWarning(), planScenes(), PLATFORMS, POST(), ACTIONS (+23 more)

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
Cohesion: 0.40
Nodes (4): buildCommand, crons, framework, installCommand

### Community 40 - "Browser Window Glyph Icon (SVG)"
Cohesion: 0.67
Nodes (3): File Glyph Icon (SVG), Globe Glyph Icon (SVG), Browser Window Glyph Icon (SVG)

### Community 41 - "create-next-app Boilerplate README"
Cohesion: 0.67
Nodes (3): Next.js Wordmark (SVG), Vercel Triangle Logo (SVG), create-next-app Boilerplate README

### Community 57 - "render-worker/package.json"
Cohesion: 0.06
Nodes (31): dependencies, dejavu-fonts-ttf, ffmpeg-static, fluent-ffmpeg, @napi-rs/canvas, sherpa-onnx, @supabase/supabase-js, tar-stream (+23 more)

### Community 58 - "brand-templates.ts"
Cohesion: 0.17
Nodes (17): DELETE(), RouteContext, coerceBranding(), CreateBody, GET(), LOGO_POSITIONS, POST(), createBrandTemplate() (+9 more)

### Community 59 - "video-list.tsx"
Cohesion: 0.17
Nodes (16): BatchCreateFailure, createVideo(), createVideosBatch(), deleteVideo(), BatchSummary, CreateMode, formatElapsed(), VideoList() (+8 more)

### Community 60 - "video-workspace.tsx"
Cohesion: 0.12
Nodes (23): duplicateVideo(), saveScript(), StatusAction, transitionStatus(), VideoRecord, BrandingPanelProps, PLATFORM_LABELS, PLATFORM_OPTIONS (+15 more)

### Community 61 - "SceneRow"
Cohesion: 0.31
Nodes (11): deleteScene(), regenerateScene(), updateScene(), SceneRow(), applyPatch(), handleActionChange(), handleCharacterChange(), handleDelete() (+3 more)

### Community 62 - "Desplegar y comprobar"
Cohesion: 0.22
Nodes (8): Antes de empujar, Comprobar producción, Desplegar y comprobar, El worker de Railway es aparte, Empujar, Esperar el despliegue, Qué reportar, Si tocaste `vercel.json`

### Community 63 - "video.ts"
Cohesion: 0.21
Nodes (16): ScenePatch, ACTION_OPTIONS, CHARACTER_OPTIONS, PROP_OPTIONS, STATUS_BADGE_CLASSES, STATUS_LABELS, SceneRowProps, TemplateBeat (+8 more)

### Community 64 - "cameraFor"
Cohesion: 0.47
Nodes (6): cameraFor(), clamp(), drawTransitionFrame(), easeInOut(), lerp(), poseFor()

### Community 65 - "grafo-pendiente.mjs"
Cohesion: 0.22
Nodes (7): etiquetas, INDEXADAS, manifest, manifestPath, pendientes, raiz, total

### Community 66 - "plugin.json"
Cohesion: 0.25
Nodes (7): author, name, description, keywords, name, $schema, version

### Community 67 - "login-form.tsx"
Cohesion: 0.43
Nodes (4): login(), LoginForm(), handleSubmit(), metadata

### Community 68 - "render-worker-agent.md"
Cohesion: 0.29
Nodes (6): createFrameCanvas(), Antes de escribir algo nuevo, Before you finish, How it works, Rules, Style

### Community 69 - "frontend-agent.md"
Cohesion: 0.29
Nodes (6): Antes de escribir algo nuevo, Before you finish, Rules, Style, What is already there, Your files

### Community 70 - "graphify-agent.md"
Cohesion: 0.29
Nodes (6): Committing the output, Report, Running it, What to look for in GRAPH_REPORT.md, Whether a run is needed at all — measure it, do not guess, Your files

### Community 71 - "getVideo"
Cohesion: 0.17
Nodes (14): POST(), RouteContext, BrandingPatchBody, LOGO_POSITIONS, PATCH(), RouteContext, MIME_CONTENT_TYPES, MIME_EXTENSIONS (+6 more)

### Community 72 - "getSupabaseClient"
Cohesion: 0.33
Nodes (7): POST(), RouteContext, getSupabaseClient(), supabase, synthesizeSpeech(), updateScene(), ref_supabase_supabase_js

### Community 73 - "devops-agent.md"
Cohesion: 0.40
Nodes (4): Before you finish, Rules, What must keep working, Your files

### Community 74 - "qa-agent.md"
Cohesion: 0.40
Nodes (4): How to report, Rules, What to run, Your files

### Community 75 - "duplicate/route.ts"
Cohesion: 0.50
Nodes (4): PLATFORMS, POST(), RouteContext, duplicateForPlatform()

## Knowledge Gaps
- **372 isolated node(s):** `AssistantEntityProps`, `PALETTE`, `AssistantProps`, `Turn`, `SpeechAlternative` (+367 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 431 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `getVideo` to `[sceneId]/route.ts`, `copilot.ts`, `scenes/route.ts`, `layout.tsx`, `login-form.tsx`, `scripts`, `assistant.ts`, `getSupabaseClient`, `duplicate/route.ts`, `ref_node_fs`, `video-persistence.ts`, `brand-templates.ts`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `Platform` connect `video.ts` to `copilot.ts`, `scenes/route.ts`, `assistant.ts`, `video-list.tsx`, `duplicate/route.ts`, `video-persistence.ts`, `api.ts`, `type-parity.ts`, `video-workspace.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `CharacterType` connect `video.ts` to `[sceneId]/route.ts`, `copilot.ts`, `scenes/route.ts`, `assistant.ts`, `video-list.tsx`, `api.ts`, `type-parity.ts`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `AssistantEntityProps`, `PALETTE`, `AssistantProps` to the rest of the system?**
  _372 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `copilot.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07548076923076923 - nodes in this community are weakly interconnected._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `drawing.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09102564102564102 - nodes in this community are weakly interconnected._