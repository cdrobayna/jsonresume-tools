# AGENTS.md

Instructions for AI coding agents working in this repo. Humans: see
[README.md](./README.md) (what this is, dev setup) and
[CONTRIBUTING.md](./CONTRIBUTING.md) (branching, changesets, release process) — this file is
a condensed, agent-oriented version of both, plus hard rules around the automated release
pipeline that must not be broken.

## Project snapshot

pnpm workspace, Node ≥22, TypeScript strict, ESM only (`"type": "module"` everywhere).

```
packages/
  core/     @jsonresume-tools/core   — private, workspace-only, shared internals
  lint/     jsonresume-lint          — published (per-file JSON Resume checks)
  parity/   jsonresume-parity        — published (multi-locale parity checks)
  tailor/   jsonresume-tailor        — published (role-tailored resume variants)
  execute/  jsonresume-execute       — published (jrx: orchestrates the three above + resume-cli)
fixtures/   shared good/bad JSON Resume fixtures used across packages' tests
```

`@jsonresume-tools/core` is never published — don't add it as a dependency in anything
outside this workspace, and don't design its API as if external consumers see it.

All four published packages bundle `@jsonresume-tools/core` into their output (tsup
`noExternal`), and core's config module imports `cosmiconfig` at the top level. That's why
`cosmiconfig` is a direct runtime dependency of all four — but `jsonresume-tailor` never calls
`loadConfig`. Its presence in `jsonresume-tailor`'s `package.json` is a bundling artifact, not an
unfinished config feature; don't remove it expecting the package to still load (it'd break the
import that survives into its bundle). `jsonresume-lint` and `jsonresume-parity` call `loadConfig`
for their full rule config; `jsonresume-execute` calls it too, but scoped to a single `theme`
setting for `jrx check`/`jrx all` — see `docs/reference/config.md`. All three read named sections
(`lint`/`parity`/`execute`) of one shared `.jsonresumetoolsrc` file via core's exported
`CONFIG_MODULE_NAME` constant and `loadConfig`'s `section` option — don't reintroduce a per-tool
moduleName/file for a new config-consuming feature.

`jsonresume-execute` is the one package allowed to know the others exist — but only by
detecting and spawning their CLIs at runtime (`packages/execute/src/resolve.ts`/`spawn.ts`),
never by importing them or listing them as a dependency. `jsonresume-lint`/`-parity`/`-tailor`
must never depend on each other or on `jsonresume-execute`; if a change would introduce such a
dependency, stop and flag it rather than adding it.

## Commands

```bash
pnpm install
pnpm build       # tsc + tsup across all packages, topologically ordered
pnpm test        # vitest run, all packages
pnpm test:watch  # vitest watch mode
pnpm clean       # rm dist/*.tsbuildinfo across packages
```

Run `pnpm build && pnpm test` before considering any change done — CI runs both on Node 22.x
and 24.x and will block a release if either fails.

## Code conventions

- `tsconfig.base.json`: `strict: true`, `NodeNext` module/resolution, ES2022 target. Don't
  loosen strictness to silence an error — fix the type.
- Tests are colocated as `src/**/*.test.ts` next to the code they cover (vitest, see
  `vitest.config.ts`). New behavior needs a new test, not just a build that passes.
- Doc comments (`/** ... */`) appear on exported functions/types only to explain a
  non-obvious contract or rationale (see `packages/core/src/severity.ts` for the pattern) —
  not to restate what the signature already says. Don't add narrating comments inline.

## Changesets — required for any change to a published package

If you touch behavior in `jsonresume-lint`, `jsonresume-parity`, or `jsonresume-tailor`, add a
changeset in the same commit/PR. The interactive `pnpm changeset` wizard isn't practical for
an agent — write the file directly instead:

```
.changeset/<short-kebab-description>.md
---
"jsonresume-lint": patch
---

One-line summary — this becomes the CHANGELOG entry.
```

