import { describe, expect, it } from 'vitest'
import { aggregate, formatReport, type StepResult } from './report.js'

describe('aggregate', () => {
  it('returns exit 0 when every step passes', () => {
    const steps: StepResult[] = [
      { label: 'a', tool: 'lint', code: 0 },
      { label: 'b', tool: 'parity', code: 0 }
    ]
    expect(aggregate(steps).code).toBe(0)
  })

  it('takes the worst code across steps', () => {
    const steps: StepResult[] = [
      { label: 'a', tool: 'lint', code: 1 },
      { label: 'b', tool: 'parity', code: 2 },
      { label: 'c', tool: 'tailor', code: 0 }
    ]
    expect(aggregate(steps).code).toBe(2)
  })

  it('ignores skipped steps when computing the worst code', () => {
    const steps: StepResult[] = [
      { label: 'a', tool: 'lint', code: 0 },
      { label: 'b', tool: 'resume', code: 2, skipped: true }
    ]
    expect(aggregate(steps).code).toBe(0)
  })
})

describe('formatReport', () => {
  it('labels each step PASS/FAIL/ERROR/SKIP', () => {
    const report = aggregate([
      { label: 'ok', tool: 'lint', code: 0 },
      { label: 'findings', tool: 'lint', code: 1 },
      { label: 'misuse', tool: 'lint', code: 2 },
      { label: 'not run', tool: 'resume', code: 0, skipped: true }
    ])
    const text = formatReport(report)
    expect(text).toContain('[PASS] ok')
    expect(text).toContain('[FAIL] findings')
    expect(text).toContain('[ERROR] misuse')
    expect(text).toContain('[SKIP] not run')
  })

  it('shows output detail only for failing steps by default', () => {
    const report = aggregate([
      { label: 'ok', tool: 'lint', code: 0, stdout: 'quiet success detail' },
      { label: 'bad', tool: 'lint', code: 1, stdout: 'loud failure detail' }
    ])
    const text = formatReport(report)
    expect(text).not.toContain('quiet success detail')
    expect(text).toContain('loud failure detail')
  })

  it('shows every step detail when verbose', () => {
    const report = aggregate([{ label: 'ok', tool: 'lint', code: 0, stdout: 'quiet success detail' }])
    const text = formatReport(report, { verbose: true })
    expect(text).toContain('quiet success detail')
  })

  it('shows the skip reason for skipped steps', () => {
    const report = aggregate([{ label: 'audit', tool: 'resume', code: 0, skipped: true, stdout: 'no --theme given' }])
    expect(formatReport(report)).toContain('no --theme given')
  })

  it('summarizes pass/fail counts, excluding skipped steps from the denominator', () => {
    const report = aggregate([
      { label: 'a', tool: 'lint', code: 0 },
      { label: 'b', tool: 'lint', code: 1 },
      { label: 'c', tool: 'resume', code: 0, skipped: true }
    ])
    expect(formatReport(report)).toContain('1/2 step(s) failed: b')
  })

  it('reports all-passed when nothing failed', () => {
    const report = aggregate([{ label: 'a', tool: 'lint', code: 0 }])
    expect(formatReport(report)).toContain('1 step(s) passed.')
  })
})
