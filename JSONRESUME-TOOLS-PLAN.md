# jsonresume-tools — Plan de extracción

Documento de trabajo para extraer `scripts/validate.js` de este repo (cdrobayna) como un monorepo de dos paquetes npm públicos.

Sesión de diseño: 2026-07-06. Memoria engram: `topic_key: architecture/jsonresume-tools`.

---

## 1. Contexto y motivación

Este repo (cdrobayna) mantiene un CV en JSON Resume bilingüe (EN + ES) más utilidades de build. La utilidad más diferencial es `scripts/validate.js` — un validador que asegura paridad estructural, campos identity idénticos, calidad de traducción, formatos de fecha, cronología inversa, URLs y emails.

**Análisis del ecosistema (2026-07-06)**: ningún paquete del ecosistema JSON Resume (resumed, hackmyresume, resume-cli, rendercv) cubre paridad multi-locale. Es un hueco genuino.

**Objetivo**: liberar el validador como paquete reutilizable sin arrastrar el resto del toolkit personal (build cartesiano, previews de temas, Nix, GH Pages) que sí es específico de este repo.

---

## 2. División en dos paquetes

Se reparten las reglas actuales así:

| Regla en `validate.js` | Paquete |
|---|---|
| walkParallel (tipos, keys, array lengths) | **parity** |
| MUST_BE_IDENTICAL en identity fields | **parity** |
| MUST_BE_IDENTICAL_ARRAY (keywords, tags) | **parity** |
| LENGTH_RATIO, IDENTICAL_TRANSLATION, EMPTY_ONE_SIDE | **parity** |
| META_LANGUAGE (filename ↔ meta.language) | **parity** |
| PLACEHOLDER (TODO/FIXME/TBD) | **lint** (es per-string, no depende del par) |
| DATE_FORMAT, DATE_ORDER | **lint** |
| CHRONOLOGY (reverse order) | **lint** |
| URL_INVALID, EMAIL_INVALID | **lint** |
| SCHEMA (JSON Resume schema) | **lint** (opt-in con `schema: 'off'` default) |

---

## 3. Naming

- Monorepo (repo GitHub): **`jsonresume-tools`**
- Paquetes npm publicados **sin scope**:
  - `jsonresume-parity`
  - `jsonresume-lint`
- Paquete interno **no publicado**: `core` (private, workspace-only)

Racionale: prefijo `jsonresume-*` para discoverability en `npm search`. Sin scope maximiza descubrimiento; el riesgo de squatting se mitiga publicando temprano.

---

## 4. Layout del monorepo

```
jsonresume-tools/
├── package.json                       (workspaces, private)
├── tsconfig.base.json
├── vitest.config.ts
├── .changeset/
├── .github/workflows/ci.yml
├── packages/
│   ├── core/                          @jsonresume-tools/core (private)
│   │   ├── package.json
│   │   └── src/
│   │       ├── findings.ts            Finding, Result, Severity
│   │       ├── reporter.ts            text + json output
│   │       ├── severity.ts            aplica off|warn|error
│   │       ├── config.ts              cosmiconfig wrapper
│   │       └── cli.ts                 parseArgs, exit codes, --format
│   ├── parity/                        jsonresume-parity (publicado)
│   │   ├── package.json               bin: jsonresume-parity
│   │   └── src/
│   │       ├── index.ts               checkParity(), defaults
│   │       ├── walk.ts                walkParallel + checkLeaf
│   │       ├── rules/                 una regla por archivo
│   │       └── bin.ts
│   └── lint/                          jsonresume-lint (publicado)
│       ├── package.json               bin: jsonresume-lint
│       └── src/
│           ├── index.ts               lint(), defaults
│           ├── rules/
│           │   ├── date-format.ts
│           │   ├── date-order.ts
│           │   ├── chronology.ts
│           │   ├── url.ts
│           │   ├── email.ts
│           │   ├── placeholder.ts
│           │   └── schema.ts          opt-in, importa resume-schema + ajv
│           └── bin.ts
├── fixtures/                          JSON buenos/malos, compartidos por tests
└── README.md
```

---

## 5. Grafo de dependencias

- `core` → `cosmiconfig`
- `parity` → `@jsonresume-tools/core` (workspace)
- `lint` → `@jsonresume-tools/core` (workspace) + `resume-schema` + `ajv` (bundled)

**Fuera deliberadamente**: `resumed`. Su `validate()` es un wrapper delgado sobre AJV + resume-schema, replicable en ~20 líneas. Acoplarse a `resumed` reduce audiencia (users de hackmyresume/resume-cli/handcrafted quedan fuera) sin aportar nada.

---

## 6. API programática

### `jsonresume-parity`

