---
title: Getting started
description: Install only what you need and run your first check.
---

# Getting started

Every tool in this repo is independent and separately installable — install only what you need,
ignore the rest. If you're not sure which one that is, see
[which tool do I need?](/guide/which-tool).

## Install only what you need

```bash
npm install --save-dev jsonresume-lint      # jrl — per-file quality checks
npm install --save-dev jsonresume-parity    # jrp — multi-locale parity
npm install --save-dev jsonresume-tailor    # jrt — role-tailored variants
npm install --save-dev jsonresume-execute   # jrx — orchestrates all three
```

`jsonresume-execute` (`jrx`) is the one exception to "independent, no dependency on each other":
it's a thin orchestration layer that *detects* the other tools (and `resume-cli`) at runtime and
shells out to whichever are installed. It doesn't bundle or depend on them, and they have zero
knowledge of it — skip it if you only ever need one tool at a time. If you do install it, run
`jrx doctor` to see which orchestrated tools it can already find and `jrx setup` to install the
rest:

```bash
npx jrx doctor
```

```
✓ jsonresume-lint (0.1.1) — path — node_modules/.bin/jsonresume-lint
✓ jsonresume-parity (0.1.1) — path — node_modules/.bin/jsonresume-parity
✓ jsonresume-tailor (0.1.1) — path — node_modules/.bin/jsonresume-tailor
✗ resume-cli — not found (Official JSON Resume CLI (validate/export/audit))
    install: pnpm add -D resume-cli

✗ Chromium/Chrome — not found (needed by `resume export`/`resume audit`)
    install: your OS package manager, or set PUPPETEER_EXECUTABLE_PATH

1 tool(s) missing. Run "jrx setup" to install them.
```

## Your first resume.json

If you don't already have one, start from the [JSON Resume schema](https://jsonresume.org) — a
minimal file looks like:

```json
{
  "basics": {
    "name": "Your Name",
    "email": "you@example.com",
    "summary": "A short summary of what you do."
  },
  "work": [
    {
      "name": "Company",
      "position": "Your Title",
      "startDate": "2023-01",
      "highlights": ["What you shipped or owned."]
    }
  ]
}
```

## Run your first check

```bash
npx jsonresume-lint resume.json
```

A clean resume prints a summary with zero errors and warnings:

```
resume.json
Summary: 0 error(s), 0 warning(s)
```

Exit codes follow the same convention across every tool in this repo: `0` clean, `1`
findings/validation failure, `2` misuse (bad arguments, missing file, or — for `jrx` — a missing
required tool). Warnings alone never fail the run.

## Next steps

- Maintaining a resume in more than one language? See [which tool do I need?](/guide/which-tool)
  for `jsonresume-parity`.
- Want role-tailored variants (backend, platform, ...) from a single master resume, across
  languages, in one command? Walk through the [full workflow tutorial](/guide/full-workflow).
