# jsonresume-execute

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

`jrx` — a unified CLI that orchestrates [`jsonresume-lint`](../lint), [`jsonresume-parity`](../parity),
[`jsonresume-tailor`](../tailor), and [`resume-cli`](https://github.com/jsonresume/jsonresume.org)
across languages and role variants, for workflows that need more than one of them at a time (e.g.
tailoring a resume in more than one language, which otherwise means one `jsonresume-tailor build`
per language by hand).

`jrx` does **not** bundle or depend on these tools — it detects each one from `node_modules/.bin`
or `PATH` at runtime and shells out to it. If a command needs a tool that isn't installed, `jrx`
reports exactly which package is missing and how to install it, rather than silently failing.
`jsonresume-lint`/`-parity`/`-tailor` have no knowledge of `jrx` and work identically with or
without it installed.

## Install

```bash
npm install --save-dev jsonresume-execute
# then install whichever of the orchestrated tools you need, e.g.:
npx jrx setup
```

## Master/variant conventions

`jrx build`/`check`/`all` auto-detect master resume files in the current directory: a bare
`resume.json`, or `resume.<lang>.json` per language present (e.g. `resume.en.json`,
`resume.es.json` — the same convention `jsonresume-parity` uses). For each language, the variants
directory defaults to `variants/<lang>` if that directory exists, falling back to a flat
`variants/`. Override either with `--masters`/`--variants-dir`, or scope a variants dir to one
language with `<lang>=<dir>`.

## CLI

```bash
# Generate the full {role}.{lang}.json matrix from every detected master
jrx build --out-dir dist

# Run every validator (lint, parity, tailor check) across masters + the built matrix
jrx check

# ...plus resume-cli's ATS audit
jrx check --theme operations-precision

# build -> check -> resume-cli PDF/HTML export, one pipeline
jrx all --theme operations-precision --format pdf

# Show which tools are installed, their versions, and install hints for what's missing
jrx doctor

# Print-and-confirm install of the recommended toolchain
jrx setup
jrx setup --dry-run    # print the install command without running it
jrx setup --yes        # skip the confirmation prompt
jrx setup --global     # install globally (-g) instead of as a dev dependency

# npx-style passthrough to any resolvable tool
jrx run tailor -- list
jrx run resume -- validate --resume resume.en.json
```

Exit codes follow the same convention every jsonresume-tools CLI uses: `0` clean, `1`
findings/validation failure, `2` misuse (including a missing required tool). `jrx check`/`all`
aggregate multiple tools' exit codes — the overall code is the worst among the steps that ran
(skipped steps, like `audit` with no `--theme`, don't count).

## Why not bundle the tools?

The tools this repo ships (`jsonresume-lint`, `jsonresume-parity`, `jsonresume-tailor`) are
deliberately small, single-purpose, and independent of one another — that's the point of having
three separate packages instead of one. `jrx` exists for the workflows that compose them without
compromising that: it's an orchestration layer that sits *above* the tools, never a dependency
*of* them.

## Programmatic API

The building blocks — tool resolution, package-manager detection, master/variant discovery,
Chromium detection, spawn helpers, and report aggregation — are exported for reuse:

```ts
import { resolveTool, requireTool, discoverMasters, discoverMatrixFiles, aggregate, formatReport } from 'jsonresume-execute'

const tailor = requireTool('tailor') // throws with an install hint if not found
const masters = await discoverMasters(process.cwd())
```

See `src/index.ts` for the full list.

## License

MIT
