# jsonresume-tools

A pnpm monorepo of two focused, reusable checkers for [JSON Resume](https://jsonresume.org) files:

- **[`jsonresume-parity`](./packages/parity)** — verifies structural and content parity across
  multiple locales of the same resume (e.g. `resume.en.json` vs `resume.es.json`): matching
  shape, identical non-translatable fields (dates, URLs, emails, keywords), and translation
  quality heuristics (length ratio, untranslated strings).
- **[`jsonresume-lint`](./packages/lint)** — per-file quality checks: date format and ordering,
  reverse-chronological sections, valid URLs/emails, leftover placeholders, and optional
  JSON Resume schema validation.

Both are built on a small private internal package, `@jsonresume-tools/core`, which provides
shared types, severity handling (`off | warn | error`), a config loader (via
[cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)), and a CLI harness.

## Why

No existing tool in the JSON Resume ecosystem (resumed, hackmyresume, resume-cli, rendercv)
checks multi-locale parity. This monorepo extracts that logic — originally a single-purpose
validator maintained in a personal CV repo — into standalone, general-purpose packages.

## Development

Requires Node ≥22 and pnpm. A Nix flake (`flake.nix`) provisions both via `direnv` (`use flake`).

```bash
pnpm install
pnpm build      # tsc -b across all packages
pnpm test       # vitest across all packages
```

Each package builds independently to its own `dist/` via `tsc`, targeting ESM/Node ≥22.

## Repository layout

```
packages/
  core/     @jsonresume-tools/core   (private, workspace-only)
  parity/   jsonresume-parity        (published)
  lint/     jsonresume-lint          (published)
fixtures/   shared good/bad JSON Resume fixtures used by tests in packages/*
```

## Status

Pre-release. Packages are built and tested but not yet published to npm.

## License

MIT
