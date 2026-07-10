---
title: Full workflow — one master, two roles, two languages
description: End-to-end tutorial building a role x language matrix with jrx.
---

# Full workflow: one master, two roles, two languages

This walks through the scenario `jsonresume-execute` (`jrx`) exists for: one annotated master
resume, maintained in two languages, producing role-tailored output for two target roles — four
files total — validated in one command.

Every command and output on this page was run for real against the example files in
[`docs/examples/`](https://github.com/cdrobayna/jsonresume-tools/tree/main/docs/examples) in this
repo. Clone them if you want to follow along locally.

## The master resumes

`resume.en.json` and `resume.es.json` are a bilingual pair — same structure, same dates, same
identity fields (email, URLs, `startDate`/`endDate`), translated prose. `jsonresume-execute`
auto-detects both from the `resume.<lang>.json` naming convention.

Each taggable entry carries a `meta.tailor` block. This example uses three tags:

- **`backend`** / **`platform`** — role-specific. An entry tagged `backend` only shows up in the
  backend variant; `platform` only in the platform variant.
- **`core`** — role-agnostic. Entries every variant should show regardless of role (education, an
  early generalist job) are tagged `core` instead of a role tag.

One entry is tagged with **both** role tags to show the mixed-role case — a job that was
genuinely both backend and platform work:

```json
{
  "name": "Solstice Retail",
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
deploys line) is universal via `"*"` and shows in both; `backend` additionally keeps index `0`,
`platform` additionally keeps index `2`. The same pattern (`keywordTags`) filters a mixed-stack
`skills` entry so each variant only sees the keywords relevant to it — see
[`/reference/tailor`](/reference/tailor) for the full annotation reference.

## Declaring the variants

Two small variant files in `variants/`, validated against
[`tailor-variant.schema.json`](https://github.com/cdrobayna/jsonresume-tools/blob/main/packages/tailor/tailor-variant.schema.json):

```json
// variants/backend.json
{
  "name": "backend",
  "description": "Backend-focused roles: APIs, services, and the data layer.",
  "tag": "backend",
  "also": ["core"],
  "sections": { "drop": ["awards"] }
}
```

```json
// variants/platform.json
{
  "name": "platform",
  "description": "Platform/infrastructure-focused roles: cloud, CI/CD, and reliability.",
  "tag": "platform",
  "also": ["core"],
  "sections": { "order": ["basics", "skills", "work", "projects", "education", "awards"] }
}
```

`also: ["core"]` cascades the `core` tag into each variant's active set, so `tag: backend, also:
[core]` includes any entry tagged `backend` **or** `core`. `sections.drop` removes the `awards`
section from the backend variant entirely (regardless of tags); `sections.order` reorders the
platform variant's output to put `skills` before `work`.

::: tip Keep locale-sensitive overrides out of shared variant files
A `tailor` variant can also override `basics` (e.g. a role-specific `label`/`summary`). This
example deliberately doesn't, because the **same** variant file is applied to both the English and
Spanish master by `jrx build` — an English `basics.summary` override would leak into the Spanish
output. If you need localized overrides, keep separate variant directories per language and pass
`--variants-dir en=variants/en,es=variants/es`.
:::

## Building the matrix

From a directory containing both masters and a `variants/` folder:

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
```

Four files land in `dist/`: `backend.en.json`, `backend.es.json`, `platform.en.json`,
`platform.es.json` — every master fanned through every variant. Note the asymmetry that falls
straight out of the annotations above: `backend.*.json` has no `awards` key at all
(`sections.drop`), while `platform.*.json` keeps it and lists `skills` before `work`
(`sections.order`). Every output file is canonical JSON Resume — `meta.tailor` is stripped, so any
theme or official tool renders it unmodified.

Only two masters were auto-detected here (`resume.en.json` + `resume.es.json`); if a directory has
more languages than you want built, constrain with `--lang en,es`.

## Verifying everything

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

One command runs `jrl` and `jrp` across both masters *and* all four generated matrix files, plus
`jrt check` (annotation coherence — orphan tags, out-of-range `highlightTags`/`keywordTags`
indices, unused variants) for each language. `audit` (resume-cli's ATS check) only runs if you
pass `--theme <name>`. The overall exit code is the worst among the steps that actually ran.

## Optional: render to PDF/HTML

```bash
jrx all --theme <your-theme> --format pdf
```

runs `build` → `check` → a `resume-cli` export in one pipeline, producing `cv.<slug>.pdf` per
master and matrix file. This step needs `resume-cli` and a Chromium/Chrome binary installed (`jrx
doctor` tells you what's missing); it isn't required for the build-and-validate workflow above.
See [`/reference/execute`](/reference/execute) for the full flag reference.

## Where to go from here

- [`/reference/tailor`](/reference/tailor) — the complete `meta.tailor` annotation model
  (`highlightTags`, `keywordTags`, `courseTags`, `labelPerTag`, `limits`).
- [`/reference/execute`](/reference/execute) — every `jrx` subcommand and flag.
- [`/reference/config`](/reference/config) — configuring `jrl`/`jrp` rule severities via a config
  file instead of `--rule` flags.
