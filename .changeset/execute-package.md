---
"jsonresume-execute": minor
---

Add `jsonresume-execute` (`jrx`): a unified CLI that orchestrates `jsonresume-lint`,
`jsonresume-parity`, `jsonresume-tailor`, and `resume-cli` across languages and role variants —
without bundling them.

- `jrx build` — fans a single command out into the full `{role}.{lang}.json` variant matrix
  (one `jsonresume-tailor build --variants-dir` per detected language), replacing a
  per-language, per-tool script loop.
- `jrx check` — an aggregated QA gate: lint (with the `schema` rule enabled, subsuming
  `resume validate`), parity across master languages, `jsonresume-tailor check` per language,
  and (with `--theme`) `resume-cli`'s ATS `audit` — one report, one exit code.
- `jrx all` — `build` → `check` → `resume-cli` PDF/HTML export, one pipeline. Detects and
  injects the Chromium/Puppeteer env resume-cli's renderer needs.
- `jrx doctor` — reports which tools resolve, their versions, and an install command for
  anything missing.
- `jrx setup` — print-and-confirm install of the recommended toolchain
  (`jsonresume-lint jsonresume-parity jsonresume-tailor resume-cli`).
- `jrx run <tool> [-- <args>]` — npx-style passthrough to any resolvable tool.

`jsonresume-execute` does not depend on or bundle `jsonresume-lint`/`-parity`/`-tailor`/
`resume-cli` — it resolves each one from `node_modules/.bin` or `PATH` at runtime and reports a
clear, actionable error with an install command when one is missing. Keeps the independent
tools independent; `jrx` is purely an orchestration layer above them.
