import { emit, type Result, type RuleSeverities } from '@jsonresume-tools/core'

const PLACEHOLDER_RE = /\b(TODO|FIXME|TBD|XXX|PLACEHOLDER)\b/i

/**
 * Checks every string in the document for leftover placeholder markers (TODO, FIXME, TBD,
 * XXX, PLACEHOLDER). Per-file, unlike jsonresume-parity's checks — this rule moved out of the
 * parity walk during the split, since it doesn't depend on comparing two locales.
 */
export function checkPlaceholder(resume: unknown, ctx: { result: Result; rules: RuleSeverities }): void {
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`))
    } else if (node !== null && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, `${path}.${k}`)
    } else if (typeof node === 'string' && PLACEHOLDER_RE.test(node)) {
      emit(ctx.result, ctx.rules, 'placeholder', 'PLACEHOLDER', path, `placeholder found: "${node}"`)
    }
  }
  walk(resume, '$')
}
