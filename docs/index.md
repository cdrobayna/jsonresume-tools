---
layout: home

hero:
  name: jsonresume-tools
  text: Independent tools for JSON Resume
  tagline: Your resume stays synced across languages, adapts to every role, and checks itself. All with one CLI.
  actions:
    - theme: brand
      text: Getting started
      link: /guide/getting-started
    - theme: alt
      text: Watch it all work together
      link: /guide/full-workflow

features:
  - title: In sync
    details: Compares your resume across languages and flags anything out of date or missing a translation, before you notice.
    link: /reference/parity
  - title: Custom fit
    details: Tag each entry once, then generate as many role variants as you need, no hand-maintained copies required.
    link: /reference/tailor
  - title: Error-free
    details: "Per-file quality checks: dates, URLs, chronology, and leftover placeholders. Useful on any single JSON Resume."
    link: /reference/lint
  - title: All-in-one
    details: One command takes your annotated resume to a PDF ready to send, validated and exported with resume-cli.
    link: /reference/execute
---

## What is JSON Resume?

[JSON Resume](https://jsonresume.org) is an open-source, community schema for representing a
resume as a single JSON file instead of a proprietary document format. Once a resume is
JSON Resume-shaped, any compatible tool can read it: official themes render it to HTML/PDF, and
[`resume-cli`](https://github.com/jsonresume/jsonresume.org/tree/master/packages/cli) (the official CLI) validates, exports,
and serves it out of the box.

The four tools on this site connect with each other to cover the workflows the official tooling
doesn't solve: keeping a resume synced across languages, tailoring it per role from a single
source, and orchestrating all of that, including `resume-cli`, as the number of base resumes and
variants grows.

Don't have a JSON Resume yet? See the [schema reference](https://jsonresume.org/schema) to
write one by hand, or jump straight to [getting started](/guide/getting-started).

<!--
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
-->

## Why it exists

If you've ever kept a resume in more than one language, or tailored it for more than one job
search, you probably recognize the problem: every extra copy is one more chance for something to
go out of date, get mistranslated, or just break.

I started solving this with a personal script, after seeing that no project in the JSON Resume
ecosystem (resumed, hackmyresume, resume-cli, rendercv) covered it. Over time I generalized it
into the four tools in this repo.

Before, my workflow was manual from end to end: I'd update the resume in English, then copy the
change over to the Spanish one by hand, whenever I remembered to. If I was applying to a backend
role and a platform role, I kept separate copies with slightly different highlights, and fixed
each one on its own. Before exporting, I'd eyeball dates, URLs, and placeholders one by one, and
ran every step in the right order, every time.

Today that same workflow fits in one command: I write each entry once, tag it with the languages
and roles it belongs to, and the rest builds itself. It doesn't solve anything I couldn't do by
hand, it just automates what I was already doing. I decided to open-source it in case it saves
that same work for anyone else maintaining a bilingual resume or tailoring one across roles.