```ts
import { checkParity, defaults } from 'jsonresume-parity'

// Con paths (lee del disco)
const result = await checkParity({
  locales: [
    { locale: 'en', path: 'resume.en.json' },   // primer arg = baseline
    { locale: 'es', path: 'resume.es.json' },
    { locale: 'fr', path: 'resume.fr.json' }
  ],
  rules: {
    typeMismatch: 'error',
    keyOnlyBaseline: 'error',
    keyOnlyLocale: 'error',
    mustBeIdentical: 'error',
    metaLanguage: 'error',
    lengthRatio: 'warn',
    identicalTranslation: 'warn',
    emptyOneSide: 'warn'
  },
  lengthRatio: { default: 2.5, 'en:ja': 0.7 },
  identityFields: [...defaults.identityFields, 'customField'],
  properNounFields: defaults.properNounFields
})

// Con objetos ya parseados (para tests o pipelines custom)
await checkParity({
  locales: [
    { locale: 'en', data: resumeEnObject },
    { locale: 'es', data: resumeEsObject }
  ]
})
```

### `jsonresume-lint`

```ts
import { lint } from 'jsonresume-lint'

const result = await lint({
  path: 'resume.en.json',
  rules: {
    dateFormat: 'error',
    dateOrder: 'error',
    url: 'error',
    email: 'error',
    chronology: 'warn',
    placeholder: 'warn',
    schema: 'off'   // opt-in explícito
  }
})

// O con data en memoria
await lint({ data: resumeObject, rules: {...} })
```

### Forma del Result (compartida)

```ts
type Severity = 'off' | 'warn' | 'error'

type Finding = {
  code: string          // SCREAMING_SNAKE, ej: MUST_BE_IDENTICAL
  path: string          // JSON pointer-ish, ej: $.work[0].url
  message: string
  extra?: unknown
}

type Result = {
  errors: Finding[]
  warnings: Finding[]
}
```

---

## 7. CLI

### `jsonresume-parity`

```bash
# Filename convention: <anything>.<locale>.json — primer arg = baseline
jsonresume-parity resume.en.json resume.es.json resume.fr.json

# Override cuando el filename no matchea
jsonresume-parity en=cv-main.json es=cv-espanol.json

# Config file (auto-discovery vía cosmiconfig; -c override explícito)
jsonresume-parity -c parity.config.js resume.en.json resume.es.json

# Regla puntual desde CLI
jsonresume-parity --rule lengthRatio=off resume.en.json resume.es.json

# Formato JSON para tooling / CI
jsonresume-parity --format json resume.en.json resume.es.json
```

### `jsonresume-lint`

```bash
jsonresume-lint resume.en.json                        # un archivo
jsonresume-lint resume.en.json resume.es.json         # varios, report por archivo
jsonresume-lint --rule schema=error resume.en.json
jsonresume-lint -c lint.config.js resume.*.json
jsonresume-lint --format json ...
```

### Exit codes (ambos)

- `0` limpio
- `1` errores presentes
- `2` uso incorrecto

Warnings solos no rompen.

---

## 8. Reglas y defaults de severidad

### `jsonresume-parity`

| Regla | Default | Descripción |
|---|---|---|
| typeMismatch | error | Estructura diverge (array vs object, etc.) |
| keyOnlyBaseline | error | Key existe en baseline pero no en el otro locale |
| keyOnlyLocale | error | Key existe en el otro locale pero no en baseline |
| arrayLength | error | Longitud de array difiere |
| mustBeIdentical | error | Identity field (URL, email, fecha) difiere |
| mustBeIdenticalArray | error | Array identity (keywords, tags) difiere |
| valueDiffers | error | Valor non-string difiere |
| metaLanguage | error | `meta.language` no matchea locale del filename |
| emptyOneSide | warn | Vacío en un locale, no en el otro |
| lengthRatio | warn | Ratio de longitud sospechoso (default 2.5×) |
| identicalTranslation | warn | Traducción idéntica en ambos idiomas |

**Identity fields (defaults)**: `startDate`, `endDate`, `url`, `email`, `phone`, `image`, `network`, `username`, `address`, `postalCode`, `countryCode`, `lastModified`, `version`.

**Identity arrays (defaults)**: `keywords`, `tags`.

**Proper-noun fields (defaults)** — skip `identicalTranslation`: `name`, `institution`.

### `jsonresume-lint`

