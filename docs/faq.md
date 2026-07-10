---
title: FAQ
description: Why not resume-cli directly, exit codes, and common errors.
---

# FAQ

## Why not just use resume-cli / resumed / hackmyresume?

Those tools (and `rendercv`) validate and render a single JSON Resume, but none of them check
**multi-locale parity** — that a `resume.en.json` and `resume.es.json` actually stay structurally
and semantically in sync as both get edited over time. That gap is what `jsonresume-parity` fills.
`jsonresume-lint` split out the per-file checks (dates, URLs, chronology, placeholders) that don't
require a second locale to compare against, and `jsonresume-tailor` generalizes the common
"maintain one master, generate role-specific copies by hand" problem into a reusable tool.
`jsonresume-execute` doesn't replace any of them — it's a thin orchestration layer that detects
and shells out to whichever of these (and `resume-cli` itself, for rendering) are installed. None
of these tools depend on each other; use whichever one solves your actual problem.

## What do the exit codes mean?

Every CLI in this repo (`jrl`, `jrp`, `jrt`, `jrx`) follows the same convention:

| Code | Meaning |
| --- | --- |
| `0` | Clean — no errors (warnings alone never fail a run) |
| `1` | Findings/validation failure — at least one error-severity finding |
| `2` | Misuse — bad arguments, a missing file, or (for `jrx`) a required tool that isn't installed |

`jrx check`/`jrx all` aggregate multiple tools' exit codes — the overall code is the worst among
the steps that actually ran (a skipped step, like the ATS `audit` with no `--theme`, doesn't
count).

## Why is `jrl`'s `schema` rule off by default?

The official JSON Resume schema restricts several objects to a fixed set of known properties.
Documents with custom extension fields — this repo's own examples use a non-standard
`meta.tailor` and `meta.language`, for instance — can fail strict schema validation even though
they're perfectly valid for their own purposes. `schema` defaults to `off` for exactly that
reason; turn it on explicitly (`--rule schema=error` or via config, see
[`/reference/config`](/reference/config)) if you don't extend the schema with custom fields.

## What does it look like when `jrx` is missing a tool?

`jrx` never bundles or depends on the tools it orchestrates — it resolves each one from
`node_modules/.bin` or `PATH` at runtime. If a command needs one that isn't installed, it reports
exactly which package is missing and how to install it, rather than failing silently or partway
through:

```
jsonresume-execute: jsonresume-tailor not found (needed for "Role-tailored resume variants"). Install it with:
  pnpm add -D jsonresume-tailor
```

This exits with code `2` (misuse), the same as any other bad invocation. Run `jrx doctor` any
time to see the full picture of what's installed and what's missing before running a real
command.
