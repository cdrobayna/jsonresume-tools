---
"jsonresume-execute": patch
---

`jrx check --theme`'s ATS audit score is now always visible in the report. `resume audit` exits 0
unless it crashes — the score itself was never a pass/fail gate — so the `ATS score: NN/100 (grade
X, band)` line resume-cli prints was previously only shown when a step failed or `--verbose` was
passed, meaning it was silently hidden on every normal passing run. Each `audit (<file>)` step's
status line now always appends a short summary, e.g.:

    [PASS] audit (resume.en.json) — 88/100 (grade B, excellent), 9/10 checks passed

This is purely a visibility fix: audit's pass/fail semantics are unchanged (still "ran without
crashing", not score-gated — a `--min-score` gate is separately scoped future work). Adds an
optional, additive `StepResult.summary` field to the programmatic report API (`aggregate`/
`formatReport`); existing callers are unaffected.

Known limitation: `jrx all` still nests `check`'s fully-formatted output inside one coarse "check"
step, so this score summary doesn't yet surface under a non-verbose `jrx all` run — tracked
separately.