| Regla | Default | Descripción |
|---|---|---|
| dateFormat | error | ISO 8601 (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`) |
| dateOrder | error | `endDate` no anterior a `startDate` |
| url | error | URLs válidas (http/https) |
| email | error | Email con forma válida |
| chronology | warn | Secciones `work` y `education` en orden reverse chronological |
| placeholder | warn | Detecta TODO / FIXME / TBD / XXX / PLACEHOLDER en strings |
| schema | off | JSON Resume schema (opt-in) |

---

## 9. Stack técnico

| Elemento | Elección |
|---|---|
| Lenguaje | TypeScript |
| Build | `tsc` → `dist/` (sin bundler) |
| Módulos | ESM-only |
| Node target | ≥ 20 |
| Tests | vitest, fixtures en `fixtures/` root |
| Versionado | changesets |
| Config discovery | cosmiconfig (flag `-c` → `.config.{js,mjs,json}` → key en package.json) |
| Workspaces | npm workspaces |
| CI | GH Actions, matrix Node 20/22 |

---

## 10. Fases de implementación

1. **Scaffold monorepo** — `git init`, package.json workspaces, tsconfig.base, vitest, changesets, GH Actions CI. Sin lógica.
2. **`core`** — types (Finding, Result, Severity), reporter (text + json), severity application, cosmiconfig wrapper, CLI harness compartido. Tests unitarios básicos.
3. **`parity`** — portar `walkParallel` + `checkLeaf` + `META_LANGUAGE` desde `validate.js`. Generalizar a N locales pairwise. Config extendible (identityFields, properNounFields, lengthRatio por par). Tests con fixtures.
4. **`lint`** — portar `checkDates`, `checkChronology`, `checkUrls`, `checkEmail`, `PLACEHOLDER`, `SCHEMA`. Cada regla en archivo separado. Schema check con `resume-schema` + `ajv` bundled. Tests.
5. **Documentación** — README de cada paquete (install, uso CLI, API, config), changelog inicial via changesets.
6. **Publish 0.1.0** — ambos paquetes a la vez.
7. **Dogfooding en cdrobayna** — reemplazar `scripts/validate.js` por las dos deps publicadas + config file. Verificar CI verde.

Estimado grueso: fases 1–3 en una sesión larga o dos cortas. Fase 4 otra sesión. 5–7 casi triviales.

---

## 11. Mejoras futuras (queue priorizada)

### Alto valor, bajo scope

- Length ratio configurable por par de locales (`{ 'en:ja': 0.7, 'en:es': 1.6, default: 2.5 }`)
- `--format json` output (parte del MVP en la propuesta actual)
- TypeScript typings `.d.ts` publicados (parte del MVP)
- Extensión de identity/proper-noun fields por config (parte del MVP)

### Scope medio

- Severidad por regla estilo ESLint completa (ya en MVP)
- Detección de locale desde `meta.language` como alternativa al filename
- Config extendida del schema (users que forkearon JSON Resume)
- Reporter SARIF (integraciones con Code Scanning, JetBrains)
- Watch mode (`--watch`)
- Suite de fixtures buenos/malos como regression tests (incluida en MVP)
- Problem matcher de GitHub Actions

### Otro producto o gran refactor

- Autofix — solo tiene sentido en `lint` para dateFormat (normalizar ISO); parity no autofixea
- Diff mode: reportar solo regresiones vs `git HEAD~1`
- Plugin / custom rules API
- LSP + extensión VS Code
- Cross-file overlay: `resume.base.json` + `resume.<locale>.overlay.json`
- ATS lint (keyword coverage vs job description) — producto distinto

---

## 12. Decisiones tomadas (resumen ejecutivo)

| Pregunta | Decisión |
|---|---|
| Prefijo de nombres | `jsonresume-*` (para discoverability) |
| Cantidad de paquetes | 2 públicos + 1 core interno |
| Scope npm | Sin scope |
| Dep de `resumed` | No — usa `resume-schema` + `ajv` directo |
| Multi-locale | Pairwise vs baseline (primer arg) |
| Severidad | Estilo ESLint: `off \| warn \| error` |
| Locale detection | Filename `<anything>.<locale>.json` con override `locale=path` |
| Config discovery | cosmiconfig |
| Dev setup | Monorepo npm workspaces con `core` interno compartido |
| Repo name | `jsonresume-tools` |
| Ubicación local | `~/Workspace/personal/jsonresume-tools` (separado de cdrobayna) |
| Stack | TS + tsc + ESM + vitest + changesets |

---

## 13. Referencias

- Fuente actual: [`scripts/validate.js`](scripts/validate.js) (~300 líneas)
- Data actual: `resume.en.json`, `resume.es.json`
- Memoria engram: `topic_key: architecture/jsonresume-tools` (obs-4e1126d18601bd8a)
- JSON Resume schema: https://github.com/jsonresume/resume-schema
- resumed (renderer usado hoy, no será dep): https://github.com/rbardini/resumed
