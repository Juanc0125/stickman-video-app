---
name: desplegar
description: Sube Stickman a producción y comprueba que siguió funcionando - push a master, espera el despliegue de Vercel, y verifica contra producción que la autenticación sigue cerrada, que la sonda de salud responde y que el worker de Railway vive. Úsala siempre que alguien pida desplegar, publicar, subir a producción, hacer push a master, "mándalo a prod", o preguntar si un cambio ya está arriba, en este repositorio. También cuando haga falta confirmar que el commit que está vivo en producción es el que se cree.
---

# Desplegar y comprobar

Un push a `master` dispara un despliegue de Vercel por sí solo. Lo que no se
hace solo es comprobar que lo desplegado sigue siendo correcto — y en marketing
financiero regulado, la puerta de autenticación es el único control que hay: si
un despliegue la abre, cualquiera lee los borradores del cliente.

## Antes de empujar

**La puerta de calidad va primero.** Corre la skill `verificar` — o confirma que
alguien acaba de correrla sobre exactamente este estado del repositorio. Un
push sin `npm run verify` ni suite end-to-end no es un despliegue, es una
apuesta.

Comprueba también que el árbol esté limpio y que el grafo no haya quedado
desactualizado con documentos o imágenes pendientes:

```
git status --short
node .claude/skills/verificar/scripts/grafo-pendiente.mjs
```

## Empujar

```
git log --oneline origin/master..HEAD    # qué vas a subir, míralo antes
git push origin master
```

Guarda el sha del commit que quedó arriba: lo vas a necesitar para saber si lo
que verificaste es lo que se desplegó.

## Esperar el despliegue

Vercel tarda del orden de medio minuto a un par de minutos. No des por hecho
que terminó porque la URL responde: la URL responde con el despliegue
**anterior** hasta que el nuevo esté listo.

La forma fiable es preguntar por el despliegue y comparar el sha:

```
vercel list project-bftvz --scope juanc0125s-projects
```

Con el MCP de Vercel, `list_deployments` sobre el proyecto devuelve
`meta.githubCommitSha` y `state`. Busca `state: READY` y que el sha sea el tuyo.
Eso es lo que distingue "la app responde" de "mi cambio está vivo".

## Comprobar producción

Cuatro comprobaciones, y las cuatro importan:

```
curl -s -o /dev/null -w "%{http_code}\n" https://project-bftvz.vercel.app/
curl -s -o /dev/null -w "%{http_code}\n" https://project-bftvz.vercel.app/api/videos
curl -s https://project-bftvz.vercel.app/api/health
curl -s https://stickman-video-app-production.up.railway.app/health
```

Lo que debe salir:

| Comprobación | Esperado | Por qué importa |
|---|---|---|
| `/` sin sesión | **307** a `/login` | la puerta sigue cerrada |
| `/api/videos` sin sesión | **401** | la API no quedó abierta |
| `/api/health` | **200** `{"ok":true,"db":"ok"}` | la base responde de verdad |
| worker `/health` | `ok:true`, `render_auth: configurado` | el render vive y está protegido |

Un 200 en `/api/videos` es una fuga de datos del cliente, no un detalle.

`/api/health` es la única ruta pública de la API, a propósito: el cron que evita
que Supabase se pause no tiene sesión. Devuelve 503 si la base no contesta.

## Si tocaste `vercel.json`

Que el archivo esté commiteado no significa que Vercel lo haya aplicado.
Confírmalo del lado de Vercel:

```
vercel crons ls --project project-bftvz --scope juanc0125s-projects
```

**Pasa `--project` y `--scope` explícitamente en vez de correr `vercel link`.**
Esa CLI es la principal sospechosa de añadirle `.vercel` y `.env*` al
`.gitignore` sin que nadie lo pida, y `crons ls` con los dos parámetros no lo
reproduce.

Los crons de Vercel **solo corren en despliegues de producción**, nunca en
previews. Para probar uno sin esperar a su horario: `vercel crons run`.

## El worker de Railway es aparte

Railway no se despliega con el push a `master`. Si el cambio toca
`apps/render-worker/**`, ese servicio necesita su propio despliegue, y el worker
corre con `tsx` sin watch: hasta que no reinicie, sigue ejecutando el código
viejo aunque el repositorio ya tenga el nuevo.

Cuidado con lo que vive solo en Railway: `FAL_KEY` no está puesta ahí a
propósito, porque encenderla hace que cada render cueste dólares. Un despliegue
no debería cambiar eso por accidente.

## Qué reportar

El sha que quedó vivo en producción, y el resultado de las cuatro
comprobaciones. Si alguna no da lo esperado, dilo con el código que salió en vez
de redondear a "todo bien" — y si la que falló es la de 401, trátalo como
urgente.
