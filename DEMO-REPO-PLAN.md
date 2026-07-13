# Plan: repo demo de jsonresume-tools

Borrador de qué debería ser el repo demo/ejemplo público que muestra un setup real usando
`jsonresume-tools` (+ `resume-cli`), pensado para adopción — no para producción interna.
Basado en dos fuentes:

- El repo real del CV del usuario (`/home/cdrobayna/Workspace/personal/cv`) — el mejor ejemplo
  de uso real que existe hoy, con datos reales.
- `docs/examples/` en este repo — ya contiene un CV falso completo (persona "Camila Duarte")
  usado por el tutorial `full-workflow.md` y por la landing page.

## Objetivo

Un repo público, clonable/usable como template, que responda "¿cómo se ve mi propio repo si
adopto esto?" — algo que hoy ningún doc responde del todo, porque el ejemplo vive enterrado
dentro del propio repo de herramientas. Sirve dos audiencias:

1. Alguien evaluando las herramientas (adopción) — quiere ver un repo real, no un snippet.
2. Alguien que ya decidió usarlas — quiere un punto de partida para copiar/clonar.

## Nombre del repo

| Opción | A favor | En contra |
|---|---|---|
| **`jsonresume-tools-example`** (recomendado) | Se entiende sin contexto, aparece en búsquedas de "jsonresume-tools example", sigue la convención de nombres `<paquete>-<algo>` que ya usa el monorepo | Un poco largo |
| `jsonresume-tools-demo` | Igual de claro, "demo" suena más a showcase que a punto de partida | Si termina siendo el template repo (ver más abajo), "demo" undersella el uso como starter |
| `jrx-starter` | Corto, y `jrx` ya es el CLI que orquesta todo | Sobre-indexa en `execute`, cuando el mensaje de posicionamiento del landing es parity/tailor primero, lint al final — este nombre no menciona ninguno de los dos |
| `cv-example` / `sample-cv` | Muy legible | Nombre genérico, difícil de encontrar, puede chocar con otros repos de "sample cv" no relacionados |

Mi sugerencia: **`jsonresume-tools-example`**, bajo el mismo usuario/org (`cdrobayna` o el que uses
para publicar). Si en el futuro este mismo repo también sirve como setup mínimo instalable (ver
la conversación anterior sobre el "npx starter"), el nombre igual funciona — no hace falta un
segundo repo.

## Relación con este repo y con `docs/examples/`

**Decisión clave: promover, no duplicar.** `docs/examples/` ya tiene exactamente lo que un demo
repo necesita: `resume.en.json` / `resume.es.json` con la persona falsa "Camila Duarte"
(NimbusPay, Vantage Cloud, Solstice Retail, Aurora Systems) y dos variantes (`backend`,
`platform`). La landing page y el tutorial ya citan esta misma historia ("Solstice Retail",
checkout service, blue-green deploys).

En vez de inventar una persona nueva, el demo repo debería **empezar copiando estos archivos
tal cual** y armar alrededor la estructura de proyecto real que hoy falta (package.json, CI,
README). Esto evita tener dos historias de ejemplo distintas flotando (una en docs, otra en el
repo demo) que puedan divergir.

Una vez exista el repo demo, `full-workflow.md` y la landing page deberían enlazar a él como
"cloná esto y seguí" en vez de (o además de) narrar sobre `docs/examples/` in-repo. Si el
contenido de `docs/examples/` termina siendo un espejo del repo demo, hay que decidir cuál es la
fuente de verdad — ver "Decisiones pendientes" abajo.

## Estructura propuesta

Inspirada directamente en `/cv`, pero simplificada y genericizada:

```
jsonresume-tools-example/
├── README.md                  # la puerta de entrada — ver contenido abajo
├── package.json                # deps publicadas (NO link:../jsonresume-tools/...)
├── resume.en.json               # = docs/examples/resume.en.json (Camila Duarte)
├── resume.es.json               # = docs/examples/resume.es.json
├── variants/
│   ├── en/
│   │   ├── backend.json
│   │   └── platform.json
│   └── es/
│       ├── backend.json
│       └── platform.json
├── .github/
│   └── workflows/
│       └── check.yml           # NUEVO respecto al repo real — ver abajo
├── .gitignore                   # dist/, node_modules/, .direnv/
└── LICENSE                      # MIT, igual que jsonresume-tools
```

Puntos donde me aparto deliberadamente de `/cv` (con la razón):

