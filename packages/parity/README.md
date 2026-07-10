# jsonresume-parity

Checks structural and content parity across locale variants of a [JSON Resume](https://jsonresume.org)
(e.g. `resume.en.json` vs `resume.es.json`): matching shape, identical non-translatable fields
(dates, URLs, emails, keywords), and translation-quality heuristics (length ratio, untranslated
strings).

No package in the JSON Resume ecosystem (resumed, hackmyresume, resume-cli, rendercv) checks
multi-locale parity — this fills that gap.

## Install

```bash
npm install --save-dev jsonresume-parity
```

## CLI

The bin is installed as both `jsonresume-parity` and the shorter alias `jrp`.

Files use the convention `<anything>.<locale>.json` — the **first file given is the baseline**;
every other file is compared against it.

```bash
# Filename convention
jrp resume.en.json resume.es.json resume.fr.json

# Explicit override when the filename doesn't encode the locale
jrp en=cv-main.json es=cv-espanol.json

# Config file (auto-discovered via cosmiconfig; -c overrides explicitly)
jrp -c parity.config.js resume.en.json resume.es.json

# One-off rule severity override
jrp --rule lengthRatio=off resume.en.json resume.es.json

# Machine-readable output
jrp --format json resume.en.json resume.es.json
```

Exit codes: `0` clean, `1` errors present, `2` misuse. Warnings alone never fail the run.

## Programmatic API

```ts
import { checkParity, defaults } from 'jsonresume-parity'

// From disk
const result = await checkParity({
  locales: [
    { locale: 'en', path: 'resume.en.json' }, // first entry = baseline
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

// From already-parsed data (tests, custom pipelines)
await checkParity({
  locales: [
    { locale: 'en', data: resumeEnObject },
    { locale: 'es', data: resumeEsObject }
  ]
})

// result: { errors: Finding[], warnings: Finding[] }
```

## Rules and defaults

| Rule                    | Default | Description                                          |
| ------------------------ | ------- | ----------------------------------------------------- |
| `typeMismatch`          | error   | Structure diverges (array vs object, etc.)           |
| `keyOnlyBaseline`       | error   | Key exists in the baseline but not the other locale  |
| `keyOnlyLocale`         | error   | Key exists in the other locale but not the baseline  |
| `arrayLength`           | error   | Array length differs                                 |
| `mustBeIdentical`       | error   | Identity field (URL, email, date, ...) differs       |
| `mustBeIdenticalArray`  | error   | Identity array (keywords, tags) differs              |
| `valueDiffers`          | error   | Non-string value differs                             |
| `metaLanguage`          | error   | `meta.language` doesn't match the locale             |
| `emptyOneSide`          | warn    | Empty in one locale, not the other                   |
| `lengthRatio`           | warn    | Suspicious length ratio between translations         |
| `identicalTranslation`  | warn    | Identical string in both languages (untranslated?)   |

**Identity fields (default):** `startDate`, `endDate`, `url`, `email`, `phone`, `image`, `network`,
`username`, `address`, `postalCode`, `countryCode`, `lastModified`, `version`.

**Identity arrays (default):** `keywords`, `tags`.

**Proper-noun fields (default)** — skip `identicalTranslation` only: `name`, `institution`.

## Config discovery

Resolved via [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig): `-c <path>` for an
explicit file, otherwise auto-discovered from `.jsonresumeparityrc(.json|.yaml|...)`,
`jsonresumeparity.config.(js|ts|cjs|mjs)`, or a `"jsonresumeparity"` key in `package.json`.

## License

MIT
