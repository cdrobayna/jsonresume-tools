import { emit, type Result, type RuleSeverities } from '@jsonresume-tools/core'
import { isUrl } from '../util.js'

/** Checks every `.url` / `.canonical` string field in the document is a valid http(s) URL. */
export function checkUrls(resume: unknown, ctx: { result: Result; rules: RuleSeverities }): void {
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`))
    } else if (node !== null && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, `${path}.${k}`)
    } else if (typeof node === 'string' && (path.endsWith('.url') || path.endsWith('.canonical'))) {
      if (node.length > 0 && !isUrl(node)) {
        emit(ctx.result, ctx.rules, 'url', 'URL_INVALID', path, `invalid URL: "${node}"`)
      }
    }
  }
  walk(resume, '$')
}
