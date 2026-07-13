export interface StepResult {
  /** Human label for this step, e.g. "lint (masters)" or "tailor check (en)". */
  label: string
  /** The tool that ran this step (for grouping/diagnostics). */
  tool: string
  code: number
  stdout?: string
  stderr?: string
  /** Set when the step was intentionally not run (e.g. no --theme given, so audit is skipped). */
  skipped?: boolean
  /**
   * One-line highlight appended to the step's `[STATUS] label` line, shown unconditionally —
   * independent of `--verbose` and pass/fail — unlike `stdout`/`stderr`, whose detail block is
   * gated below. Generic by design: this module has no notion of "audit" or "resume-cli";
   * callers attach whatever short, always-worth-seeing highlight applies to their step (e.g.
   * resume-cli audit's ATS score).
   */
  summary?: string
}

export interface AggregatedReport {
  steps: StepResult[]
  /**
   * Worst step exit code, following the same convention every jsonresume-tools CLI already
   * uses: `0` clean, `1` findings/validation failure, `2` misuse. Skipped steps don't count.
   */
  code: number
}

/** Aggregates a list of step results into one report + one overall exit code (the worst among them). */
export function aggregate(steps: StepResult[]): AggregatedReport {
  const code = steps.reduce((worst, step) => (step.skipped ? worst : Math.max(worst, step.code)), 0)
  return { steps, code }
}

export interface FormatReportOptions {
  /** Show every step's captured output, not just failing ones. */
  verbose?: boolean
}

function statusLabel(step: StepResult): string {
  if (step.skipped) return 'SKIP'
  if (step.code === 0) return 'PASS'
  if (step.code === 1) return 'FAIL'
  return 'ERROR'
}

/** Renders an aggregated report as a human-readable summary: one status line per step (with any
 * `summary` highlight appended, shown regardless of `verbose`/pass-fail), with the underlying
 * tool output indented beneath any step that failed (or every step, with `verbose`). */
export function formatReport(report: AggregatedReport, opts: FormatReportOptions = {}): string {
  const lines: string[] = []

  for (const step of report.steps) {
    const summarySuffix = step.summary ? ` — ${step.summary}` : ''
    lines.push(`[${statusLabel(step)}] ${step.label}${summarySuffix}`)
    const showDetail = !step.skipped && (opts.verbose || step.code !== 0)
    if (showDetail) {
      const detail = [step.stdout, step.stderr].filter(Boolean).join('\n').trim()
      for (const line of detail.split('\n')) {
        if (line) lines.push(`    ${line}`)
      }
    } else if (step.skipped && step.stdout) {
      lines.push(`    ${step.stdout}`)
    }
  }

  const counted = report.steps.filter((s) => !s.skipped)
  const failed = counted.filter((s) => s.code !== 0)
  lines.push('')
  lines.push(
    failed.length === 0
      ? `${counted.length} step(s) passed.`
      : `${failed.length}/${counted.length} step(s) failed: ${failed.map((s) => s.label).join(', ')}`
  )

  return lines.join('\n')
}
