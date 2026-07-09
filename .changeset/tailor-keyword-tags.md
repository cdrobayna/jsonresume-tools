---
"jsonresume-tailor": minor
---

Generalize sub-array tag filtering with a data-driven `TAGGABLE_FIELDS` registry. Adding a new
filterable array field (like `highlightTags`, `keywordTags`) now requires only a one-line registry
entry plus the type definition — no per-field filter/check functions needed.

Add `meta.tailor.courseTags` for filtering `courses` on education entries, mirroring
`highlightTags`/`keywordTags` shape and semantics (including the `"*"` wildcard). Adds a
corresponding `tailorCourseIndex` check rule.

Replace `TailorSectionSummary.highlightsBefore`/`highlightsAfter` with a generalized `arrayStats`
map that tracks before/after counts for all taggable array fields (highlights, keywords, courses).
CLI output now reports stats for every filtered array, not just highlights.
