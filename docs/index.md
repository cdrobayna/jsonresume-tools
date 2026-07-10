---
layout: home

hero:
  name: jsonresume-tools
  text: Independent tools for JSON Resume
  tagline: Keep a resume in parity across languages, tailor it per role from one master, and orchestrate both — including resume-cli itself — with one CLI.
  actions:
    - theme: brand
      text: See the full workflow
      link: /guide/full-workflow
    - theme: alt
      text: Try it in 30 seconds
      link: '#try-it-in-30-seconds'
    - theme: alt
      text: View on GitHub
      link: https://github.com/cdrobayna/jsonresume-tools

features:
  - title: jsonresume-parity — jrp
    details: The gap nothing else in the JSON Resume ecosystem fills — structural and content parity across locale variants of a resume, so resume.en.json and resume.es.json never silently drift apart.
    link: /reference/parity
  - title: jsonresume-tailor — jrt
    details: Generate role-tailored variants (backend, platform, ...) from one annotated master resume — no more hand-maintained resume.backend.json copies.
    link: /reference/tailor
  - title: jsonresume-execute — jrx
    details: The unified CLI — builds the full role x language matrix, validates it, and drives resume-cli itself (detects it, tells you what's missing, exports PDF/HTML) in one command.
    link: /reference/execute
  - title: jsonresume-lint — jrl
    details: Per-file quality checks — dates, URLs, chronology, leftover placeholders. Useful on any single JSON Resume.
    link: /reference/lint
---

## What is JSON Resume?

[JSON Resume](https://jsonresume.org) is an open-source, community schema for representing a
résumé as a single JSON file instead of a proprietary document format. Once a resume is
JSON Resume-shaped, any compatible tool can read it: official themes render it to HTML/PDF, and
[`resume-cli`](https://github.com/jsonresume/jsonresume.org) (the official CLI) validates, exports,
and serves it out of the box.

The four tools on this site plug in on top, for the workflows the official tooling doesn't cover:
keeping a resume in sync across languages, tailoring it per role from a single master, and
orchestrating both — plus `resume-cli` itself — as the number of masters and variants grows.

Don't have a JSON Resume yet? See the [schema reference](https://jsonresume.org/schema.json) to
write one by hand, or jump straight to [getting started](/guide/getting-started).

## Try it in 30 seconds

Want to see one of these tools run before installing anything? Grab this repo's "everything
wrong with it" test fixture and lint it — no install, no setup:

```bash
curl -sO https://raw.githubusercontent.com/cdrobayna/jsonresume-tools/main/fixtures/bad.en.json
npx jsonresume-lint bad.en.json
```

You'll see real findings: an invalid email/URL shape, a swapped date range, and a leftover `TODO`.
Once you have your own `resume.json` (see [jsonresume.org](https://jsonresume.org) for the
schema), swap the filename — or `npm install --save-dev jsonresume-lint` in your own project
instead of using `npx` each time.

Ready for the full picture — one annotated resume producing role-tailored, bilingual output in
one command? See the [full workflow tutorial](/guide/full-workflow).

## Origin

This collection started as a single-purpose validator maintained in a personal, bilingual (EN/ES)
CV repo. No existing tool in the JSON Resume ecosystem (resumed, hackmyresume, resume-cli,
rendercv) checks multi-locale parity — `jsonresume-parity` fills that gap. `jsonresume-lint` split
out the per-file checks that don't depend on comparing two locales. `jsonresume-tailor`
generalizes a separate ad hoc script from that same CV repo into a reusable tool for generating
role-specific resume variants. `jsonresume-execute` ties all three together for workflows that
need more than one at a time.
