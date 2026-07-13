---
title: Config discovery
description: Shared cosmiconfig-based config discovery — which tools use it and which don't.
---

# Config discovery

**Applies to:** [`jrl`](/reference/lint) (jsonresume-lint), [`jrp`](/reference/parity)
(jsonresume-parity) — full rule config — and [`jrx`](/reference/execute) (jsonresume-execute) —
`theme` only. `jrt` doesn't use a config file at all — see [below](#jrt-doesn-t-use-this).

`jrl`, `jrp`, and `jrx` all resolve their configuration through the same internal helper
(`@jsonresume-tools/core`'s `loadConfig`, a thin wrapper over
[cosmiconfig](https://github.com/cosmiconfig/cosmiconfig)), so it's documented once here instead
of three times. The shape each tool loads differs — `jrl`/`jrp` load a `{ rules: {...}, ... }`
object, `jrx` loads just `{ theme }` — but the discovery order and merge behavior below are
identical across all three.

## Discovery order

1. **`-c <path>` / `--config <path>`** — loads that file directly. If it doesn't exist, this is a
   hard error (explicit means explicit).
2. Otherwise, cosmiconfig auto-discovers upward from the current directory, in this order, for
   the first match:
   - a `"<moduleName>"` key in the nearest `package.json`
   - `.<moduleName>rc` (JSON or YAML)
   - `.<moduleName>rc.json` / `.yaml` / `.yml`
   - `<moduleName>.config.js` / `.cjs` / `.mjs` / `.ts`
3. If nothing is found, the tool's built-in defaults apply — no config file is required to use
   any of the three.

`<moduleName>` is `jsonresumelint` for `jrl`, `jsonresumeparity` for `jrp`, and
`jsonresumeexecute` for `jrx`.

## Merge behavior

Whatever cosmiconfig finds is merged **one level deep** over the tool's built-in defaults — you
only need to specify the keys you're overriding, not repeat the whole default object. For a
`{ rules: {...} }`-shaped config, that means each individual rule you set replaces just that rule;
every rule you don't mention keeps its default severity. `jrx`'s config has only one key
(`theme`), so this just means: set it or don't, there's nothing to merge underneath it.

## Examples

`.jsonresumelintrc.json` — turn on strict schema validation, downgrade chronology to `off`:

```json
{
  "rules": {
    "schema": "error",
    "chronology": "off"
  }
}
```

`jsonresumeparity.config.js` — widen the acceptable EN→JA length ratio and add a custom identity
field:

```js
export default {
  lengthRatio: { default: 2.5, 'en:ja': 0.7 },
  identityFields: ['startDate', 'endDate', 'url', 'email', 'phone', 'customTrackingId']
}
```

`.jsonresumeexecuterc.json` — set a default theme for `jrx check`/`jrx all`, so `--theme` doesn't
need to be passed on every invocation:

```json
{
  "theme": "operations-precision"
}
```

All three tools also accept a one-off override without touching a config file:

```bash
jrl --rule schema=error resume.json
jrp --rule lengthRatio=off resume.en.json resume.es.json
jrx check --theme operations-precision
```

See [`/reference/lint`](/reference/lint#rules-and-defaults) and
[`/reference/parity`](/reference/parity#rules-and-defaults) for each tool's full rule list and
defaults.

`jrx`'s config is scoped to `theme` only — every other behavior (which masters to build, which
variants directory to use, output location, export format) stays CLI-flags-only, deliberately not
config-file-driven. See [`/reference/execute`](/reference/execute).

## `jrt` doesn't use this

**`jrt` (jsonresume-tailor)** has no config file mechanism. Its behavior is driven entirely by
the variant JSON files you pass via `--variant-file`/`--variants-dir` (or the `variants/`
default) — see [`/reference/tailor`](/reference/tailor).
