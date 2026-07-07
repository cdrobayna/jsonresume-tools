/** Resume sections that carry startDate/endDate, checked by dateFormat/dateOrder/chronology. */
export const DATE_SECTIONS = ['work', 'education', 'projects', 'volunteer', 'awards', 'certificates', 'publications']

export const DATE_RE = /^\d{4}(-\d{2}(-\d{2})?)?$/

/** Pads a partial ISO date (`YYYY` or `YYYY-MM`) to `YYYY-MM-DD` so two dates can be string-compared. */
export function padDate(d: string): string {
  const parts = d.split('-')
  while (parts.length < 3) parts.push('01')
  return parts.join('-')
}

export function isUrl(s: unknown): boolean {
  if (typeof s !== 'string' || s.length === 0) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
