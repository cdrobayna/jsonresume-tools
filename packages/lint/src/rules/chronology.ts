import { emit, type Result, type RuleSeverities } from '@jsonresume-tools/core'
import { DATE_RE, padDate } from '../util.js'

const CHRONOLOGY_SECTIONS = ['work', 'education']

/** Checks that `work` and `education` entries are ordered reverse-chronologically by startDate. */
export function checkChronology(resume: unknown, ctx: { result: Result; rules: RuleSeverities }): void {
  const data = resume as Record<string, unknown> | null | undefined

  for (const section of CHRONOLOGY_SECTIONS) {
    const entries = data?.[section]
    if (!Array.isArray(entries)) continue

    for (let i = 1; i < entries.length; i++) {
      const prevEntry = entries[i - 1] as Record<string, unknown>
      const curEntry = entries[i] as Record<string, unknown>
      const prev = prevEntry?.startDate
      const cur = curEntry?.startDate

      if (typeof prev === 'string' && typeof cur === 'string' && DATE_RE.test(prev) && DATE_RE.test(cur)) {
        if (padDate(prev) < padDate(cur)) {
          const prevLabel = prevEntry.name ?? prevEntry.institution
          const curLabel = curEntry.name ?? curEntry.institution
          emit(
            ctx.result,
            ctx.rules,
            'chronology',
            'CHRONOLOGY',
            `$.${section}[${i}]`,
            `${section} entries should be in reverse chronological order — "${prevLabel}" (${prev}) comes before "${curLabel}" (${cur})`
          )
        }
      }
    }
  }
}
