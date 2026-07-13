---
title: "Full workflow: one base resume, two roles, two languages"
description: End-to-end tutorial building a role x language matrix with jrx.
---

# Full workflow: one base resume, two roles, two languages

This walks through the scenario `jsonresume-execute` (`jrx`) exists for: one annotated base
resume, maintained in two languages, producing role-tailored output for two target roles. That's
four files, validated in one command.

Every command and output on this page was run for real against
[`jsonresume-tools-demo`](https://github.com/cdrobayna/jsonresume-tools-demo)'s files. Clone it if
you want to follow along locally.

## The base resumes

`resume.en.json` and `resume.es.json` are a bilingual pair: same structure, same dates, same
identity fields (email, URLs, `startDate`/`endDate`), translated prose. `jsonresume-execute`
auto-detects both from the `resume.<lang>.json` naming convention.

Each taggable entry carries a `meta.tailor` block. This example uses three tags:

- **`backend`** / **`platform`**: role-specific. An entry tagged `backend` only shows up in the
  backend variant; `platform` only in the platform variant. Acme Corp (backend) and Contoso
  (platform) are single-tag entries in the base resume.
- **`core`**: role-agnostic. Entries every variant should show regardless of role, like education
  or an early generalist job, are tagged `core` instead of a role tag. Northwind, an early
  generalist role, is tagged this way.

One entry is tagged with **both** role tags to show the mixed-role case: a job that was genuinely
both backend and platform work.

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

`highlightTags` picks which highlights survive per active variant: index `1` (the blue-green
deploys line) is universal via `"*"` and shows in both. `backend` additionally keeps index `0`,
`platform` additionally keeps index `2`. The same pattern (`keywordTags`) filters a mixed-stack
`skills` entry so each variant only sees the keywords relevant to it. See
[`/reference/tailor`](/reference/tailor) for the full annotation reference.

## Declaring the variants

Two small variant files per language, under `variants/<lang>/`, validated against
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

`also: ["core"]` cascades the `core` tag into each variant's active set, so `tag: backend, also:
[core]` includes any entry tagged `backend` **or** `core`. `sections.drop` removes the `awards`
section from the backend variant entirely (regardless of tags); `sections.order` reorders the
platform variant's output to put `skills` before `work`.

Each variant also overrides `basics.label` and `basics.summary` with a role-specific pitch. That
override is why these variants live under `variants/en/` and `variants/es/` instead of a single
shared `variants/` folder: the same variant name gets applied to both languages by `jrx build`,
and each language's directory carries its own localized override instead of leaking one
language's text into the other. `jrx` auto-detects the `variants/<lang>/` convention with no
extra flags. If you don't need localized overrides, a single flat `variants/` folder works too,
shared across every language.

::: tip What that override looks like at build time
`jrx build` reports every `basics` field a variant overrides:

```
[tailor] warn: overriding basics.label from resume.en.json with variant "backend"
[tailor] warn: overriding basics.summary from resume.en.json with variant "backend"
```

That's expected, not an error: it confirms the localized pitch replaced the base resume's generic
`label`/`summary` for that variant.
:::

## Building the matrix

From a directory containing both base resumes and a `variants/` folder:

```bash
npx jrx build --out-dir dist
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

Four files land in `dist/`: `backend.en.json`, `backend.es.json`, `platform.en.json`,
`platform.es.json`. Every base resume fanned through every variant. Note the asymmetry that falls
straight out of the annotations above: `backend.*.json` has no `awards` key at all
(`sections.drop`), while `platform.*.json` keeps it and lists `skills` before `work`
(`sections.order`). Every output file is canonical JSON Resume: `meta.tailor` is stripped, so any
theme or official tool renders it unmodified.

Only two base resumes were auto-detected here (`resume.en.json` + `resume.es.json`); if a
directory has more languages than you want built, constrain with `--lang en,es`.

## Verifying everything

```bash
npx jrx check --out-dir dist
```

```
[PASS] lint (masters)
[PASS] lint (matrix)
[PASS] parity (masters)
[PASS] tailor check (en)
[PASS] tailor check (es)
[SKIP] audit
    no theme resolved — skipped (pass --theme, or set one in a .jsonresumetoolsrc file's "execute" section, to run the ATS audit)

5 step(s) passed.
```

One command runs `jrl` and `jrp` across both base resumes *and* all four generated matrix files,
plus `jrt check` (annotation coherence: orphan tags, out-of-range `highlightTags`/`keywordTags`
indices, unused variants) for each language. `audit` (resume-cli's ATS check) only runs if you
pass `--theme <name>`. The overall exit code is the worst among the steps that actually ran.

## Optional: render to PDF/HTML

```bash
npx jrx all --theme <your-theme> --format pdf
```

runs `build` → `check` → a `resume-cli` export in one pipeline, producing `cv.<slug>.pdf` per
base resume and matrix file. This step needs `resume-cli` and a Chromium/Chrome binary installed
(`jrx doctor` tells you what's missing); it isn't required for the build-and-validate workflow
above. See [`/reference/execute`](/reference/execute) for the full flag reference.

## Where to go from here

- [`/reference/tailor`](/reference/tailor): the complete `meta.tailor` annotation model
  (`highlightTags`, `keywordTags`, `courseTags`, `labelPerTag`, `limits`).
- [`/reference/execute`](/reference/execute): every `jrx` subcommand and flag.
- [`/reference/config`](/reference/config): configuring `jrl`/`jrp` rule severities via a config
  file instead of `--rule` flags.
