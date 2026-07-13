---
"jsonresume-execute": minor
---

`jrx check`/`jrx all` can read a default `--theme` from a cosmiconfig-discovered config file
(`.jsonresumeexecuterc`, `jsonresumeexecute.config.js`, or a `"jsonresumeexecute"` key in
`package.json`), the same discovery `jrl`/`jrp` already use for their rules. Pass `-c <path>` for
an explicit file, or keep passing `--theme` per invocation — the flag always wins over the config
file. This is the only setting `jrx` reads from a config file; everything else stays
CLI-flags-only.
