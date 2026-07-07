import { emit, type Result, type RuleSeverities } from '@jsonresume-tools/core'
import { DATE_RE, DATE_SECTIONS } from '../util.js'

/** Checks startDate/endDate in every date-bearing section are ISO 8601 (`YYYY`, `YYYY-MM`, or `YYYY-MM-DD`). */
export function checkDateFormat(resume: unknown, ctx: { result: Result; rules: RuleSeverities }): void {
  const data = resume as Record<string, unknown> | null | undefined

  for (const section of DATE_SECTIONS) {
    const entries = data?.[section]
    if (!Array.isArray(entries)) continue

    entries.forEach((entry: Record<string, unknown>, i: number) => {
      const path = `$.${section}[${i}]`
      const start = entry?.startDate
      const end = entry?.endDate

      if (typeof start === 'string' && !DATE_RE.test(start)) {
        emit(
          ctx.result,
          ctx.rules,
          'dateFormat',
          'DATE_FORMAT',
          `${path}.startDate`,
          `bad date format "${start}" (expected YYYY, YYYY-MM, or YYYY-MM-DD)`
        )
      }
      if (typeof end === 'string' && !DATE_RE.test(end)) {
        emit(ctx.result, ctx.rules, 'dateFormat', 'DATE_FORMAT', `${path}.endDate`, `bad date format "${end}"`)
      }
    })
  }
}