Bump types: `patch` (fix), `minor` (backwards-compatible feature), `major` (breaking change).
Only list the package(s) actually changed — changesets bumps a dependent package automatically
if it depends on `@jsonresume-tools/core` and core changed (`updateInternalDependencies: patch`
in `.changeset/config.json`). Changes with no effect on a published package's behavior (docs,
CI config, internal refactors, test-only changes) don't need one.

## Branching & PRs

- `main` is the only long-lived branch. Branch off it as `type/short-description` (e.g.
  `fix/lint-date-regex`), never commit or push directly to `main`.
- Open a PR into `main`. Don't merge it yourself — see guardrails below.
- Never push to or modify the `changeset-release/main` branch — it's owned by the release
  Action and gets force-regenerated on every push to `main`.

## Companion repo: jsonresume-tools-demo

[cdrobayna/jsonresume-tools-demo](https://github.com/cdrobayna/jsonresume-tools-demo) is a
public demo repo (marked as a GitHub template repository) that shows a real jsonresume-tools
setup end to end. Its GitHub name is `jsonresume-tools-demo` — the local clone directory
(`jsonresume-tools-example`) predates the rename and is stale; don't infer the repo name from the
local path. It's logically part of this project even though it lives in a separate repo — a
change here is incomplete if it leaves the demo inconsistent. Coupled surfaces:

- **Example persona/data** — `docs/examples/*.json` here must match the demo's
  `resume.en.json`/`resume.es.json`/`variants/*` (same persona, same structure). Never let them
  tell two different example stories.
- **Tool descriptions & positioning** — the demo README's "What each piece does" section and any
  tool ranking/ordering convention (see root `README.md`'s "Tools" table) must stay consistent
  with what's said there.
- **Version floors** — the demo's `package.json` `devDependencies` pin `^x.y.z` ranges; a
  published release that the demo's README relies on for documented behavior (e.g. a fix that
  changes observable output) needs its floor bumped there too.
- **Cross-links** — links from this repo's docs into the demo repo, and from the demo's README
  back into this repo's docs/reference pages, must stay valid through renames or moves on either
  side.
- **CLI usage/output snippets** — the demo README embeds real transcripts (`jrx doctor`, `jrx
  check` output). Not all of it carries equal drift risk — distinguish before touching it:
  - *Volatile, data-defined content* (exact semver numbers, absolute paths) drifts on every
    npm publish with zero reader value in being exact — elide it (e.g. `(x.y.z)` instead of a
    real version) rather than hardcoding a snapshot. `jrx doctor`'s version numbers
    (`packages/execute/src/commands/doctor.ts`) are the clearest example.
  - *Stable, code-defined content* (step labels, command names — e.g. `jrx check`'s `'lint
    (masters)'`, `'tailor check (en)'` in `packages/execute/src/commands/check.ts`) only
    changes on a deliberate source edit. Safe to keep verbatim; a change here is exactly the
    kind of edit this section exists to catch, and should update the demo in the same pass.

Before finishing any task that touches one of the above: if a local clone of
`jsonresume-tools-example` is reachable, make the matching edit there too, as its own commit —
don't bundle it into this repo's PR. If it isn't reachable, don't guess — end your response with
the exact follow-up edits the user needs to make in that repo.

## Release pipeline — hard guardrails

`main` is wired to a live release pipeline (`.github/workflows/release.yml`, changesets/action)
that publishes real packages to npm. Treat every action below as **human-only**, regardless of
what tooling (`gh`, git push, etc.) is available to you:

- **Never run `npm publish` / `pnpm publish`** — the only publish path is the automated one,
  triggered by a human merging the "Version Packages" PR.
- **Never merge a PR** — not a feature PR, and especially not the auto-generated "Version
  Packages" PR. Merging that specific PR publishes to npm immediately.
- **Never approve a PR** on the user's behalf.
- **Never push directly to `main`.**
- **Never hand-edit** a package's `version` field or `CHANGELOG.md` — both are generated by
  `changeset version` and would conflict with the automation.

If a task seems to require any of the above (e.g. "ship this"), stop and hand it back to the
user with what's ready to merge — don't complete the loop yourself.
