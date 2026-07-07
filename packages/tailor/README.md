# jsonresume-tailor

Generate role-tailored variants of a [JSON Resume](https://jsonresume.org) from a single
annotated master resume. Annotate `work`/`education`/`skills`/`projects`/`awards`/`certificates`/
`publications`/`volunteer` entries with tags under `meta.tailor`, declare a variant per target
role (`backend`, `devops`, `sysadmin`, ...), and `jsonresume-tailor build <variant>` emits a
filtered resume that's canonical JSON Resume — no trace of `tailor` left in it, so any theme or
official tool (`resume-cli`, `resumed`, ...) renders it unmodified.

## Install

```bash
npm install --save-dev jsonresume-tailor
```

## Annotating the master resume

Everything lives under `entry.meta.tailor`. Outside that sub-object the resume stays canonical
JSON Resume.

```typescript
interface TailorMeta {
  tags?: string[]                           // tags that include this entry
  highlightTags?: Record<string, number[]>  // { tag: [highlight indices] }
  labelPerTag?: Record<string, string>      // override of "name"/"position" per tag
}
```

- **`tags`** — an entry with no tags never appears in any variant's output; it's an internal
  reference in the master resume. Otherwise, the entry is included whenever the active variant's
  tags intersect this list.
- **`highlightTags`** — optional, only meaningful on entries with a `highlights` array. If
  omitted, all highlights are emitted (mixed-role entries are the only ones that need this map).
  The `"*"` key is universal: those indices are emitted for every variant.
- **`labelPerTag`** — optional override of the entry's label field per active tag
  (`skills → name`, `work → position`, `projects → name`). Silently ignored elsewhere.

**Single-role entry:**

```json
{
  "name": "Acme Corp",
  "position": "Backend Engineer",
  "highlights": ["…", "…"],
  "meta": { "tailor": { "tags": ["short", "backend"] } }
}
```

**Mixed-role entry, filtering highlights per tag:**

```json
{
  "name": "Northwind Traders",
  "position": "Backend & Infrastructure Engineer",
  "highlights": [
    "Cut cloud spend 45% by migrating staging environments to spot instances.",
    "Owned the notifications and billing services end-to-end.",
    "Co-designed the product's core domain model on Node.js, TypeORM, and PostgreSQL.",
    "Shipped customer-facing features across the checkout and onboarding flows.",
    "Maintained the team's internal tooling: VPN, DNS, and secrets management."
  ],
  "meta": {
    "tailor": {
      "tags": ["short", "backend", "platform", "devops"],
      "highlightTags": {
        "*": [2],
        "backend": [1, 2],
        "platform": [0, 4],
        "devops": [0, 4]
      }
    }
  }
}
```

**Skill with an alternate label:**

```json
{
  "name": "Backend",
  "keywords": ["Node.js", "TypeScript", "NestJS"],
  "meta": {
    "tailor": {
      "tags": ["short", "backend"],
      "labelPerTag": { "backend": "Core Backend Stack" }
    }
  }
}
```

## Declaring a variant

A variant is a small JSON file (conventionally `variants/<name>.json`, though the CLI accepts any
path via `--variant-file`), validated against the published
[`tailor-variant.schema.json`](./tailor-variant.schema.json):

```typescript
interface Variant {
  $schema?: string
  name: string                        // required, should match the file's basename
  description?: string
  tag: string                         // required, primary tag
  also?: string[]                     // secondary tags cascaded into the active set
  basics?: Partial<Basics>            // shallow overrides onto resume.basics
  sections?: {
    order?: string[]                  // final section order; unlisted sections go last
    drop?: string[]                   // sections to remove entirely
  }
  limits?: Record<string, number>     // { section: maxEntries }, applied after filtering
}
```

```json
{
  "$schema": "./tailor-variant.schema.json",
  "name": "backend",
  "description": "Backend engineer roles (Node/NestJS-focused)",
  "tag": "backend",
  "also": ["short"],
  "basics": {
    "label": "Backend Engineer",
    "summary": "Backend engineer with production experience across NestJS, TypeORM, and PostgreSQL."
  },
  "sections": { "drop": ["awards"] },
  "limits": { "work": 4, "projects": 1 }
}
```

An entry is included whenever its `tags` intersect `[variant.tag, ...variant.also]` — e.g. the
`backend` variant above also picks up every entry tagged `short`, cascading a condensed base set
into role-specific variants (see `also`).

## CLI

```bash
# Filter the master resume through the "backend" variant and write the result
jsonresume-tailor build backend --resume resume.en.json --out resume.backend.en.json

# Preview without writing (prints the same summary to stdout)
jsonresume-tailor build backend --resume resume.en.json --out resume.backend.en.json --dry-run

# Silence "overriding basics.X" warnings
jsonresume-tailor build backend --resume resume.en.json --out resume.backend.en.json --quiet

# List the variants found in variants/*.json
jsonresume-tailor list

# Check meta.tailor annotations for coherence against the variants
jsonresume-tailor check --resume resume.en.json
jsonresume-tailor check backend --resume resume.en.json   # a single variant
```

`build` prints a per-section summary on success:

```
[tailor] backend → resume.backend.en.json
[tailor] work: 7 → 4 entries (highlights: 20 → 14)
[tailor] skills: 4 → 3 entries
```

Exit codes: `0` success · `1` validation error (invalid variant/resume, out-of-range highlight
index in `check`) · `2` usage error (bad arguments, file not found).

## Programmatic API

```ts
import { tailor, loadVariant, checkTailor } from 'jsonresume-tailor'

const variant = await loadVariant('variants/backend.json')
const { resume, summary } = tailor(masterResume, variant, {
  quiet: false,
  onWarning: (message) => console.warn(message)
})
// resume: filtered, canonical JSON Resume — no meta.tailor left
// summary: { sections: { work: { before, after, highlightsBefore?, highlightsAfter? }, ... }, warnings }

// Cross-check the master resume's annotations against a set of variants
const result = checkTailor(masterResume, [variant])
// result: { errors: Finding[], warnings: Finding[] }
```

`tailor()` never mutates its input — it returns a filtered deep copy plus a summary of what
changed.

## `check` rules and defaults

| Rule                    | Default | Description                                                          |
| ------------------------ | ------- | ---------------------------------------------------------------------- |
| `tailorHighlightIndex`  | error   | A `highlightTags` index is out of range for the entry's `highlights`  |
| `tailorEmptyTags`       | warn    | `meta.tailor` is present but `tags` is empty or missing               |
| `tailorTagShape`        | warn    | `tags` isn't an array of strings                                      |
| `tailorOrphanTag`       | warn    | A tag is used in the resume but no variant declares it                |
| `tailorUnusedVariant`   | warn    | A variant matches no entry in the resume                              |
| `tailorEmptySection`    | warn    | A section is empty after filtering and isn't in `sections.drop`       |

These checks are self-contained to `jsonresume-tailor` — installing it does not pull in
`jsonresume-lint`, and `jsonresume-lint` has no knowledge of `meta.tailor`.

## License

MIT
