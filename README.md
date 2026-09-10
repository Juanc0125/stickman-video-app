# stickman-video-app

Aplicacion para generar videos cortos de marketing a partir de un tema:

`tema -> guion (LLM) -> escenas stickman -> voz (TTS) -> subtitulos -> video MP4`

El flujo incluye una aprobacion humana obligatoria antes de publicar, orientada a marketing financiero regulado en Australia.

## Estructura

- `apps/web`: frontend Next.js y API routes ligeras para Vercel.
- `apps/render-worker`: servidor Node.js separado para renderizado pesado con FFmpeg, preparado para Railway.
- `packages/shared-types`: tipos TypeScript compartidos.

## Requisitos

- Node.js 24 o compatible con la version estable de Next.js instalada.
- npm.
- Git.

## Desarrollo web

```bash
cd apps/web
cp .env.local.example .env.local
npm run dev
```

En PowerShell, el equivalente de la copia es `Copy-Item .env.local.example .env.local`.

Completa las variables de `.env.local` solo en tu entorno local. No subas secretos al repositorio.

## Render worker

```bash
cd apps/render-worker
npm run dev
```

El worker actualmente imprime `worker listo`. La integracion con FFmpeg se anadira en una etapa posterior.

## Estado de aprobacion

Los videos comparten estos estados: `borrador`, `pendiente_aprobacion`, `aprobado` y `publicado`.

## Integraciones y despliegue

### Git

El repositorio local ya esta inicializado. Para conectarlo a un repositorio remoto:

```bash
git remote add origin <URL_DEL_REPOSITORIO>
git add .
git commit -m "feat: initial video studio MVP"
git push -u origin master
```

### Supabase

El schema y la migracion inicial estan en `supabase/schema.sql` y `supabase/migrations/`. Tras instalar y autenticar Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref <SUPABASE_PROJECT_REF>
npx supabase db push
```

Configura en Vercel las mismas variables definidas en `apps/web/.env.local.example`. La service role key debe mantenerse solo en servidor y nunca exponerse como `NEXT_PUBLIC_*`.

### Vercel

En Vercel importa el repositorio y establece `apps/web` como **Root Directory**. El archivo `apps/web/vercel.json` ya define el framework y los comandos de instalacion/build.

Tambien puedes enlazar y desplegar con CLI:

```bash
cd apps/web
npx vercel login
npx vercel link
npx vercel --prod
```

El flujo actual usa almacenamiento demo en memoria para validar el producto sin claves. La persistencia real se activa al conectar las rutas a Supabase y configurar las variables de entorno.
