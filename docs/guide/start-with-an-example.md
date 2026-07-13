---
title: Start with an example
description: New to JSON Resume? Clone a complete, working setup and go from there.
---

# Start with an example

[JSON Resume](https://jsonresume.org) is an open, portable schema for representing a resume as a
single JSON file instead of a proprietary document format. Write it once, and any compatible tool
(official themes, `resume-cli`, and the four tools in this suite) can read it. If that's new to
you, the fastest way in isn't reading a spec: it's seeing a real one.

[`jsonresume-tools-demo`](https://github.com/cdrobayna/jsonresume-tools-demo) is a public,
complete example: one annotated base resume, maintained in two languages, tailored into two
role-specific variants. That's four files, generated and validated from a single source, with CI
checking it stays that way on every push. It's built with all four tools in this suite, wired
together the way a real setup would use them.

## Two ways to use it

### Explore it

```bash
git clone https://github.com/cdrobayna/jsonresume-tools-demo.git
cd jsonresume-tools-demo
```

Follow the repo's own README from there: two commands take you from a fresh clone to a
validated, role-tailored resume matrix. No JSON Resume of your own required yet.

### Start your own

[Use this template](https://github.com/new?template_name=jsonresume-tools-demo&template_owner=cdrobayna)
to create your own repository from it, then replace the example's resume and variant files with
your own information. You inherit the project structure, the CI check, and a working setup.
Nothing to configure from scratch.

## Next

Once you're ready to understand *how* the annotations behind tailoring work (tagging entries,
declaring variants, building the matrix by hand), walk through the
[full workflow tutorial](/guide/full-workflow).
