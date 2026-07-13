---
title: Config discovery
description: Shared cosmiconfig-based config discovery, one file, one section per tool.
---

# Config discovery

**Applies to:** [`jrl`](/reference/lint) (jsonresume-lint), full rule config; [`jrp`](/reference/parity)
(jsonresume-parity), full rule config; and [`jrx`](/reference/execute) (jsonresume-execute),
`theme` only. `jrt` doesn't use a config file at all, see [below](#jrt-doesn-t-use-this).

`jrl`, `jrp`, and `jrx` all read from **one shared config file per project**. There's no separate
file per tool. Each tool reads its own top-level section out of it (`lint`, `parity`, `execute`),
through the same internal helper (`@jsonresume-tools/core`'s `loadConfig`, a thin wrapper over
[cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)), so it's documented once here instead
of three times.

## Discovery order

1. **`-c <path>` / `--config <path>`**: loads that file directly. If it doesn't exist, this is a
   hard error (explicit means explicit). The file still has to use the sectioned shape below;
   there's no separate "bare" format for explicitly-pointed-at files.
2. Otherwise, cosmiconfig auto-discovers upward from the current directory, in this order, for
   the first match:
   - a `"jsonresumetools"` key in the nearest `package.json`
   - `.jsonresumetoolsrc` (JSON or YAML)
   - `.jsonresumetoolsrc.json` / `.yaml` / `.yml`
   - `jsonresumetools.config.js` / `.cjs` / `.mjs` / `.ts`
3. If nothing is found, the tool's built-in defaults apply. No config file is required to use
   any of the three.

## Shape: one section per tool

The loaded file (or `package.json` key) is a single object with one top-level key per tool:

```json
{
  "lint": { "rules": { "schema": "error" } },
  "parity": { "lengthRatio": { "default": 2.5 } },
  "execute": { "theme": "operations-precision" }
}
```

Each tool only ever reads its own section (`jrl` reads `lint`, `jrp` reads `parity`, `jrx` reads
`execute`) and ignores the others. You can keep all three sections in the same file even if
you're only using one or two of the tools.

**Omitting a section entirely falls back to that tool's built-in defaults**, exactly like an empty
or missing file would. You only need to add a section (or keys within it) for what you're
overriding. This applies even to an explicit `-c`/`--config` file: if you point `jrl` at a file
that has a `parity` section but no `lint` section, `jrl` silently uses its defaults rather than
erroring. There's nothing wrong with a file not mentioning a given tool.

## Merge behavior

Within a section, whatever cosmiconfig finds is merged **one level deep** over that tool's
built-in defaults. You only need to specify the keys you're overriding, not repeat the whole
default object. For `lint`/`parity`'s `{ rules: {...} }`-shaped sections, that means each
individual rule you set replaces just that rule; every rule you don't mention keeps its default
severity. `execute`'s section has only one key (`theme`), so this just means: set it or don't,
there's nothing to merge underneath it.

## Examples

`.jsonresumetoolsrc.json`: turn on strict schema validation for `jrl`, widen `jrp`'s acceptable
EN→JA length ratio, and set a default theme for `jrx check`/`jrx all`:

```json
{
  "lint": {
    "rules": {
      "schema": "error",
      "chronology": "off"
    }
  },
  "parity": {
    "lengthRatio": { "default": 2.5, "en:ja": 0.7 },
    "identityFields": ["startDate", "endDate", "url", "email", "phone", "customTrackingId"]
  },
  "execute": {
    "theme": "operations-precision"
  }
}
```

`jsonresumetools.config.js` works the same way with a JS default export:

```js
export default {
  lint: { rules: { schema: 'error' } },
  execute: { theme: 'operations-precision' }
}
```

All three tools also accept a one-off override without touching a config file:

```bash
npx jrl --rule schema=error resume.json
npx jrp --rule lengthRatio=off resume.en.json resume.es.json
npx jrx check --theme operations-precision
```

See [`/reference/lint`](/reference/lint#rules-and-defaults) and
[`/reference/parity`](/reference/parity#rules-and-defaults) for each tool's full rule list and
defaults.

`jrx`'s section is scoped to `theme` only. Every other behavior (which base resumes to build,
which variants directory to use, output location, export format) stays CLI-flags-only,
deliberately not config-file-driven. See [`/reference/execute`](/reference/execute).

## `jrt` doesn't use this

**`jrt` (jsonresume-tailor)** has no config file mechanism. Its behavior is driven entirely by
the variant JSON files you pass via `--variant-file`/`--variants-dir` (or the `variants/`
default). See [`/reference/tailor`](/reference/tailor).
