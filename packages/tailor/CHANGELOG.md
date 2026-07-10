# jsonresume-tailor

## 0.2.0

### Minor Changes

- ec86455: Generalize sub-array tag filtering with a data-driven `TAGGABLE_FIELDS` registry. Adding a new
  filterable array field (like `highlightTags`, `keywordTags`) now requires only a one-line registry
  entry plus the type definition — no per-field filter/check functions needed.

  Add `meta.tailor.courseTags` for filtering `courses` on education entries, mirroring
  `highlightTags`/`keywordTags` shape and semantics (including the `"*"` wildcard). Adds a
  corresponding `tailorCourseIndex` check rule.

  Replace `TailorSectionSummary.highlightsBefore`/`highlightsAfter` with a generalized `arrayStats`
  map that tracks before/after counts for all taggable array fields (highlights, keywords, courses).
  CLI output now reports stats for every filtered array, not just highlights.

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

- a62c2d1: Add `jsonresume-tailor`: generate role-tailored variants (backend, devops, sysadmin, ...) of a
  JSON Resume from a single annotated master resume.

  - Annotate `work`/`education`/`skills`/`projects`/`awards`/`certificates`/`publications`/
    `volunteer` entries with tags, per-highlight tag maps, and per-tag label overrides under
    `entry.meta.tailor`.
  - Declare a variant (`variants/<name>.json`, validated against a published
    `tailor-variant.schema.json` via Ajv) describing its active tags, `basics` overrides, section
    drop/reorder, and per-section entry limits.
  - `jsonresume-tailor build <variant>` emits a filtered resume with no trace of `meta.tailor`
    left — canonical JSON Resume, renderable by any theme or official tool unmodified. Also
    ships `list` (enumerate variants) and `check` (coherence checks: out-of-range highlight
    indices, empty/malformed tags, orphan tags, unused variants, sections left empty without
    being dropped) — all self-contained to `jsonresume-tailor`, with no dependency on and no
    changes to `jsonresume-lint`.
  - Generalizes the ad hoc `filter-short.js` filtering script from a personal CV repo into a
    reusable, publishable tool.

  Also extends `@jsonresume-tools/core`'s internal CLI harness with `runSubcommandCli`, a sibling
  to `runCli` for tools built around subcommands (`build`/`list`/`check`) rather than a flat file
  list. Purely additive — `runCli`/`parseArgs` and the `jsonresume-lint`/`jsonresume-parity` CLIs
  are unchanged.