- **Sin `patches/` ni tema con patch.** `/cv` usa `jsonresume-theme-operations-precision`
  parcheado a mano (`patches/*.patch`). Para un repo copiable con un solo comando, eso es
  fricción que no vale la pena mostrar. Recomiendo usar un tema público sin parchear —
  `jsonresume-theme-elegant` (que `/cv` ya tiene como dependencia secundaria) es la opción obvia
  porque no requiere nada especial para funcionar.
- **Sin `docs/research/summary-best-practices.md` ni la sección de "highlight writing style" de
  `AGENTS.md`.** Eso es contenido sobre cómo redactar un CV real, no sobre cómo usar las
  herramientas — no aporta a la historia de adopción.
- **`package.json` con dependencias publicadas de npm**, no `link:../jsonresume-tools/...` (ese
  link es un truco de monorepo para dogfooding local, no algo que un usuario real haría).
- **Agrego CI (`.github/workflows/check.yml`) corriendo `jrx check` en cada push/PR** — esto es
  algo que `/cv` hoy *no* tiene, pero es exactamente el tipo de "best practice" que vale la pena
  mostrar en un demo: "cada push valida que las variantes y los locales no se desincronizaron".
  Es un buen gancho de marketing (automatización real, no solo un CLI) y cuesta poco.
- **`dist/` no se commitea.** En `/cv` es local y gitignored. Para el demo, en vez de comitear
  PDFs generados, mejor mostrar el resultado en el README (una captura o un GIF corto de
  `npx jrx all` corriendo) y dejar que quien clona genere su propio `dist/`.

`package.json` scripts — calcados de los de `/cv` (ya están probados en producción):

```json
{
  "scripts": {
    "doctor": "jrx doctor",
    "lint": "jsonresume-lint resume.en.json resume.es.json",
    "parity": "jsonresume-parity resume.en.json resume.es.json",
    "check": "jrx check --theme elegant --verbose",
    "tailor:build": "jrx build --verbose",
    "build": "jrx all --theme elegant --format pdf --verbose"
  }
}
```

## Contenido del README

En orden, siguiendo la prioridad de mensaje ya establecida (parity/tailor primero, lint al
final):

1. Una línea: "Esto es un CV falso pero completo, mostrando un setup real de
   `jsonresume-tools` — cloná esto como punto de partida."
2. `npx jrx doctor` → `npx jrx all` en 2 comandos, resultado esperado.
3. Qué resuelve cada pieza en este repo concreto: parity mantiene `resume.en.json`/`resume.es.json`
   sincronizados, tailor genera `backend.*.json`/`platform.*.json` desde el master anotado, lint
   valida cada archivo, `jrx` orquesta todo + `resume-cli`.
2. Link a `jsonresume-tools` (el repo de las herramientas) y a la doc site.
3. Nota de "usá este repo como template" (botón "Use this template" de GitHub) si se marca como
   tal — ver decisión pendiente.

## Decisiones

1. ~~¿2 variantes o subo a 3?~~ **Resuelto: 2 variantes** (`backend`/`platform`, las que ya
   existen en `docs/examples/variants/`). No se inventa un tercer rol.
2. **¿Bajo qué usuario/org de GitHub se publica?** (`cdrobayna` personal, o algo separado tipo
   una org `jsonresume-tools`).
3. **¿Este mismo repo se marca como GitHub Template repo** (botón "Use this template") para
   cubrir también el caso de "setup mínimo en un comando", o preferís mantenerlo puramente como
   demo/showcase y dejar la idea del starter para más adelante?
4. **`docs/examples/` — pendiente, se retoma más adelante con más profundidad** (si queda como
   está, se sincroniza con el repo demo, o se elimina y el tutorial apunta directo al repo demo;
   afecta si `docs:prepare` necesita tocarse).
5. **¿Versión pin o rango de las deps del demo?** (`^x.y.z` sigue actualizándose solo vs. pin
   exacto que hay que bumpear a mano pero nunca se rompe con un release nuevo de las herramientas
   mismas).

## Próximos pasos (no implementado todavía)

Este documento es solo el plan — nada de esto está creado aún. Una vez resueltas las decisiones
de arriba, el trabajo es: crear el repo, copiar `docs/examples/*` como semilla, armar
`package.json`/CI/README, probar `npx jrx doctor` y `npx jrx all` de punta a punta con
dependencias reales de npm (no `link:`), y decidir el enlace desde `full-workflow.md` /
landing page.
