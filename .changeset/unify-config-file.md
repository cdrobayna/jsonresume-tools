---
"jsonresume-lint": minor
"jsonresume-parity": minor
---

`jrl`/`jrp` now read their config from one shared `.jsonresumetoolsrc` file per project
(moduleName `jsonresumetools`) instead of each having its own `.jsonresumelintrc`/
`jsonresumeparity.config.js`. Put each tool's settings under its own top-level key:

```json
{
  "lint": { "rules": { "schema": "error" } },
  "parity": { "lengthRatio": { "default": 2.5 } }
}
```

Omitting a tool's key entirely falls back to that tool's built-in defaults, same as an empty or
missing file did before. This is a breaking rename — old per-tool config files are no longer read
at all; move their contents under `"lint"`/`"parity"` in a `.jsonresumetoolsrc` file (or a
`"jsonresumetools"` key in `package.json`). See `docs/reference/config.md` for the full shape,
including `jrx`'s `"execute"` section.
