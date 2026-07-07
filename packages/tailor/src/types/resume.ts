// Minimal, intentionally loose JSON Resume types. Only what tailor() actually reads and writes
// is modeled precisely; everything else round-trips via index signatures so this package
// doesn't fight the official schema's shape or its many optional/extension fields.

export interface TailorMeta {
  /**
   * Tags that include this entry when a variant matching one of them is active. No tags means
   * the entry never appears in any variant output — it's an internal reference in the master
   * resume.
   */
  tags?: string[]
  /**
   * Per-tag subset of `highlights` indices to emit. The `"*"` key is universal — its indices
   * are emitted for every variant. Entries without this map emit all highlights.
   */
  highlightTags?: Record<string, number[]>
  /**
   * Per-tag override for the entry's label field (skills -> name, work -> position,
   * projects -> name). Silently ignored where the section has no mapped field.
   */
  labelPerTag?: Record<string, string>
}

export interface Meta {
  tailor?: TailorMeta
  [key: string]: unknown
}

/**
 * One entry of a filterable section (work, education, skills, projects, awards, certificates,
 * publications, volunteer).
 */
export interface ResumeEntry {
  meta?: Meta
  highlights?: string[]
  name?: string
  position?: string
  [key: string]: unknown
}

/**
 * A JSON Resume document, loosely typed. Filterable sections are arrays of `ResumeEntry`;
 * `basics` and everything else pass through `tailor()` unfiltered.
 */
export interface JsonResume {
  basics?: Record<string, unknown>
  [key: string]: unknown
}

export interface VariantSections {
  /** Final key order of the output resume. Sections not listed go last, in their original order. */
  order?: string[]
  /** Sections to remove entirely from the output. */
  drop?: string[]
}

/**
 * A declarative resume variant (`variants/<name>.json`). Mirrors `tailor-variant.schema.json`,
 * which is the source of truth validated at load time.
 */
export interface Variant {
  $schema?: string
  name: string
  description?: string
  tag: string
  also?: string[]
  /** Shallow overrides merged onto resume.basics. */
  basics?: Record<string, unknown>
  sections?: VariantSections
  /** Per-section cap on the number of entries emitted, applied after filtering. */
  limits?: Record<string, number>
}
