---
"jsonresume-tailor": patch
---

`tailor-variant.schema.json`'s `$id` now points at
`https://cdrobayna.github.io/jsonresume-tools/schemas/tailor-variant.schema.json` instead of a
`raw.githubusercontent.com` blob URL, and the README's example `$schema` value matches. GitHub
Pages serves the file with a correct `application/json` content-type; `raw.githubusercontent.com`
deliberately forces `text/plain` (plus `nosniff`) on raw content, which some editors' JSON schema
resolvers don't handle well. The schema is now published to `docs/public/schemas/` as part of the
docs site build, always mirroring the copy in this package. No change to the schema's shape or to
CLI validation behavior.
