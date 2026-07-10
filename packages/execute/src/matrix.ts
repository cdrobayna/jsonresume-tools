import { access, readdir } from 'node:fs/promises'
import path from 'node:path'
import { extractLocale } from '@jsonresume-tools/core'

export interface MasterFile {
  /** Locale extracted from the filename, or undefined for a bare `resume.json`. */
  lang: string | undefined
  path: string
}

/**
 * Auto-detects master resume files directly under `cwd`: a bare `resume.json`, and/or
 * `resume.<lang>.json` for every locale suffix present (e.g. `resume.en.json`,
 * `resume.es.json`) — the exact convention the CV repo already uses. Sorted for deterministic
 * output ordering.
 */
export async function discoverMasters(cwd: string): Promise<MasterFile[]> {
  let entries: string[]
  try {
    entries = await readdir(cwd)
  } catch {
    return []
  }

  const masters: MasterFile[] = []
  for (const name of entries.sort()) {
    if (name === 'resume.json') {
      masters.push({ lang: undefined, path: path.join(cwd, name) })
    } else if (/^resume\.[A-Za-z]{2,3}(-[A-Za-z]{2,4})?\.json$/.test(name)) {
      masters.push({ lang: extractLocale(name), path: path.join(cwd, name) })
    }
  }
  return masters
}

/**
 * Resolves which variants directory to use for a given language from `--variants-dir`
 * overrides (bare `<dir>` applies to every language; `<lang>=<dir>` scopes to one language —
 * the last matching override wins), falling back to `<defaultDir>/<lang>` if that directory
 * exists on disk, and finally to the flat `<defaultDir>`.
 */
export async function resolveVariantsDir(
  lang: string | undefined,
  overrides: string[],
  cwd: string,
  defaultDir = 'variants'
): Promise<string> {
  let bare: string | undefined
  for (const raw of overrides) {
    const eq = raw.indexOf('=')
    if (eq > 0) {
      const [l, d] = [raw.slice(0, eq), raw.slice(eq + 1)]
      if (l === lang) return d
    } else {
      bare = raw
    }
  }
  if (bare) return bare

  if (lang) {
    const perLang = path.join(defaultDir, lang)
    try {
      await access(path.join(cwd, perLang))
      return perLang
    } catch {
      // no per-language variants dir — fall through to the flat default
    }
  }
  return defaultDir
}

/**
 * Lists the already-built `{role}.{lang}.json` matrix files under `outDir` (relative to `cwd`,
 * or used as-is if already absolute — `path.resolve` (not `path.join`) is required here so an
 * absolute `outDir` isn't wrongly nested under `cwd`). Returns `[]` if the directory doesn't
 * exist yet (e.g. `jrx build` hasn't run).
 */
export async function discoverMatrixFiles(cwd: string, outDir: string): Promise<string[]> {
  try {
    const names = await readdir(path.resolve(cwd, outDir))
    return names.filter((n) => n.endsWith('.json')).map((n) => path.join(outDir, n))
  } catch {
    return []
  }
}
