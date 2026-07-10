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
      text: View on GitHub
      link: https://github.com/cdrobayna/jsonresume-tools

features:
  - title: Parity
    details: The gap nothing else in the JSON Resume ecosystem fills — structural and content parity across locale variants of a resume, so resume.en.json and resume.es.json never silently drift apart.
    link: /reference/parity
  - title: Tailor
    details: Generate role-tailored variants (backend, platform, ...) from one annotated master resume — no more hand-maintained resume.backend.json copies.
    link: /reference/tailor
  - title: Lint
    details: Per-file quality checks — dates, URLs, chronology, leftover placeholders. Useful on any single JSON Resume.
    link: /reference/lint
  - title: Execute
    details: The unified CLI that orchestrates the three tools above — builds the full role x language matrix, validates it, and drives resume-cli itself (detects it, tells you what's missing, exports PDF/HTML) in one command.
    link: /reference/execute
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

## See it in action

One entry, annotated once in the master resume:

```json
{
  "name": "Solstice Retail",
  "position": "Backend & Platform Engineer",
  "highlights": [
    "Built the checkout service that absorbed the company's Black Friday peak traffic.",
    "Introduced blue-green deploys, eliminating checkout downtime during releases.",
    "Wrote the on-call runbooks the infrastructure team still uses today."
  ],
  "meta": {
    "tailor": {
      "tags": ["backend", "platform"],
      "highlightTags": { "backend": [0, 1], "platform": [1, 2] }
    }
  }
}
```

One `jrx build --out-dir dist` later, this same entry survives into both role-tailored outputs —
with a different pair of highlights surfaced in each:

**`backend.en.json`**
- Built the checkout service that absorbed the company's Black Friday peak traffic.
- Introduced blue-green deploys, eliminating checkout downtime during releases.

**`platform.en.json`**
- Introduced blue-green deploys, eliminating checkout downtime during releases.
- Wrote the on-call runbooks the infrastructure team still uses today.

Every other section (`work`, `skills`, `education`, ...) gets the same tag-based filtering, and
`jsonresume-parity` is checking the whole thing stays in sync with the Spanish translation the
whole time. Nothing above is a mockup — it's real output from `docs/examples/` in this repo. See
the [full workflow tutorial](/guide/full-workflow) to run it yourself.

## Origin

This collection started as a single-purpose validator maintained in a personal, bilingual (EN/ES)
CV repo. No existing tool in the JSON Resume ecosystem (resumed, hackmyresume, resume-cli,
rendercv) checks multi-locale parity — `jsonresume-parity` fills that gap. `jsonresume-lint` split
out the per-file checks that don't depend on comparing two locales. `jsonresume-tailor`
generalizes a separate ad hoc script from that same CV repo into a reusable tool for generating
role-specific resume variants. `jsonresume-execute` ties all three together for workflows that
need more than one at a time.
