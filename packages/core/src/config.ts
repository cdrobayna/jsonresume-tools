import { cosmiconfig } from 'cosmiconfig'

export interface LoadConfigOptions<T> {
  /** Base name used to derive config filenames (e.g. `jsonresumeparity` -> `.jsonresumeparityrc`, `jsonresumeparity.config.js`, a `jsonresumeparity` key in package.json). */
  moduleName: string
  /** Explicit config path (CLI `-c`/`--config`). When set, this file is loaded directly and a missing file is a hard error. */
  explicitPath?: string
  /** Directory to start auto-discovery search from when `explicitPath` is not set. Defaults to `process.cwd()`. */
  searchFrom?: string
  defaults: T
  /** Override the merge strategy. Defaults to a one-level-deep merge (good enough for `{ rules: {...}, ... }` shaped configs). */
  merge?: (defaults: T, loaded: Partial<T>) => T
}

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
 * package.json) and falls back to `defaults` when nothing is found.
 */
export async function loadConfig<T extends Record<string, unknown>>(options: LoadConfigOptions<T>): Promise<T> {
  const explorer = cosmiconfig(options.moduleName)
  const result = options.explicitPath
    ? await explorer.load(options.explicitPath)
    : await explorer.search(options.searchFrom)

  if (!result || result.isEmpty) return options.defaults

  const merge = options.merge ?? defaultMerge
  return merge(options.defaults, result.config as Partial<T>)
}
