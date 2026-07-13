---
"jsonresume-execute": minor
---

`jrx check`/`jrx all` can read a default `--theme` from a `.jsonresumetoolsrc` config file (or a
`"jsonresumetools"` key in `package.json`), under an `"execute"` section:

```json
{
  "execute": { "theme": "operations-precision" }
}
```

This is the same shared config file `jrl`/`jrp` read their own settings from (see
`docs/reference/config.md`) — `execute` is just one section of it. Pass `-c <path>` for an
explicit file, or keep passing `--theme` per invocation — the flag always wins over the config
file. `theme` is still the only setting `jrx` reads from a config file; everything else stays
CLI-flags-only.
