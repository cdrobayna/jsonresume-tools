# jsonresume-tailor

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
