# jsonresume-parity

## 0.2.0

### Minor Changes

- 393728e: Add a `--version`/`-V` flag to all three CLIs, printing the installed package's real version.

  Also hoists shared CLI plumbing that `jsonresume-tailor` previously kept private into
  `@jsonresume-tools/core`: `parseFlags` (the verb-style flag parser, sibling to `parseArgs`),
  `extractLocale`/`LOCALE_RE` (the `<file>.<locale>.json` suffix parser, now also used by
  `jsonresume-parity`'s locale resolution instead of a duplicate copy), and the `CommandResult`
  type. Purely internal — no behavior change beyond `--version`.

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
