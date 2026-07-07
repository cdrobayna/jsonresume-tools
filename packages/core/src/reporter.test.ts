import { describe, expect, it } from 'vitest'
import { createResult, push } from './findings.js'
import { report, reportJson, reportText } from './reporter.js'

describe('reportText', () => {
  it('groups findings by bucket and code, and appends a summary', () => {
    const result = createResult()
    push(result.errors, 'FOO', '$.a', 'bad thing')
    push(result.warnings, 'BAR', '$.b', 'meh thing')

    const text = reportText(result)
    expect(text).toContain('ERROR')
    expect(text).toContain('[FOO]')
    expect(text).toContain('$.a')
    expect(text).toContain('WARN')
    expect(text).toContain('[BAR]')
    expect(text).toContain('Summary: 1 error(s), 1 warning(s)')
  })

  it('prefixes an optional label', () => {
    const result = createResult()
    expect(reportText(result, { label: 'resume.en.json' })).toMatch(/^resume\.en\.json\n/)
  })
})

describe('reportJson', () => {
  it('emits JSON parseable back into the original result', () => {
    const result = createResult()
    push(result.errors, 'FOO', '$.a', 'bad thing')
    expect(JSON.parse(reportJson(result))).toEqual(result)
  })
})

describe('report', () => {
  it('dispatches to reportJson for format "json"', () => {
    const result = createResult()
    expect(report(result, 'json')).toBe(reportJson(result))
  })

  it('dispatches to reportText for format "text"', () => {
    const result = createResult()
    expect(report(result, 'text')).toBe(reportText(result))
  })
})
