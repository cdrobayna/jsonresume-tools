import { createResult, emit, type Result, type RuleSeverities, type Severity } from '@jsonresume-tools/core'
import { FILTERABLE_SECTIONS, tailor } from './tailor.js'
import type { JsonResume, ResumeEntry, Variant } from './types/resume.js'

export type TailorCheckRuleName =
  | 'tailorHighlightIndex'
  | 'tailorEmptyTags'
  | 'tailorTagShape'
  | 'tailorOrphanTag'
  | 'tailorUnusedVariant'
  | 'tailorEmptySection'

export const defaults = {
  rules: {
    // Out-of-range highlight indices are the one hard error — everything else is advisory.
    tailorHighlightIndex: 'error',
    tailorEmptyTags: 'warn',
    tailorTagShape: 'warn',
    tailorOrphanTag: 'warn',
    tailorUnusedVariant: 'warn',
    tailorEmptySection: 'warn'
  } as Record<TailorCheckRuleName, Severity>
}

function asEntries(value: unknown): ResumeEntry[] | undefined {
  return Array.isArray(value) ? (value as ResumeEntry[]) : undefined
}

/** Entry-level coherence: tag shape, empty tags, out-of-range `highlightTags` indices. Also
 * collects every tag actually used, for the resume/variant cross-check below. */
function checkEntries(resume: JsonResume, result: Result, rules: RuleSeverities): Set<string> {
  const tagsUsed = new Set<string>()

  for (const section of FILTERABLE_SECTIONS) {
    const entries = asEntries(resume[section])
    if (!entries) continue

    entries.forEach((entry, index) => {
      const tailorMeta = entry.meta?.tailor
      if (!tailorMeta) return

      const path = `$.${section}[${index}].meta.tailor`
      const tags = tailorMeta.tags

      if (tags === undefined || (Array.isArray(tags) && tags.length === 0)) {
        emit(result, rules, 'tailorEmptyTags', 'TAILOR_EMPTY_TAGS', `${path}.tags`, 'meta.tailor is present but tags is empty or missing')
      } else if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) {
        emit(result, rules, 'tailorTagShape', 'TAILOR_TAG_SHAPE', `${path}.tags`, 'tags must be an array of strings')
      } else {
        for (const tag of tags) tagsUsed.add(tag)
      }

      const highlightsLength = Array.isArray(entry.highlights) ? entry.highlights.length : 0
      for (const [tag, indices] of Object.entries(tailorMeta.highlightTags ?? {})) {
        if (!Array.isArray(indices)) continue
        for (const idx of indices) {
          if (idx < 0 || idx >= highlightsLength) {
            emit(
              result,
              rules,
              'tailorHighlightIndex',
              'TAILOR_HIGHLIGHT_INDEX',
              `${path}.highlightTags.${tag}`,
              `highlight index ${idx} is out of range (highlights.length = ${highlightsLength})`
            )
          }
        }
      }
    })
  }

  return tagsUsed
}

/** Resume/variant coherence: tags with no covering variant, variants matching no entry, and
 * sections a variant leaves empty without explicitly dropping. */
function checkVariants(resume: JsonResume, variants: Variant[], tagsUsed: Set<string>, result: Result, rules: RuleSeverities): void {
  const variantTags = new Set<string>()
  for (const variant of variants) {
    variantTags.add(variant.tag)
    for (const tag of variant.also ?? []) variantTags.add(tag)
  }

  for (const tag of tagsUsed) {
    if (!variantTags.has(tag)) {
      emit(result, rules, 'tailorOrphanTag', 'TAILOR_ORPHAN_TAG', '$', `tag "${tag}" is used in the resume but not declared by any variant`)
    }
  }

  for (const variant of variants) {
    // quiet: true — checking coherence shouldn't spam basics-override warnings to stderr.
    const { resume: filtered, summary } = tailor(resume, variant, { quiet: true })

    const matchedAnyEntry = Object.values(summary.sections).some((section) => section.after > 0)
    if (!matchedAnyEntry) {
      emit(result, rules, 'tailorUnusedVariant', 'TAILOR_UNUSED_VARIANT', '$', `variant "${variant.name}" matches no entry in the resume`)
    }

    const dropped = new Set(variant.sections?.drop ?? [])
    for (const section of FILTERABLE_SECTIONS) {
      if (dropped.has(section)) continue

      const before = asEntries(resume[section])
      if (!before || before.length === 0) continue // section didn't exist in the master to begin with

      const after = asEntries(filtered[section])
      if (!after || after.length === 0) {
        emit(
          result,
          rules,
          'tailorEmptySection',
          'TAILOR_EMPTY_SECTION',
          `$.${section}`,
          `section "${section}" is empty after filtering for variant "${variant.name}" and is not in sections.drop`
        )
      }
    }
  }
}

/**
 * Cross-checks a master resume's `meta.tailor` annotations against a set of variants.
 * Entry-level: tag shape, empty tags, out-of-range `highlightTags` indices (the one hard error).
 * Resume/variant: tags with no covering variant, variants that match no entry, and sections a
 * variant leaves empty without explicitly dropping them.
 */
export function checkTailor(resume: JsonResume, variants: Variant[]): Result {
  const result = createResult()
  const rules = defaults.rules as unknown as RuleSeverities

  const tagsUsed = checkEntries(resume, result, rules)
  checkVariants(resume, variants, tagsUsed, result, rules)

  return result
}
