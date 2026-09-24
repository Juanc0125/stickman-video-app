# Stickman — instrucciones para el agente líder

Herramienta interna de un negocio de crédito hipotecario: convierte un tema en un video vertical corto (guion → escenas → narración → MP4). Monorepo de npm workspaces: `apps/web` (Next.js 16, Vercel), `apps/render-worker` (Node/TS, Railway), `packages/shared-types`.

Trabaja en español con el usuario. El código y los comentarios van en inglés; todo lo que lee una persona en pantalla, en español.

## Cómo repartir el trabajo

Ante un pedido nuevo, identifica a qué dominio pertenece y delega con la herramienta Task:

| Dominio | Agente | Dueño de |
|---|---|---|
| API, persistencia, guion/escenas, TTS, branding, proveedor de IA, copiloto | `backend-agent` | `apps/web/app/api/**`, `apps/web/lib/**`, `packages/shared-types/**` |
| Interfaz, formulario, escenas editables, marca, preview, panel del copiloto | `frontend-agent` | `apps/web/app/components/**`, `layout.tsx`, `page.tsx`, `globals.css` |
| ffmpeg, personajes, voz, subtítulos, MP4 | `render-worker-agent` | `apps/render-worker/**` |
| Build, CI, Vercel/Railway, variables de entorno, MCP | `devops-agent` | `package.json`, `.github/workflows/**`, `vercel.json`, `.mcp.json` |
| Build completo, suite end-to-end, navegador real | `qa-agent` | `scripts/e2e.mjs` y las pruebas |
| Grafo de conocimiento y deriva estructural | `graphify-agent` | `graphify-out/**` |

Reglas:

- **Un solo dominio** → delega directo a ese agente.
- **Varios dominios sin dependencias** → lánzalos **en paralelo, en una sola tanda** (varias llamadas a Task en el mismo mensaje).
- **Con dependencias** → en orden, y pásale a cada agente **solo su parte**, no el pedido completo. El caso típico: backend define el endpoint y el contrato, frontend lo consume. Si necesitas paralelizarlos igual, fija tú el contrato por escrito y dáselo a los dos.
- Los alcances de archivos **no se solapan a propósito**. Dos agentes editando el mismo archivo a la vez se pisan. Si un pedido obliga a cruzar la frontera, parte el trabajo, no el archivo.
- Un subagente arranca sin contexto: dale los hechos que necesita (rutas, contratos, restricciones), no un resumen de la conversación.

## Antes de cada commit a master

1. **`qa-agent`** corre `npm run verify` y la suite end-to-end. Si falla, **no hay push**: corrige y vuelve a llamarlo.
2. **`graphify-agent`** actualiza el grafo, después del visto bueno de QA y antes del push, cuando la tanda movió, creó o borró archivos. Cambios triviales no lo justifican.
3. Un commit por agente o módulo, nunca uno gigante.

## Al cerrar cada tanda

Dale al usuario un resumen corto: qué hizo cada agente, y **toda decisión de diseño que alguno haya tomado sin que estuviera especificada**, para que él la revise. Si `graphify-agent` reportó algo raro (un nodo god nuevo, acoplamiento fuera de lo esperado), va en ese resumen.

## Reglas del proyecto que ningún agente puede saltarse

- **RF-012: la aprobación es humana.** Nada aprueba, publica ni renderiza solo. El copiloto prepara; la persona aprueba con un botón. Es marketing financiero regulado y esa puerta es el único control que hay.
- **Nada de asesoría financiera personalizada**, ni tasas inventadas, ni entidades con nombre.
- **Ninguna clave en un archivo versionado.** Van en `.env.local` (ignorado por git) o en el panel de Vercel/Railway. En el repo solo va el *nombre* de la variable que falta.
- **No inventes funcionalidad fuera de la tabla de requerimientos del cliente** (`Tabla_de_Requerimientos.xlsx`, en el Escritorio del usuario).
- **Las migraciones son append-only.** Nunca reescribas ni borres una ya aplicada.

## Trampas de esta máquina que cuestan tiempo

- `npm run verify` falla con `EPERM` mientras el servidor de desarrollo tiene tomado `apps/web/.next`, y OneDrive sincronizando la carpeta puede tomarlo igual. Detén el servidor, borra `apps/web/.next`, reintenta. **EPERM no es un error de código.**
- `npm run dev` levanta web (3000) y worker (8080) juntos. También está la configuración de arranque *Stickman* de Warp.
- El worker corre con `tsx` sin watch: un cambio en su código exige reiniciarlo.
- `npm run check:ai` dice qué proveedor de lenguaje responde de verdad, y si además sabe usar herramientas. Hoy responde Groq; la clave vieja de OpenAI está sin saldo. El plan gratuito de Groq da ~7.000 tokens por minuto y cada turno del copiloto cuesta ~2.000, así que a la tercera o cuarta pregunta seguida se satura y cae al modo básico por palabras clave, **avisándolo en pantalla**. `npm run set:ai-key -- <proveedor>` instala una clave nueva sin que pase por pantalla ni por el chat.
- El render worker redeclara los tipos del dominio en vez de importar `@shared-types`. Hoy coinciden; el día que uno cambie, dibujará algo distinto de lo guardado sin error de compilación.

## El grafo de conocimiento: consultarlo antes de escribir

El repo tiene un grafo en `graphify-out/` con 770 nodos y 1507 aristas: quien llama a quien, que vive en cada modulo y que se parece a que. Esta versionado para que no haya que reconstruirlo.

**Existe para que no se construya dos veces lo mismo.** Antes de crear una funcion, un helper o un endpoint, pregunta si ya existe:

```
npm run graph -- query "donde se valida el personaje de una escena?"
npm run graph -- path "copilot" "video-persistence"
npm run graph -- explain "generateWithFallback"
```

Devuelven un subgrafo acotado, casi siempre mas pequeno que un `grep` y bastante mas util: `grep` encuentra el nombre, el grafo encuentra la relacion. Este proyecto ya tuvo esa duplicacion — el worker redeclarando los tipos del dominio — y costo caro.

`npm run graph -- ...` resuelve donde esta instalado graphify; **no esta en el PATH**, asi que un `graphify` pelado falla.

Una advertencia al consultarlo: el codigo esta en ingles y la documentacion en espanol, asi que una pregunta en espanol trae sobre todo nodos de documentacion. Para buscar codigo, pregunta con el vocabulario del codigo (`coerceCharacter`, `updateBranding`, `drawSceneFrame`).

Se mantiene solo: un enganche de post-commit reconstruye el grafo con cada commit (solo AST, sin costo de modelo). Los documentos y las imagenes no los cubre el enganche; para esos, `graphify-agent` hace una corrida completa. `GRAPH_REPORT.md` se lee cuando hace falta la vista de arquitectura, no para una pregunta puntual.
