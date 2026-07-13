---
title: "Flujo completo: un currículum base, dos roles, dos idiomas"
description: Tutorial de punta a punta armando una matriz rol x idioma con jrx.
---

# Flujo completo: un currículum base, dos roles, dos idiomas

Este tutorial recorre el escenario para el que existe `jsonresume-execute` (`jrx`): un único
currículum base anotado, mantenido en dos idiomas, que produce output personalizado para dos
roles objetivo. Son cuatro archivos, validados en un solo comando.

Cada comando y output de esta página se corrió de verdad contra los archivos de
[`jsonresume-tools-demo`](https://github.com/cdrobayna/jsonresume-tools-demo). Clona ese repo si
quieres seguir el tutorial en tu máquina.

## Los currículums base

`resume.en.json` y `resume.es.json` son un par bilingüe: misma estructura, mismas fechas, mismos
campos de identidad (email, URLs, `startDate`/`endDate`), prosa traducida. `jsonresume-execute`
detecta ambos automáticamente por la convención de nombres `resume.<lang>.json`.

Cada entrada anotable lleva un bloque `meta.tailor`. Este ejemplo usa tres tags:

- **`backend`** / **`platform`**: específicos de rol. Una entrada etiquetada `backend` solo
  aparece en la variante backend; `platform` solo en la variante platform. Acme Corp (backend) y
  Contoso (platform) son entradas de un solo tag en el currículum base.
- **`core`**: agnóstico de rol. Las entradas que toda variante debería mostrar sin importar el
  rol, como educación o un puesto generalista temprano, se etiquetan `core` en vez de con un tag
  de rol. Northwind, un rol generalista temprano, está etiquetado así.

Una entrada está etiquetada con **ambos** tags de rol para mostrar el caso mixto: un puesto que
genuinamente fue tanto trabajo de backend como de platform.

```json
{
  "name": "Fabrikam",
  "position": "Backend & Platform Engineer",
  "highlights": [
    "Built the checkout service that absorbed the company's Black Friday peak traffic.",
    "Introduced blue-green deploys, eliminating checkout downtime during releases.",
    "Wrote the on-call runbooks the infrastructure team still uses today."
  ],
  "meta": {
    "tailor": {
      "tags": ["backend", "platform"],
      "highlightTags": {
        "*": [1],
        "backend": [0, 1],
        "platform": [1, 2]
      }
    }
  }
}
```

`highlightTags` elige qué highlights sobreviven por variante activa: el índice `1` (la línea de
blue-green deploys) es universal vía `"*"` y aparece en ambas. `backend` además conserva el índice
`0`, `platform` además conserva el índice `2`. El mismo patrón (`keywordTags`) filtra una entrada
mixta de `skills` para que cada variante solo vea los keywords relevantes para ella. Consulta
[`/reference/tailor`](/es/reference/tailor) para la referencia completa de anotaciones (en inglés).

## Declarando las variantes

Dos archivos de variante pequeños por idioma, bajo `variants/<lang>/`, validados contra
[`tailor-variant.schema.json`](https://github.com/cdrobayna/jsonresume-tools/blob/main/packages/tailor/tailor-variant.schema.json):

```
variants/
  en/
    backend.json
    platform.json
  es/
    backend.json
    platform.json
```

```json
// variants/en/backend.json
{
  "name": "backend",
  "description": "Backend-focused roles: APIs, services, and the data layer.",
  "tag": "backend",
  "also": ["core"],
  "basics": {
    "label": "Backend Engineer",
    "summary": "Backend engineer focused on APIs, services, and the data layer — from subscription billing at scale to p95 latency work."
  },
  "sections": { "drop": ["awards"] }
}
```

```json
// variants/en/platform.json
{
  "name": "platform",
  "description": "Platform/infrastructure-focused roles: cloud, CI/CD, and reliability.",
  "tag": "platform",
  "also": ["core"],
  "basics": {
    "label": "Platform Engineer",
    "summary": "Platform engineer focused on cloud infrastructure, CI/CD, and reliability — from cutting release time 4x to rolling out cluster autoscaling in production."
  },
  "sections": { "order": ["basics", "skills", "work", "projects", "education", "awards"] }
}
```

`also: ["core"]` propaga el tag `core` al conjunto activo de cada variante, así que `tag: backend,
also: [core]` incluye cualquier entrada etiquetada `backend` **o** `core`. `sections.drop` elimina
por completo la sección `awards` de la variante backend (sin importar los tags); `sections.order`
reordena el output de la variante platform para poner `skills` antes que `work`.

Cada variante también sobreescribe `basics.label` y `basics.summary` con una propuesta específica
del rol. Ese override es la razón por la que estas variantes viven bajo `variants/en/` y
`variants/es/` en vez de una sola carpeta `variants/` compartida: el mismo nombre de variante se
aplica a ambos idiomas por `jrx build`, y cada carpeta de idioma lleva su propio override
localizado en vez de filtrar el texto de un idioma al otro. `jrx` detecta automáticamente la
convención `variants/<lang>/` sin flags adicionales. Si no necesitas overrides localizados, una
sola carpeta `variants/` plana también funciona, compartida entre todos los idiomas.

::: tip Así se ve ese override al momento de construir
`jrx build` reporta cada campo de `basics` que una variante sobreescribe:

```
[tailor] warn: overriding basics.label from resume.en.json with variant "backend"
[tailor] warn: overriding basics.summary from resume.en.json with variant "backend"
```

Ese warning es esperado, no un error: confirma que la propuesta localizada reemplazó el
`label`/`summary` genérico del currículum base para esa variante.
:::

## Armando la matriz

Desde un directorio que contiene ambos currículums base y una carpeta `variants/`:

```bash
jrx build --out-dir dist
```

```
[tailor] backend → dist/backend.en.json
[tailor] work: 4 → 3 entries (highlights: 9 → 6)
[tailor] education: 1 → 1 entries
[tailor] skills: 4 → 3 entries (keywords: 14 → 9)
[tailor] projects: 2 → 1 entries (highlights: 4 → 2)
[tailor] platform → dist/platform.en.json
[tailor] work: 4 → 3 entries (highlights: 9 → 6)
[tailor] education: 1 → 1 entries
[tailor] skills: 4 → 3 entries (keywords: 14 → 8)
[tailor] projects: 2 → 1 entries (highlights: 4 → 2)
[tailor] awards: 1 → 1 entries

[tailor] backend → dist/backend.es.json
[tailor] work: 4 → 3 entries (highlights: 9 → 6)
[tailor] education: 1 → 1 entries
[tailor] skills: 4 → 3 entries (keywords: 14 → 9)
[tailor] projects: 2 → 1 entries (highlights: 4 → 2)
[tailor] platform → dist/platform.es.json
[tailor] work: 4 → 3 entries (highlights: 9 → 6)
[tailor] education: 1 → 1 entries
[tailor] skills: 4 → 3 entries (keywords: 14 → 8)
[tailor] projects: 2 → 1 entries (highlights: 4 → 2)
[tailor] awards: 1 → 1 entries

[tailor] warn: overriding basics.label from resume.en.json with variant "backend"
[tailor] warn: overriding basics.summary from resume.en.json with variant "backend"
[tailor] warn: overriding basics.label from resume.en.json with variant "platform"
[tailor] warn: overriding basics.summary from resume.en.json with variant "platform"

[tailor] warn: overriding basics.label from resume.es.json with variant "backend"
[tailor] warn: overriding basics.summary from resume.es.json with variant "backend"
[tailor] warn: overriding basics.label from resume.es.json with variant "platform"
[tailor] warn: overriding basics.summary from resume.es.json with variant "platform"
```

Cuatro archivos caen en `dist/`: `backend.en.json`, `backend.es.json`, `platform.en.json`,
`platform.es.json`. Cada currículum base pasado por cada variante. Nota la asimetría que surge
directamente de las anotaciones de arriba: `backend.*.json` no tiene la clave `awards` en
absoluto (`sections.drop`), mientras que `platform.*.json` la conserva y lista `skills` antes que
`work` (`sections.order`). Cada archivo de output es JSON Resume canónico: `meta.tailor` queda
eliminado, así que cualquier tema o herramienta oficial lo renderiza sin modificar.

Aquí solo se detectaron automáticamente dos currículums base (`resume.en.json` + `resume.es.json`);
si un directorio tiene más idiomas de los que quieres armar, restringe con `--lang en,es`.

## Verificando todo

```bash
jrx check --out-dir dist
```

```
[PASS] lint (masters)
[PASS] lint (matrix)
[PASS] parity (masters)
[PASS] tailor check (en)
[PASS] tailor check (es)
[SKIP] audit
    no --theme given — skipped (pass --theme to run the ATS audit)

5 step(s) passed.
```

Un solo comando corre `jrl` y `jrp` contra ambos currículums base *y* los cuatro archivos de
matriz generados, más `jrt check` (coherencia de anotaciones: tags huérfanos, índices fuera de
rango en `highlightTags`/`keywordTags`, variantes sin uso) para cada idioma. `audit` (el chequeo
ATS de resume-cli) solo corre si pasas `--theme <name>`. El código de salida general es el peor
entre los pasos que realmente corrieron.

## Opcional: exportar a PDF/HTML

```bash
jrx all --theme <tu-tema> --format pdf
```

corre `build` → `check` → una exportación de `resume-cli` en un solo pipeline, produciendo
`cv.<slug>.pdf` por cada currículum base y archivo de matriz. Este paso necesita `resume-cli` y un
binario de Chromium/Chrome instalado (`jrx doctor` te dice qué falta); no es necesario para el
flujo de build-y-validación de arriba. Consulta [`/reference/execute`](/es/reference/execute) para
la referencia completa de flags (en inglés).

## Adónde ir desde aquí

- [`/reference/tailor`](/es/reference/tailor): el modelo completo de anotaciones `meta.tailor`
  (`highlightTags`, `keywordTags`, `courseTags`, `labelPerTag`, `limits`). En inglés.
- [`/reference/execute`](/es/reference/execute): cada subcomando y flag de `jrx`. En inglés.
- [`/reference/config`](/es/reference/config): configurando la severidad de reglas de `jrl`/`jrp`
  vía un archivo de config en vez de flags `--rule`. En inglés.
