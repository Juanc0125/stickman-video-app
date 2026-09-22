# Graph Report - stickman-video-app  (2026-09-21)

## Corpus Check
- Corpus is ~24,363 words - fits in a single context window. You may not need a graph.

## Summary
- 501 nodes · 859 edges · 40 communities (29 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Rutas de API del video
- Dependencias de la web
- Motor de dibujo 2D
- Dependencias del worker
- Documentacion y marca
- Generacion de escenas con IA
- Almacen en memoria
- Adaptador de video IA
- Scripts del monorepo
- TypeScript de la web
- Regeneracion de escena
- Sintesis de voz
- Constantes y estados
- Configuracion de Next
- TypeScript del worker
- Prompts de escena IA
- Cliente API: guion
- Cliente API: marca
- Layout y PWA
- Pipeline de render
- Estudio de video (raiz UI)
- Panel de edicion de escenas
- Esquema inicial (SQL)
- Esquema Supabase declarado
- Cliente API: CRUD video
- Cliente API: estado y duplicado
- Despliegue Vercel (web)
- Despliegue Vercel (raiz)
- Iconos por defecto de Next
- PostCSS
- Migracion propiedades (obsoleta)
- Tabla scenes
- video_sources: tabla videos
- campos de escena: tabla videos
- render_jobs: tabla videos

## God Nodes (most connected - your core abstractions)
1. `getSupabaseClient()` - 18 edges
2. `render()` - 16 edges
3. `compilerOptions` - 16 edges
4. `VideoRecord` - 15 edges
5. `toVideoRecord()` - 14 edges
6. `getVideo()` - 14 edges
7. `PATCH()` - 13 edges
8. `generateAiText()` - 11 edges
9. `scripts` - 11 edges
10. `drawSceneFrame()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `npm run verify (lint + typecheck + build)` --semantically_similar_to--> `Pre-Production Validation Checklist`  [INFERRED] [semantically similar]
  .github/workflows/verify.yml → README.md
- `Stickman PWA Icon 512` --conceptually_related_to--> `Stickman Video App`  [INFERRED]
  apps/web/public/icons/icon-512.png → README.md
- `create-next-app Boilerplate README` --semantically_similar_to--> `Stickman Video App`  [INFERRED] [semantically similar]
  apps/web/README.md → README.md
- `Stickman PWA Icon 512` --conceptually_related_to--> `Topic-to-MP4 Generation Pipeline`  [INFERRED]
  apps/web/public/icons/icon-512.png → README.md
- `Next.js Agent Rules Block` --references--> `apps/web (Next.js Frontend + API Routes)`  [INFERRED]
  apps/web/AGENTS.md → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Optional Supabase Backend with Graceful Degradation** — readme_in_memory_fallback, readme_properties_catalog, readme_supabase_storage_upload, readme_supabase_key_separation, readme_demo_user_password [EXTRACTED 1.00]
- **Unreplaced create-next-app Scaffolding (README + public SVGs)** — apps_web_readme_create_next_app_boilerplate, apps_web_public_file_file_icon, apps_web_public_globe_globe_icon, apps_web_public_next_next_wordmark, apps_web_public_vercel_vercel_logo, apps_web_public_window_window_icon [INFERRED 0.85]
- **Stickman PWA Icon Set (192 / 512 / maskable / apple-touch)** — apps_web_public_icons_icon_192_stickman_icon, apps_web_public_icons_icon_512_stickman_icon, apps_web_public_icons_icon_maskable_512_stickman_icon, apps_web_public_icons_apple_touch_icon_stickman_icon [INFERRED 0.95]

## Communities (40 total, 11 thin omitted)

### Community 0 - "Rutas de API del video"
Cohesion: 0.07
Nodes (54): BrandingPatchBody, LOGO_POSITIONS, PATCH(), RouteContext, PLATFORMS, POST(), RouteContext, MIME_CONTENT_TYPES (+46 more)

### Community 1 - "Dependencias de la web"
Cohesion: 0.05
Nodes (38): eslintConfig, dependencies, next, react, react-dom, @supabase/supabase-js, devDependencies, autoprefixer (+30 more)

### Community 2 - "Motor de dibujo 2D"
Cohesion: 0.11
Nodes (30): CharacterType, drawBackground(), drawFigure(), drawHead(), drawProp(), drawSceneFrame(), drawShadow(), easeInOut() (+22 more)

### Community 3 - "Dependencias del worker"
Cohesion: 0.06
Nodes (30): dependencies, dejavu-fonts-ttf, ffmpeg-static, fluent-ffmpeg, @napi-rs/canvas, sherpa-onnx, @supabase/supabase-js, tar-stream (+22 more)

### Community 4 - "Documentacion y marca"
Cohesion: 0.10
Nodes (29): npm run verify (lint + typecheck + build), Verify CI Workflow, Next.js Agent Rules Block, apps/web CLAUDE.md (AGENTS.md import), Stickman Apple Touch Icon, Stickman PWA Icon 192, Stickman PWA Icon 512, Stickman Maskable Icon 512 (+21 more)

### Community 5 - "Generacion de escenas con IA"
Cohesion: 0.14
Nodes (23): ACTIONS, buildScenesFromAiJson(), buildSentenceFallback(), buildSystemPrompt(), CHARACTERS, coerceAction(), coerceCharacter(), coerceDescription() (+15 more)

### Community 6 - "Almacen en memoria"
Cohesion: 0.17
Nodes (21): globalStore, transitions, VideoRecord, BrandingPatch, generateScenes(), generateVoice(), JSON_HEADERS, parseJsonSafe() (+13 more)

### Community 7 - "Adaptador de video IA"
Cohesion: 0.10
Nodes (23): aiVideoModel(), isAiVideoEnabled(), Branding, CharacterType, DEFAULT_BRANDING, ENCODER_THREADS, LogoPosition, Platform (+15 more)

### Community 8 - "Scripts del monorepo"
Cohesion: 0.09
Nodes (22): dependencies, next, react, react-dom, next, react, react-dom, name (+14 more)

### Community 9 - "TypeScript de la web"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "Regeneracion de escena"
Cohesion: 0.21
Nodes (16): ACTIONS, buildRegenerateSystemPrompt(), CHARACTERS, coerceAction(), coerceCharacter(), coerceDescription(), coerceProp(), extractJson() (+8 more)

### Community 11 - "Sintesis de voz"
Cohesion: 0.16
Nodes (13): unbzip2-stream, downloadModel(), ensureVoiceModel(), exists(), getTts(), mouthEnvelope(), speak(), SPEAKING_RATE (+5 more)

### Community 12 - "Constantes y estados"
Cohesion: 0.28
Nodes (10): StatusAction, ACTION_OPTIONS, CHARACTER_OPTIONS, PLATFORM_LABELS, PLATFORM_OPTIONS, PROP_OPTIONS, STATUS_BADGE_CLASSES, STATUS_LABELS (+2 more)

### Community 13 - "Configuracion de Next"
Cohesion: 0.15
Nodes (13): nextConfig, rootEnvPath, ref_node_child_process, ref_node_fs, ref_node_path, ref_node_process, ref_node_url, children (+5 more)

### Community 14 - "TypeScript del worker"
Cohesion: 0.18
Nodes (10): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, module, moduleResolution, outDir, skipLibCheck, strict (+2 more)

### Community 15 - "Prompts de escena IA"
Cohesion: 0.24
Nodes (9): ACTION_VERBS, buildScenePrompt(), CHARACTER_SUBJECTS, extractVideoUrl(), FAL_KEY, falFetch(), generateSceneVideo(), PROP_SCENERY (+1 more)

### Community 16 - "Cliente API: guion"
Cohesion: 0.27
Nodes (9): saveScript(), VideoRecord, ScenePanelProps, ScriptPanel(), handleSave(), ScriptPanelProps, StatusPanelProps, VideoListProps (+1 more)

### Community 17 - "Cliente API: marca"
Cohesion: 0.31
Nodes (9): updateBranding(), uploadLogo(), BrandingPanel(), handleLogoChange(), handleSaveBranding(), BrandingPanelProps, readFileAsDataUrl(), FONT_OPTIONS (+1 more)

### Community 18 - "Layout y PWA"
Cohesion: 0.22
Nodes (7): ServiceWorker(), apps_web_app_globals, geistMono, geistSans, metadata, viewport, ref_react

### Community 19 - "Pipeline de render"
Cohesion: 0.25
Nodes (9): createFrameCanvas(), applyLogoOverlayOrFallback(), getLogoOverlayPosition(), render(), runFfmpeg(), runFfmpegWithFrames(), toCssHexColor(), uploadToSupabase() (+1 more)

### Community 20 - "Estudio de video (raiz UI)"
Cohesion: 0.28
Nodes (3): fetchVideos(), VideoStudio(), VideoWorkspace()

### Community 21 - "Panel de edicion de escenas"
Cohesion: 0.39
Nodes (9): regenerateScene(), updateScene(), SceneRow(), applyPatch(), handleActionChange(), handleCharacterChange(), handlePropChange(), handleRegenerate() (+1 more)

### Community 22 - "Esquema inicial (SQL)"
Cohesion: 0.53
Nodes (5): public.scenes, public.videos, scenes_video_id_order_idx, auth.users, videos_user_id_created_at_idx

### Community 23 - "Esquema Supabase declarado"
Cohesion: 0.53
Nodes (5): public.scenes, public.videos, scenes_video_id_order_idx, auth.users, videos_user_id_created_at_idx

### Community 24 - "Cliente API: CRUD video"
Cohesion: 0.60
Nodes (5): createVideo(), deleteVideo(), VideoList(), handleDelete(), handleSubmit()

### Community 25 - "Cliente API: estado y duplicado"
Cohesion: 0.60
Nodes (5): duplicateVideo(), transitionStatus(), StatusPanel(), handleDuplicate(), runAction()

### Community 26 - "Despliegue Vercel (web)"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 27 - "Despliegue Vercel (raiz)"
Cohesion: 0.50
Nodes (3): buildCommand, framework, installCommand

### Community 28 - "Iconos por defecto de Next"
Cohesion: 0.67
Nodes (3): File Glyph Icon (SVG), Globe Glyph Icon (SVG), Browser Window Glyph Icon (SVG)

## Knowledge Gaps
- **199 isolated node(s):** `FAL_KEY`, `TIMEOUT_MS`, `CHARACTER_SUBJECTS`, `ACTION_VERBS`, `PROP_SCENERY` (+194 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 225 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ffmpeg-static` connect `Dependencias del worker` to `Adaptador de video IA`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `Platform` connect `Rutas de API del video` to `Constantes y estados`, `Almacen en memoria`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Scene` connect `Almacen en memoria` to `Rutas de API del video`, `Regeneracion de escena`, `Generacion de escenas con IA`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `FAL_KEY`, `TIMEOUT_MS`, `CHARACTER_SUBJECTS` to the rest of the system?**
  _199 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rutas de API del video` be split into smaller, more focused modules?**
  _Cohesion score 0.07115384615384615 - nodes in this community are weakly interconnected._
- **Should `Dependencias de la web` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Motor de dibujo 2D` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._