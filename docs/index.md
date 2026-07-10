---
layout: home

hero:
  name: jsonresume-tools
  text: Independent tools for JSON Resume
  tagline: Multi-locale parity checks, per-file quality linting, role-tailored variants, and jrx — a CLI to orchestrate them all.
  actions:
    - theme: brand
      text: Try it in 30 seconds
      link: '#try-it-in-30-seconds'
    - theme: alt
      text: Getting started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/cdrobayna/jsonresume-tools

features:
  - title: jsonresume-lint — jrl
    details: Per-file quality checks — date format and ordering, chronology, URLs, email, leftover placeholders, optional schema validation.
    link: /reference/lint
  - title: jsonresume-parity — jrp
    details: Structural and content parity across locale variants of a resume, e.g. resume.en.json vs resume.es.json.
    link: /reference/parity
  - title: jsonresume-tailor — jrt
    details: Generate role-tailored variants (backend, platform, ...) from one annotated master resume.
    link: /reference/tailor
  - title: jsonresume-execute — jrx
    details: Orchestrates the tools above (plus resume-cli) across languages and role variants in one command.
    link: /reference/execute
---

## Try it in 30 seconds

No JSON Resume of your own yet? Grab this repo's "everything wrong with it" test fixture and lint
it — no install, no setup:

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
