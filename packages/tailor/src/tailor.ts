import { stripTailorMeta } from './strip.js'
import type { JsonResume, ResumeEntry, TailorMeta, Variant } from './types/resume.js'

/** Sections that are filtered by `meta.tailor.tags`. Everything else (`basics`, `languages`,
 * `interests`, `references`, ...) passes through `tailor()` unfiltered. */
export const FILTERABLE_SECTIONS = [
  'work',
  'education',
  'skills',
  'projects',
  'awards',
  'certificates',
  'publications',
  'volunteer'
] as const

/** Array fields on resume entries that support per-tag index filtering via a corresponding
 * `*Tags` map in `meta.tailor`. Adding a new field here (+ the type in TailorMeta/ResumeEntry)
 * is all that's needed to support it in both `tailor()` and `checkTailor()`. */
export const TAGGABLE_FIELDS: ReadonlyArray<{
  field: keyof ResumeEntry & string
  metaKey: keyof TailorMeta & string
  label: string
  ruleName: string
  code: string
}> = [
  { field: 'highlights', metaKey: 'highlightTags', label: 'highlight', ruleName: 'tailorHighlightIndex', code: 'TAILOR_HIGHLIGHT_INDEX' },
  { field: 'keywords', metaKey: 'keywordTags', label: 'keyword', ruleName: 'tailorKeywordIndex', code: 'TAILOR_KEYWORD_INDEX' },
  { field: 'courses', metaKey: 'courseTags', label: 'course', ruleName: 'tailorCourseIndex', code: 'TAILOR_COURSE_INDEX' }
]

/** The section's target field for `meta.tailor.labelPerTag`, where one exists. */
const LABEL_FIELD_BY_SECTION: Record<string, 'name' | 'position'> = {
  skills: 'name',
  work: 'position',
  projects: 'name'
}

export interface TailorOptions {
  /** Suppresses the `onWarning` side-effect (default: `console.warn`). `summary.warnings`
   * still records every warning regardless — this only silences the side-effect. */
  quiet?: boolean
  /** Called once per warning, in generation order, unless `quiet` is set. */
  onWarning?: (message: string) => void
  /** Resume input path/label, used only to format the basics-override warning message. */
  input?: string
}

export interface TailorSectionSummary {
  before: number
  after: number
  arrayStats?: Record<string, { before: number; after: number }>
}

export interface TailorSummary {
  sections: Record<string, TailorSectionSummary>
  warnings: string[]
}

