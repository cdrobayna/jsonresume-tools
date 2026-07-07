import { describe, expect, it } from 'vitest'
import { createResult, push } from './findings.js'

describe('createResult', () => {
  it('starts with empty errors and warnings', () => {
    expect(createResult()).toEqual({ errors: [], warnings: [] })
  })
})

describe('push', () => {
  it('pushes a finding without extra', () => {
    const list: ReturnType<typeof createResult>['errors'] = []
    push(list, 'CODE', '$.path', 'message')
    expect(list).toEqual([{ code: 'CODE', path: '$.path', message: 'message' }])
  })

  it('includes extra only when provided', () => {
    const list: ReturnType<typeof createResult>['errors'] = []
    push(list, 'CODE', '$.path', 'message', { foo: 'bar' })
    expect(list).toEqual([{ code: 'CODE', path: '$.path', message: 'message', extra: { foo: 'bar' } }])
  })
})
