import type { ResumeEntry } from './types/resume.js'

/**
 * Removes `entry.meta.tailor`, mutating the entry in place. If `meta` is left empty afterwards,
 * removes `meta` too, so the output never carries a stray empty object. The output contains no
 * reference to `tailor` at all — it's canonical JSON Resume.
 *
 * The caller is responsible for only invoking this on an already-cloned entry (part of a
 * `tailor()` output), never on the source resume.
 */
export function stripTailorMeta(entry: ResumeEntry): void {
  if (!entry.meta) return
  delete entry.meta.tailor
  if (Object.keys(entry.meta).length === 0) {
    delete entry.meta
  }
}