export interface TailorResult {
  resume: JsonResume
  summary: TailorSummary
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

function asEntries(value: unknown): ResumeEntry[] | undefined {
  return Array.isArray(value) ? (value as ResumeEntry[]) : undefined
}

function entryTags(entry: ResumeEntry): string[] | undefined {
  const tags = entry.meta?.tailor?.tags
  return Array.isArray(tags) ? tags : undefined
}

/** Unions `tagIndices["*"]` with `tagIndices[t]` for every active tag `t`, then filters `values`
 * down to those indices, preserving original order and de-duplicating. Out-of-range indices are
 * silently dropped (they never match any array position). A missing or empty `tagIndices` map is
 * a no-op — every value is kept. */
function filterByTagIndices<T>(
  values: T[] | undefined,
  tagIndices: Record<string, number[]> | undefined,
  activeTags: Set<string>
): T[] | undefined {
  if (!values || !tagIndices || Object.keys(tagIndices).length === 0) return values

  const keep = new Set<number>()
  for (const index of tagIndices['*'] ?? []) keep.add(index)
  for (const tag of activeTags) {
    for (const index of tagIndices[tag] ?? []) keep.add(index)
  }

  return values.filter((_, index) => keep.has(index))
}

/** Filters every taggable array field on `entry` per its corresponding `*Tags` map. */
function filterTaggableFields(entry: ResumeEntry, activeTags: Set<string>): void {
  for (const { field, metaKey } of TAGGABLE_FIELDS) {
    const values = entry[field]
    if (!Array.isArray(values)) continue
    const tagIndices = entry.meta?.tailor?.[metaKey] as Record<string, number[]> | undefined
    entry[field] = filterByTagIndices(values, tagIndices, activeTags)
  }
}

/** Applies the first `labelPerTag` match found in `[variant.tag, ...variant.also]` order — the
 * primary tag wins over secondaries. Silent no-op when the section has no mapped label field or
 * the entry declares no matching override. */
function applyLabelPerTag(entry: ResumeEntry, section: string, activeOrder: string[]): void {
  const labelPerTag = entry.meta?.tailor?.labelPerTag
  const field = LABEL_FIELD_BY_SECTION[section]
  if (!labelPerTag || !field) return

  for (const tag of activeOrder) {
    if (tag in labelPerTag) {
      entry[field] = labelPerTag[tag]
      return
    }
  }
}

/** Shallow-merges `variant.basics` onto `resume.basics`. A variant field overrides whenever it
 * is itself non-empty; it warns only when the field it overrides was also non-empty in the
 * master resume. Object/array fields (e.g. `location`, `profiles`) are replaced wholesale, not
 * deep-merged — the shallow merge already gives us that for free. */
function mergeBasics(
  resumeBasics: Record<string, unknown> | undefined,
  variantBasics: Record<string, unknown> | undefined,
  variantName: string,
  input: string | undefined,
  warnings: string[]
): Record<string, unknown> | undefined {
  if (!variantBasics) return resumeBasics

  const merged = { ...(resumeBasics ?? {}) }
  for (const [field, value] of Object.entries(variantBasics)) {
    if (isEmpty(value)) continue

    const hadValue = !isEmpty(merged[field])
    merged[field] = value

    if (hadValue) {
      const from = input ? ` from ${input}` : ''
      warnings.push(`[tailor] warn: overriding basics.${field}${from} with variant "${variantName}"`)
    }
  }
  return merged
}

/**
 * Filters a JSON Resume master document down to the entries that match `variant`'s active tags,
 * applying highlight/label overrides, `basics` overrides, section drop/reorder, and per-section
 * limits. Does not mutate `resume` — returns a filtered deep copy plus a summary of what changed.
 */
export function tailor(resume: JsonResume, variant: Variant, options: TailorOptions = {}): TailorResult {
  let out = structuredClone(resume) as JsonResume

  const activeOrder = [variant.tag, ...(variant.also ?? [])]
  const activeTags = new Set(activeOrder)

  const sections: Record<string, TailorSectionSummary> = {}
  const warnings: string[] = []

  for (const section of FILTERABLE_SECTIONS) {
    const entries = asEntries(out[section])
    if (!entries) continue

    const before = entries.length

    const arrayCountsBefore: Record<string, number> = {}
    for (const { field } of TAGGABLE_FIELDS) {
      const total = entries.reduce((sum, entry) => sum + (Array.isArray(entry[field]) ? (entry[field] as unknown[]).length : 0), 0)
      if (total > 0) arrayCountsBefore[field] = total
    }

    const filtered = entries.filter((entry) => {
      const tags = entryTags(entry)
      return tags !== undefined && tags.some((tag) => activeTags.has(tag))
    })

    for (const entry of filtered) {
      filterTaggableFields(entry, activeTags)
      applyLabelPerTag(entry, section, activeOrder)
      stripTailorMeta(entry)
    }

    const limit = variant.limits?.[section]
    const limited = typeof limit === 'number' ? filtered.slice(0, limit) : filtered

    out[section] = limited

    const arrayStats: Record<string, { before: number; after: number }> = {}
    for (const { field } of TAGGABLE_FIELDS) {
      if (!(field in arrayCountsBefore)) continue
      arrayStats[field] = {
        before: arrayCountsBefore[field],
        after: limited.reduce((sum, entry) => sum + (Array.isArray(entry[field]) ? (entry[field] as unknown[]).length : 0), 0)
      }
    }

    sections[section] = {
      before,
      after: limited.length,
      ...(Object.keys(arrayStats).length > 0 ? { arrayStats } : {})
    }
  }

  out.basics = mergeBasics(out.basics, variant.basics, variant.name, options.input, warnings)

  if (variant.sections?.drop) {
    for (const key of variant.sections.drop) {
      delete out[key]
      delete sections[key]
    }
  }

  if (variant.sections?.order) {
    const ordered = variant.sections.order.filter((key) => key in out)
    const remaining = Object.keys(out).filter((key) => !ordered.includes(key))
    const reordered: JsonResume = {}
    for (const key of [...ordered, ...remaining]) {
      reordered[key] = out[key]
    }
    out = reordered
  }

  if (!options.quiet) {
    const emit = options.onWarning ?? ((message: string) => console.warn(message))
    for (const message of warnings) emit(message)
  }

  return { resume: out, summary: { sections, warnings } }
}
