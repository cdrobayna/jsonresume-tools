# jsonresume-lint

## 0.3.0

### Minor Changes

- 44559e7: `jrl`/`jrp` now read their config from one shared `.jsonresumetoolsrc` file per project
  (moduleName `jsonresumetools`) instead of each having its own `.jsonresumelintrc`/
  `jsonresumeparity.config.js`. Put each tool's settings under its own top-level key:

  ```json
  {
    "lint": { "rules": { "schema": "error" } },
    "parity": { "lengthRatio": { "default": 2.5 } }
  }
  ```

  Omitting a tool's key entirely falls back to that tool's built-in defaults, same as an empty or
  missing file did before. This is a breaking rename — old per-tool config files are no longer read
  at all; move their contents under `"lint"`/`"parity"` in a `.jsonresumetoolsrc` file (or a
  `"jsonresumetools"` key in `package.json`). See `docs/reference/config.md` for the full shape,
  including `jrx`'s `"execute"` section.

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
