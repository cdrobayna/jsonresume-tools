import type { Finding, Result } from './findings.js'

export type Format = 'text' | 'json'

/**
 * Renders a `Result` as grouped, human-readable text: findings bucketed by
 * error/warning then by code, each with its path and message, followed by a summary line.
 * Ported from the legacy validator's `report()`, but returns a string instead of calling
 * `console.log` directly so it can be tested and composed by callers (e.g. per-file labeling).
 */
export function reportText(result: Result, opts?: { label?: string }): string {
  const lines: string[] = []

  const groups = new Map<string, Finding[]>()
  for (const bucket of ['error', 'warning'] as const) {
    const source = bucket === 'error' ? result.errors : result.warnings
    for (const item of source) {
      const key = `${bucket}:${item.code}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
  }

  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))

  for (const [key, items] of sorted) {
    const [bucket, code] = key.split(':')
    const label = bucket === 'error' ? '❌ ERROR' : '⚠️  WARN '
    lines.push(`${label} [${code}] (${items.length})`)
    for (const item of items) {
      lines.push(`  · ${item.path}`)
      lines.push(`      ${item.message}`)
    }
  }

  lines.push(`Summary: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`)

  const body = lines.join('\n')
  return opts?.label ? `${opts.label}\n${body}` : body
}

export function reportJson(result: Result): string {
  return JSON.stringify(result, null, 2)
}

export function report(result: Result, format: Format, opts?: { label?: string }): string {
  return format === 'json' ? reportJson(result) : reportText(result, opts)
}
