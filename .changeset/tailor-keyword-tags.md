---
"jsonresume-tailor": minor
---

Add `meta.tailor.keywordTags`, mirroring `highlightTags` but applied to `keywords` instead of
`highlights`. Lets a single mixed-stack `skills` or `projects` entry (e.g. one "Backend" skill
covering both Node.js and PHP keywords) show only the keywords relevant to the active variant,
instead of having to split it into separate entries per stack.

Adds a corresponding `tailorKeywordIndex` check rule (error, mirroring `tailorHighlightIndex`)
that flags out-of-range `keywordTags` indices.
