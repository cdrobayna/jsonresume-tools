# jsonresume-lint

[![npm version](https://img.shields.io/npm/v/jsonresume-lint.svg)](https://www.npmjs.com/package/jsonresume-lint)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

Per-file quality checks for a single [JSON Resume](https://jsonresume.org): date format and
ordering, reverse-chronological `work`/`education` sections, valid URLs and email, leftover
placeholder text, and optional schema validation.

## Install

```bash
npm install --save-dev jsonresume-lint
```

## CLI

The bin is installed as both `jsonresume-lint` and the shorter alias `jrl`.

```bash
npx jrl resume.en.json                    # one file
npx jrl resume.en.json resume.es.json     # several, reported per file
npx jrl --rule schema=error resume.en.json
npx jrl -c lint.config.js resume.*.json
npx jrl --format json resume.en.json resume.es.json
```

Exit codes: `0` clean, `1` errors present, `2` misuse. Warnings alone never fail the run.

## Programmatic API

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
    schema: 'off' // opt-in, explicit
  }
})

// Or with in-memory data
await lint({ data: resumeObject, rules: { ... } })

// result: { errors: Finding[], warnings: Finding[] }
```

## Rules and defaults

| Rule          | Default | Description                                             |
| ------------- | ------- | -------------------------------------------------------- |
| `dateFormat`  | error   | ISO 8601 (`YYYY`, `YYYY-MM`, or `YYYY-MM-DD`)             |
| `dateOrder`   | error   | `endDate` doesn't precede `startDate`                     |
| `url`         | error   | `.url` / `.canonical` fields are valid http(s) URLs       |
| `email`       | error   | `basics.email` has a plausible shape                      |
| `chronology`  | warn    | `work` and `education` are reverse-chronological           |
| `placeholder` | warn    | Detects leftover `TODO` / `FIXME` / `TBD` / `XXX` / `PLACEHOLDER` markers |
| `schema`      | off     | Validates against the official JSON Resume schema (opt-in) |

`schema` defaults to `off` because the official schema restricts several objects to known
properties: documents with custom extension fields (e.g. a non-standard `meta.language`) can
otherwise fail even when they're perfectly valid for your own purposes. Turn it on explicitly
if you don't extend the schema.

## Config discovery

`jrl` reads its config from the `lint` section of a shared `.jsonresumetoolsrc` file. `jrp`
(jsonresume-parity) and `jrx` (jsonresume-execute) read their own sections from the same file,
so one file covers every tool you use:

```json
// .jsonresumetoolsrc.json
{
  "lint": {
    "rules": { "schema": "error", "chronology": "off" }
  }
}
```

Resolved via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig): `-c <path>` for an
explicit file, otherwise auto-discovered from `.jsonresumetoolsrc(.json|.yaml|...)`,
`jsonresumetools.config.(js|ts|cjs|mjs)`, or a `"jsonresumetools"` key in `package.json`. Omitting
the `lint` section entirely falls back to `jrl`'s built-in defaults.

## License

MIT
