import { FILTERABLE_SECTIONS, TAGGABLE_FIELDS } from './tailor.js'
import type { JsonResume, ResumeEntry } from './types/resume.js'

export interface InspectedEntry {
  section: string
  index: number
  label: string
  tags: string[]
  taggableFields: Record<string, string[]>
  tagMaps: Record<string, Record<string, number[]>>
  labelPerTag?: Record<string, string>
}

export function entryLabel(entry: ResumeEntry, section: string): string {
  switch (section) {
    case 'work':
      return [entry.name, entry.position].filter(Boolean).join(' — ')
    case 'education':
      return [entry['institution'] as string, entry['area'] as string].filter(Boolean).join(' — ')
    case 'volunteer':
      return [entry['organization'] as string, entry.position].filter(Boolean).join(' — ')
    case 'awards':
    case 'certificates':
    case 'publications':
      return (entry['title'] as string) ?? entry.name ?? '(unnamed)'
    default:
      return entry.name ?? '(unnamed)'
  }
}

export function inspect(resume: JsonResume, sectionFilter?: string): InspectedEntry[] {
  const results: InspectedEntry[] = []
  const sections = sectionFilter
    ? FILTERABLE_SECTIONS.filter((s) => s === sectionFilter)
    : FILTERABLE_SECTIONS

  for (const section of sections) {
    const entries = resume[section]
    if (!Array.isArray(entries)) continue

    ;(entries as ResumeEntry[]).forEach((entry, index) => {
      const tailor = entry.meta?.tailor
      const tags = Array.isArray(tailor?.tags) ? (tailor.tags as string[]) : []

      const taggableFields: Record<string, string[]> = {}
      const tagMaps: Record<string, Record<string, number[]>> = {}

      for (const { field, metaKey } of TAGGABLE_FIELDS) {
        const values = entry[field]
        if (Array.isArray(values) && values.length > 0) {
          taggableFields[field] = values.map(String)
          const map = tailor?.[metaKey] as Record<string, number[]> | undefined
          if (map && Object.keys(map).length > 0) {
            tagMaps[metaKey] = map
          }
        }
      }

      results.push({
        section,
        index,
        label: entryLabel(entry, section),
        tags,
        taggableFields,
        tagMaps,
        ...(tailor?.labelPerTag ? { labelPerTag: tailor.labelPerTag } : {})
      })
    })
  }

  return results
}
