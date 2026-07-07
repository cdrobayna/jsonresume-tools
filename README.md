# jsonresume-tools

A suite of independent tools for [JSON Resume](https://jsonresume.org) files. Each package
below is self-contained and independently installable — use the one you need, ignore the rest.

## Tools

| Package | What it does |
|---|---|
| [`jsonresume-parity`](./packages/parity) | Checks structural and content parity across locale variants of a resume (e.g. `resume.en.json` vs `resume.es.json`). |
| [`jsonresume-lint`](./packages/lint) | Per-file quality checks: date format and ordering, chronology, URLs, email, placeholders, and optional schema validation. |

See each package's own README for its full rule set, CLI usage, and programmatic API.

## Origin

This collection started as a single-purpose validator maintained in a personal, bilingual
(EN/ES) CV repo. No existing tool in the JSON Resume ecosystem (resumed, hackmyresume,
resume-cli, rendercv) checks multi-locale parity — `jsonresume-parity` fills that gap.
`jsonresume-lint` split out the per-file checks that don't depend on comparing two locales.

## Development

This is a pnpm workspace — the following is for contributing to the tools themselves, not for
using them in your own project (see each package's README for that).

Requires Node ≥22 and pnpm. A Nix flake (`flake.nix`) provisions both via `direnv` (`use flake`).

```bash
pnpm install
pnpm build   # tsc across all packages
pnpm test    # vitest across all packages
```

Each package builds independently to its own `dist/`, targeting ESM/Node ≥22. A private,
unpublished `@jsonresume-tools/core` package holds infrastructure shared internally between
the published tools (types, severity handling, config loading, CLI harness) — it's an
implementation detail, not something either tool exposes to consumers.

## Repository layout

```
packages/
  core/     @jsonresume-tools/core   (private, workspace-only, shared internals)
  parity/   jsonresume-parity        (published)
  lint/     jsonresume-lint          (published)
fixtures/   shared good/bad JSON Resume fixtures used by tests in packages/*
```

## Status

Pre-release. Packages are built and tested but not yet published to npm.

## License

MIT
