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

El worker expone `GET /health`, `POST /render` y `GET /renders/<filename>`. Usa FFmpeg
para generar los MP4 y escucha en el puerto definido por `PORT` (8080 por defecto).
En produccion debe desplegarse como un servicio separado del frontend y con un
almacenamiento persistente para `apps/render-worker/renders`.

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

Configura en Vercel las mismas variables definidas en `apps/web/.env.local.example`. Usa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` para el cliente. `SUPABASE_SECRET_KEY` y cualquier service role key deben mantenerse solo en servidor y nunca exponerse como `NEXT_PUBLIC_*`.

### Vercel

En Vercel importa el repositorio usando la raiz del repositorio como **Root Directory**. El archivo `vercel.json` de la raiz instala el workspace y compila `apps/web`, incluyendo `packages/shared-types`.
Configura `RENDER_WORKER_URL` con la URL HTTPS publica del servicio del worker;
en produccion no se permite usar el valor local `http://localhost:8080`.

Tambien puedes enlazar y desplegar con CLI:

```bash
npx vercel login
npx vercel link
npx vercel --prod
```

El flujo actual usa almacenamiento demo en memoria para validar el producto sin claves. La persistencia real se activa al conectar las rutas a Supabase y configurar las variables de entorno.

### Validacion de despliegue

Antes de aprobar produccion:

1. Comprueba `GET <RENDER_WORKER_URL>/health` y verifica `{ "ok": true }`.
2. Ejecuta `npm run build` desde la raiz.
3. En Vercel, confirma que `RENDER_WORKER_URL` apunta al worker desplegado, no a `localhost`.
4. Crea un video, apruebalo y ejecuta el render; confirma que el MP4 servido por `/renders/` se reproduce.

El worker aun guarda los MP4 en el filesystem local. Para produccion multi-instancia,
migra esos archivos a Supabase Storage, S3, R2 u otro object storage persistente antes
de depender de los videos tras un redeploy.
