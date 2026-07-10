---
"jsonresume-lint": minor
"jsonresume-parity": minor
"jsonresume-tailor": minor
---

Add a `--version`/`-V` flag to all three CLIs, printing the installed package's real version.

Also hoists shared CLI plumbing that `jsonresume-tailor` previously kept private into
`@jsonresume-tools/core`: `parseFlags` (the verb-style flag parser, sibling to `parseArgs`),
`extractLocale`/`LOCALE_RE` (the `<file>.<locale>.json` suffix parser, now also used by
`jsonresume-parity`'s locale resolution instead of a duplicate copy), and the `CommandResult`
type. Purely internal — no behavior change beyond `--version`.
