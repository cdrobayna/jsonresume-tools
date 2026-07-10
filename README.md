# jsonresume-tools

A suite of independent tools for [JSON Resume](https://jsonresume.org) files. Each package
below is self-contained and independently installable — use the one you need, ignore the rest.

## Tools

| Package | What it does |
|---|---|
| [`jsonresume-parity`](./packages/parity) | `jrp` — checks structural and content parity across locale variants of a resume (e.g. `resume.en.json` vs `resume.es.json`). |
| [`jsonresume-lint`](./packages/lint) | `jrl` — per-file quality checks: date format and ordering, chronology, URLs, email, placeholders, and optional schema validation. |
| [`jsonresume-tailor`](./packages/tailor) | `jrt` — generates role-tailored variants (backend, devops, sysadmin, ...) of a resume from a single annotated master JSON Resume. |
| [`jsonresume-execute`](./packages/execute) | `jrx` — orchestrates the tools above (plus `resume-cli`) across languages and role variants for multi-tool workflows, e.g. building a full `{role}.{lang}.json` matrix in one command. |

See each package's own README for its full rule set, CLI usage, and programmatic API.

`jsonresume-execute` is the one exception to "independent, no dependency on each other": it's a
thin orchestration layer that *detects* the tools above (and `resume-cli`) at runtime and shells
out to whichever are installed — it does not bundle or depend on them, and they have zero
knowledge of it. Skip it if you only ever need one tool at a time.

## Origin

This collection started as a single-purpose validator maintained in a personal, bilingual
(EN/ES) CV repo. No existing tool in the JSON Resume ecosystem (resumed, hackmyresume,
resume-cli, rendercv) checks multi-locale parity — `jsonresume-parity` fills that gap.
`jsonresume-lint` split out the per-file checks that don't depend on comparing two locales.
`jsonresume-tailor` generalizes a separate ad hoc `filter-short.js` script from that same CV
repo into a reusable tool for generating role-specific resume variants.

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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branching conventions, changesets, and how
releases are cut.

## Repository layout

```
packages/
  core/     @jsonresume-tools/core   (private, workspace-only, shared internals)
  parity/   jsonresume-parity        (published)
  lint/     jsonresume-lint          (published)
  tailor/   jsonresume-tailor        (published)
  execute/  jsonresume-execute       (pending first release) — orchestrates the three above + resume-cli
fixtures/   shared good/bad JSON Resume fixtures used by tests in packages/*
```

## Status

`jsonresume-parity`, `jsonresume-lint`, and `jsonresume-tailor` are published on npm.
`jsonresume-execute` is new and ships in its first release via the changeset in this repo.

## License

MIT
