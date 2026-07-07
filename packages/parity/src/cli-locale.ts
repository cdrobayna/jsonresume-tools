import type { LocaleInput } from './index.js'

const FILENAME_LOCALE_RE = /\.([A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)\.json$/

/**
 * Resolves CLI file arguments into `LocaleInput`s. Each argument is either:
 * - `<locale>=<path>`, an explicit override (used when the filename doesn't encode the locale), or
 * - `<anything>.<locale>.json`, where the locale is inferred from the filename.
 */
export function resolveLocaleInputs(files: string[]): LocaleInput[] {
  return files.map((file) => {
    const eq = file.indexOf('=')
    if (eq > 0 && !file.slice(0, eq).includes('/') && !file.slice(0, eq).includes('\\')) {
      return { locale: file.slice(0, eq), path: file.slice(eq + 1) }
    }
    const match = FILENAME_LOCALE_RE.exec(file)
    if (!match) {
      throw new Error(`cannot infer locale from filename "${file}" — use the "<locale>=<path>" form instead`)
    }
    return { locale: match[1], path: file }
  })
}
