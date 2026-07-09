# jsonresume-parity

## 0.1.1

### Patch Changes

- cca7d91: Verify the automated changesets + GitHub Actions release pipeline end-to-end. No functional changes.

## 0.1.0

### Minor Changes

- 32b8896: Initial release.

  - `jsonresume-parity` checks structural and content parity across locale variants of a JSON
    Resume (e.g. `resume.en.json` vs `resume.es.json`): matching shape, identical non-translatable
    fields (dates, URLs, emails, keywords), and translation-quality heuristics (length ratio,
    untranslated strings). Supports N locales, compared pairwise against a baseline.
  - `jsonresume-lint` runs per-file quality checks: date format and ordering, reverse-chronological
    `work`/`education` sections, valid URLs and email, leftover placeholder text, and optional
    JSON Resume schema validation.

  Both are extracted from a single-purpose validator maintained in a personal CV repo, split so
  each concern is independently reusable, configurable (ESLint-style `off`/`warn`/`error`
  severities, cosmiconfig-based config discovery), and documented.
