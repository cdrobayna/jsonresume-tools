import { cosmiconfig } from 'cosmiconfig'

export interface LoadConfigOptions<T> {
  /** Base name used to derive config filenames (e.g. `jsonresumetools` -> `.jsonresumetoolsrc`, `jsonresumetools.config.js`, a `jsonresumetools` key in package.json). */
  moduleName: string
  /** Top-level key to extract from the loaded config before merging (e.g. `'lint'` for a shared `{ lint: {...}, parity: {...} }` file). When omitted, the whole loaded object is used. A section that's absent (or an object with no matching key) falls back to `defaults`, same as an empty file. */
  section?: string
  /** Explicit config path (CLI `-c`/`--config`). When set, this file is loaded directly and a missing file is a hard error. `section` still applies to it — an explicit file must use the same shape as an auto-discovered one. */
  explicitPath?: string
  /** Directory to start auto-discovery search from when `explicitPath` is not set. Defaults to `process.cwd()`. */
  searchFrom?: string
  defaults: T
  /** Override the merge strategy. Defaults to a one-level-deep merge (good enough for `{ rules: {...}, ... }` shaped configs). */
  merge?: (defaults: T, loaded: Partial<T>) => T
}

/** Shared cosmiconfig moduleName for all `@jsonresume-tools/*` CLIs — one `.jsonresumetoolsrc` file per project, with a top-level section per tool. */
export const CONFIG_MODULE_NAME = 'jsonresumetools'

function defaultMerge<T extends Record<string, unknown>>(defaults: T, loaded: Partial<T>): T {
  const merged: Record<string, unknown> = { ...defaults }
  for (const [key, value] of Object.entries(loaded ?? {})) {
    const defaultValue = (defaults as Record<string, unknown>)[key]
    const bothPlainObjects =
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      defaultValue !== null &&
      typeof defaultValue === 'object' &&
      !Array.isArray(defaultValue)

    merged[key] = bothPlainObjects
      ? { ...(defaultValue as Record<string, unknown>), ...(value as Record<string, unknown>) }
      : value
  }
  return merged as T
}

/**
 * Loads config via cosmiconfig and merges it over `defaults`. With `explicitPath` set, loads
 * that file directly (missing file throws). Otherwise auto-discovers from `searchFrom`
 * (`.<moduleName>rc`, `<moduleName>.config.{js,mjs,json}`, or a `<moduleName>` key in
 * package.json) and falls back to `defaults` when nothing is found. When `section` is set, the
 * named top-level key is extracted from the loaded config before merging — an absent section
 * falls back to `defaults` just like an empty file would.
 */
export async function loadConfig<T extends Record<string, unknown>>(options: LoadConfigOptions<T>): Promise<T> {
  const explorer = cosmiconfig(options.moduleName)
  const result = options.explicitPath
    ? await explorer.load(options.explicitPath)
    : await explorer.search(options.searchFrom)

  if (!result || result.isEmpty) return options.defaults

  const loaded = options.section
    ? (result.config as Record<string, unknown> | null)?.[options.section]
    : result.config
  if (loaded === undefined) return options.defaults

  const merge = options.merge ?? defaultMerge
  return merge(options.defaults, loaded as Partial<T>)
}
