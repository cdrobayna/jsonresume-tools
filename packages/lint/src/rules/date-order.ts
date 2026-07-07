import { emit, type Result, type RuleSeverities } from '@jsonresume-tools/core'
import { DATE_RE, DATE_SECTIONS, padDate } from '../util.js'

/** Checks that `endDate` never precedes `startDate` within an entry. */
export function checkDateOrder(resume: unknown, ctx: { result: Result; rules: RuleSeverities }): void {
  const data = resume as Record<string, unknown> | null | undefined

  for (const section of DATE_SECTIONS) {
    const entries = data?.[section]
    if (!Array.isArray(entries)) continue

    entries.forEach((entry: Record<string, unknown>, i: number) => {
      const start = entry?.startDate
      const end = entry?.endDate

      if (typeof start === 'string' && typeof end === 'string' && DATE_RE.test(start) && DATE_RE.test(end)) {
        if (padDate(end) < padDate(start)) {
          emit(
            ctx.result,
            ctx.rules,
            'dateOrder',
            'DATE_ORDER',
            `$.${section}[${i}]`,
            `endDate (${end}) precedes startDate (${start})`
          )
        }
      }
    })
  }
}
