import { describe, expect, it } from 'vitest'
import { createResult } from './findings.js'
import { emit, resolveSeverity } from './severity.js'

describe('emit', () => {
  it('routes error severity into result.errors', () => {
    const result = createResult()
    emit(result, { myRule: 'error' }, 'myRule', 'CODE', '$.a', 'msg')
    expect(result.errors).toHaveLength(1)
    expect(result.warnings).toHaveLength(0)
  })

  it('routes warn severity into result.warnings', () => {
    const result = createResult()
    emit(result, { myRule: 'warn' }, 'myRule', 'CODE', '$.a', 'msg')
    expect(result.warnings).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })

  it('drops the finding entirely when severity is off', () => {
    const result = createResult()
    emit(result, { myRule: 'off' }, 'myRule', 'CODE', '$.a', 'msg')
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('falls back to error when the rule has no configured severity', () => {
    const result = createResult()
    emit(result, {}, 'myRule', 'CODE', '$.a', 'msg')
    expect(result.errors).toHaveLength(1)
  })
})

describe('resolveSeverity', () => {
  it('returns the configured severity when present', () => {
    expect(resolveSeverity({ a: 'warn' }, 'a')).toBe('warn')
  })

  it('returns the fallback when the rule is unconfigured', () => {
    expect(resolveSeverity({}, 'a', 'warn')).toBe('warn')
  })

  it('defaults the fallback to error', () => {
    expect(resolveSeverity({}, 'a')).toBe('error')
  })
})
