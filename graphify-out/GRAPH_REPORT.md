# Graph Report - stickman-video-app  (2026-10-12)

## Corpus Check
- 118 files · ~91,279 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 2, .ico 1)

## Summary
- 1019 nodes · 1870 edges · 91 communities (59 shown, 32 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9695051f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- branding-panel.tsx
- sound-panel.tsx
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
- next
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
- video-workspace.tsx
- heygen.ts
- batch/route.ts
- dev.mjs
- Render asincrono: POST /render responde 202 y procesa en segundo plano
- tsconfig.check.json
- 20260910000000_initial_schema.sql
- schema.sql
- [sceneId]/route.ts
- proxy.ts
- scenes/route.ts
- Stickman PWA Icon 192
- web/vercel.json
- public.brand_templates
- vercel.json
- render
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
- voice.ts
- getVideo
- video-list.tsx
- video.ts
- api.ts
- Desplegar y comprobar
- tts/route.ts
- getSupabaseClient
- grafo-pendiente.mjs
- plugin.json
- check-ai.mjs
- render-worker-agent.md
- frontend-agent.md
- graphify-agent.md
- SceneRow
- layout.tsx
- devops-agent.md
- qa-agent.md
- VideoStudio
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
- cameraFor
- duplicate/route.ts
- StatusPanel

## God Nodes (most connected - your core abstractions)
1. `getSupabaseClient()` - 24 edges
2. `render()` - 24 edges
3. `next` - 23 edges
4. `getVideo()` - 22 edges
5. `getTemplate()` - 20 edges
6. `generateWithFallback()` - 18 edges
7. `readText()` - 17 edges
8. `toVideoRecord()` - 17 edges
9. `requireVideo()` - 16 edges
10. `scripts` - 16 edges

## Surprising Connections (you probably didn't know these)
- `What is already there` --references--> `generateWithFallback()`  [INFERRED]
  plugin/agents/backend-agent.md → apps/web/lib/ai-provider.ts
- `Before you finish` --references--> `drawSceneFrame()`  [INFERRED]
  plugin/agents/render-worker-agent.md → apps/render-worker/drawing.ts
- `Before you finish` --references--> `createFrameCanvas()`  [INFERRED]
  plugin/agents/render-worker-agent.md → apps/render-worker/drawing.ts
- `generarGuion()` --calls--> `getTemplate()`  [EXTRACTED]
  apps/web/lib/copilot.ts → packages/shared-types/templates.ts
- `generarVarios()` --calls--> `getTemplate()`  [EXTRACTED]
  apps/web/lib/copilot.ts → packages/shared-types/templates.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Stickman PWA Icon Set (192 / 512 / maskable / apple-touch)** — apps_web_public_icons_icon_192_stickman_icon, apps_web_public_icons_icon_512_stickman_icon, apps_web_public_icons_icon_maskable_512_stickman_icon, apps_web_public_icons_apple_touch_icon_stickman_icon [INFERRED 0.95]

## Communities (91 total, 32 thin omitted)

### Community 0 - "branding-panel.tsx"
Cohesion: 0.15
Nodes (19): applyBrandTemplate(), BrandingPatch, deleteBrandTemplate(), fetchBrandTemplates(), saveBrandTemplate(), updateBranding(), uploadLogo(), BrandingPanel() (+11 more)

### Community 1 - "sound-panel.tsx"
Cohesion: 0.11
Nodes (23): deleteSound(), fetchVideos(), registerSound(), requestSoundUpload(), setVideoMusic(), uploadSoundFile(), BusinessSounds(), handleDelete() (+15 more)

### Community 2 - "copilot.ts"
Cohesion: 0.07
Nodes (75): apps_web_app_api_videos_id_music_route, apps_web_app_api_videos_id_music_route_patch, isCopilotConfigured(), abrirVideo(), ACTIONS, aplicarBranding(), aplicarMarca(), BatchWarning (+67 more)

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
Nodes (32): isAiVideoEnabled(), Exact, CharacterType, FrameScene, SceneAction, ScenePropType, TRANSITION_SECONDS, heygenMissingConfig() (+24 more)

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
Cohesion: 0.16
Nodes (8): nextConfig, rootEnvPath, ref_node_child_process, ref_node_fs, ref_node_path, ref_node_process, args, root

### Community 12 - "next"
Cohesion: 0.16
Nodes (12): POST(), EXTENSIONS, DELETE(), PATCH(), RouteContext, CopilotTurn, requireSession(), apps_web_lib_supabase_server_createsupabaserouteclient (+4 more)

### Community 13 - "Los dos servicios se comunican solo por HTTP y no comparten codigo"
Cohesion: 0.50
Nodes (4): apps/render-worker, apps/web/app/api (rutas de API), Deuda: el render worker redeclara los tipos del dominio en vez de importar shared-types, Los dos servicios se comunican solo por HTTP y no comparten codigo

### Community 16 - "set-ai-key.mjs"
Cohesion: 0.14
Nodes (19): ref_node_readline, Cancelled, createSession(), question(), ENV_FILE, envFileIsIgnored(), lastLine(), main() (+11 more)

### Community 17 - "assistant.tsx"
Cohesion: 0.09
Nodes (36): Assistant(), beginListening(), maybeResumeListening(), onSpeechEnd(), say(), send(), speak(), speakWithBrowser() (+28 more)

### Community 18 - "video-persistence.ts"
Cohesion: 0.17
Nodes (22): canTransition(), globalStore, transitions, videos, DatabaseRow, findVideoRecord(), markStalledRenders(), nullableString() (+14 more)

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
Cohesion: 0.20
Nodes (11): ACTION_VERBS, aiVideoModel(), buildScenePrompt(), CHARACTER_SUBJECTS, extractVideoUrl(), FAL_KEY, falFetch(), generateSceneVideo() (+3 more)

### Community 25 - "video-workspace.tsx"
Cohesion: 0.13
Nodes (18): fetchSounds(), login(), saveScript(), VideoRecord, LoginForm(), handleSubmit(), Logo(), LogoMark() (+10 more)

### Community 26 - "heygen.ts"
Cohesion: 0.18
Nodes (15): API_KEY, AVATAR_ID, AvatarClip, AvatarScene, ENGINE, heygenError(), heygenFetch(), sleep() (+7 more)

### Community 27 - "batch/route.ts"
Cohesion: 0.18
Nodes (16): BatchFailure, BatchWarning, BatchWarningCause, buildWarning(), planScenes(), PLATFORMS, POST(), GET() (+8 more)

### Community 28 - "dev.mjs"
Cohesion: 0.33
Nodes (6): children, envFiles, loaded, repoRoot, shutdown(), start()

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
Cohesion: 0.05
Nodes (53): ACTIONS, buildRegenerateSystemPrompt(), CHARACTERS, coerceAction(), coerceCharacter(), coerceDescription(), coerceProp(), DELETE() (+45 more)

### Community 34 - "proxy.ts"
Cohesion: 0.17
Nodes (11): API_KEY, POST(), silent(), VOICE_ID, SIGN_IN_REQUIRED_ERROR, apps_web_lib_supabase_server, apps_web_lib_supabase_server_createsupabaseproxyclient, config (+3 more)

### Community 35 - "scenes/route.ts"
Cohesion: 0.19
Nodes (16): ACTIONS, buildScenesFromAiJson(), buildSentenceFallback(), buildSystemPrompt(), CHARACTERS, coerceAction(), coerceCharacter(), coerceDescription() (+8 more)

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

### Community 40 - "render"
Cohesion: 0.18
Nodes (13): createFrameCanvas(), applyLogoOverlayOrFallback(), getLogoOverlayPosition(), mixSoundsOrKeep(), nonEmptyUrl(), previewFrameScene(), render(), runFfmpeg() (+5 more)

### Community 57 - "voice.ts"
Cohesion: 0.05
Nodes (45): dependencies, dejavu-fonts-ttf, ffmpeg-static, fluent-ffmpeg, @napi-rs/canvas, sherpa-onnx, @supabase/supabase-js, tar-stream (+37 more)

### Community 58 - "getVideo"
Cohesion: 0.20
Nodes (13): POST(), RouteContext, BrandingPatchBody, LOGO_POSITIONS, PATCH(), RouteContext, MIME_CONTENT_TYPES, MIME_EXTENSIONS (+5 more)

### Community 59 - "video-list.tsx"
Cohesion: 0.14
Nodes (16): BatchCreateFailure, BatchCreateWarning, BatchWarningCause, createVideo(), createVideosBatch(), deleteVideo(), BatchSummary, CreateMode (+8 more)

### Community 60 - "video.ts"
Cohesion: 0.16
Nodes (21): StatusAction, PLATFORM_LABELS, PLATFORM_OPTIONS, STATUS_BADGE_CLASSES, STATUS_DOT_CLASSES, STATUS_LABELS, StatusBadge(), StatusPanelProps (+13 more)

### Community 61 - "api.ts"
Cohesion: 0.13
Nodes (21): BatchCreateResult, deleteScene(), fetchSession(), generateScenes(), generateVoice(), JSON_HEADERS, parseJsonSafe(), regenerateScene() (+13 more)

### Community 62 - "Desplegar y comprobar"
Cohesion: 0.22
Nodes (8): Antes de empujar, Comprobar producción, Desplegar y comprobar, El worker de Railway es aparte, Empujar, Esperar el despliegue, Qué reportar, Si tocaste `vercel.json`

### Community 63 - "tts/route.ts"
Cohesion: 0.31
Nodes (6): POST(), RouteContext, supabase, synthesizeSpeech(), updateScene(), @supabase/supabase-js

### Community 64 - "getSupabaseClient"
Cohesion: 0.17
Nodes (19): DELETE(), RouteContext, coerceBranding(), CreateBody, GET(), LOGO_POSITIONS, POST(), createBrandTemplate() (+11 more)

### Community 65 - "grafo-pendiente.mjs"
Cohesion: 0.22
Nodes (7): etiquetas, INDEXADAS, manifest, manifestPath, pendientes, raiz, total

### Community 66 - "plugin.json"
Cohesion: 0.25
Nodes (7): author, name, description, keywords, name, $schema, version

### Community 67 - "check-ai.mjs"
Cohesion: 0.29
Nodes (5): ref_node_url, MODELS, PROVIDERS, root, TOOL

### Community 68 - "render-worker-agent.md"
Cohesion: 0.40
Nodes (4): Antes de escribir algo nuevo, How it works, Rules, Style

### Community 69 - "frontend-agent.md"
Cohesion: 0.29
Nodes (6): Antes de escribir algo nuevo, Before you finish, Rules, Style, What is already there, Your files

### Community 70 - "graphify-agent.md"
Cohesion: 0.29
Nodes (6): Committing the output, Report, Running it, What to look for in GRAPH_REPORT.md, Whether a run is needed at all — measure it, do not guess, Your files

### Community 71 - "SceneRow"
Cohesion: 0.36
Nodes (9): SceneRow(), applyPatch(), handleActionChange(), handleCharacterChange(), handleDelete(), handleEffectChange(), handlePropChange(), handleRegenerate() (+1 more)

### Community 72 - "layout.tsx"
Cohesion: 0.22
Nodes (5): apps_web_app_globals, geistMono, geistSans, metadata, viewport

### Community 73 - "devops-agent.md"
Cohesion: 0.40
Nodes (4): Before you finish, Rules, What must keep working, Your files

### Community 74 - "qa-agent.md"
Cohesion: 0.40
Nodes (4): How to report, Rules, What to run, Your files

### Community 75 - "VideoStudio"
Cohesion: 0.25
Nodes (3): logout(), VideoStudio(), handleLogout()

### Community 88 - "cameraFor"
Cohesion: 0.47
Nodes (6): cameraFor(), clamp(), drawTransitionFrame(), easeInOut(), lerp(), poseFor()

### Community 89 - "duplicate/route.ts"
Cohesion: 0.50
Nodes (4): PLATFORMS, POST(), RouteContext, duplicateForPlatform()

### Community 90 - "StatusPanel"
Cohesion: 0.40
Nodes (5): duplicateVideo(), transitionStatus(), StatusPanel(), handleDuplicate(), runAction()

## Knowledge Gaps
- **399 isolated node(s):** `CopilotResult`, `CopilotState`, `ToolArgs`, `ToolExecutor`, `Resolved` (+394 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 468 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `getSupabaseClient`, `[sceneId]/route.ts`, `proxy.ts`, `scenes/route.ts`, `scripts`, `assistant.ts`, `layout.tsx`, `ref_node_fs`, `duplicate/route.ts`, `getVideo`, `batch/route.ts`, `video-workspace.tsx`, `tts/route.ts`?**
  _High betweenness centrality (0.123) - this node is a cross-community bridge._
- **Why does `@supabase/supabase-js` connect `tts/route.ts` to `voice.ts`, `index.ts`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `Platform` connect `video.ts` to `copilot.ts`, `index.ts`, `assistant.ts`, `video-list.tsx`, `video-persistence.ts`, `duplicate/route.ts`, `batch/route.ts`, `api.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `CopilotResult`, `CopilotState`, `ToolArgs` to the rest of the system?**
  _399 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `branding-panel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._
- **Should `sound-panel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10869565217391304 - nodes in this community are weakly interconnected._
- **Should `copilot.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0687719298245614 - nodes in this community are weakly interconnected._