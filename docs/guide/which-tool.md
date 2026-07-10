---
title: Which tool do I need?
description: Decision guide — I have a resume, I want X.
---

# Which tool do I need?

You have a JSON Resume. What are you trying to do with it?

| I want to...                                                                    | Use                                        |
| -------------------------------------------------------------------------------- | ------------------------------------------- |
| Catch broken dates, bad URLs/email, leftover placeholders in **one** file       | [`jrl`](/reference/lint) — jsonresume-lint     |
| Keep `resume.en.json` and `resume.es.json` in sync with each other              | [`jrp`](/reference/parity) — jsonresume-parity |
| Generate a backend/platform/whatever-role variant from **one** master resume   | [`jrt`](/reference/tailor) — jsonresume-tailor |
| Do all of the above across every role **and** every language, in one command   | [`jrx`](/reference/execute) — jsonresume-execute |

## In more detail

### `jrl` — jsonresume-lint

Per-file checks that don't depend on comparing anything else: ISO date format, reverse
chronology, valid URLs/email, leftover `TODO`/`FIXME` markers, and optional strict schema
validation. Use it on every JSON Resume you have, even if you only maintain one file in one
language.

### `jrp` — jsonresume-parity

Structural and content parity across locale variants of the *same* resume — matching shape,
identical non-translatable fields (dates, URLs, emails, keywords), and translation-quality
heuristics (suspicious length ratios, strings that look untranslated). Only relevant once you
maintain more than one language of the same resume.

### `jrt` — jsonresume-tailor

Generates role-tailored variants from a single annotated master resume: tag `work`/`skills`/etc.
entries under `meta.tailor`, declare a variant per target role, and `jrt build <variant>` emits a
filtered, canonical JSON Resume — no trace of `tailor` left in it. Use it once you're tired of
manually maintaining separate `resume.backend.json` / `resume.devops.json` copies by hand.

### `jrx` — jsonresume-execute

An orchestration layer over the three tools above (plus `resume-cli`). Once you're tailoring a
resume for multiple roles **and** maintaining it in multiple languages, `jrx build` generates the
full `{role}.{lang}.json` matrix in one command instead of one `jrt build` invocation per
language, and `jrx check` runs every validator across masters and matrix in one pass. See the
[full workflow tutorial](/guide/full-workflow) for a worked example, end to end.
