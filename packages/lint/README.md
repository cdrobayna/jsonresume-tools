# jsonresume-lint

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
jrl resume.en.json                    # one file
jrl resume.en.json resume.es.json     # several, reported per file
jrl --rule schema=error resume.en.json
jrl -c lint.config.js resume.*.json
jrl --format json resume.en.json resume.es.json
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
properties — documents with custom extension fields (e.g. a non-standard `meta.language`) can
otherwise fail even when they're perfectly valid for your own purposes. Turn it on explicitly
if you don't extend the schema.

## Config discovery

Resolved via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig): `-c <path>` for an
explicit file, otherwise auto-discovered from `.jsonresumelintrc(.json|.yaml|...)`,
`jsonresumelint.config.(js|ts|cjs|mjs)`, or a `"jsonresumelint"` key in `package.json`.

## License

MIT
