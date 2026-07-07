import { describe, expect, it } from 'vitest'
import { lint } from './index.js'

function codesOf(list: { code: string }[]): string[] {
  return list.map((f) => f.code)
}

describe('lint', () => {
  it('reports no findings for a clean resume', async () => {
    const result = await lint({
      data: {
        basics: { name: 'Jane Doe', email: 'jane@example.com', url: 'https://example.com' },
        work: [
          { name: 'Acme Corp', startDate: '2022-01', endDate: '2023-06' },
          { name: 'Old Co', startDate: '2019-01', endDate: '2021-12' }
        ]
      }
    })
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('flags DATE_FORMAT for a malformed date', async () => {
    const result = await lint({ data: { work: [{ name: 'Acme', startDate: '2020/01' }] } })
    expect(codesOf(result.errors)).toContain('DATE_FORMAT')
  })

  it('flags DATE_ORDER when endDate precedes startDate', async () => {
    const result = await lint({ data: { work: [{ name: 'Acme', startDate: '2020-01', endDate: '2019-01' }] } })
    expect(codesOf(result.errors)).toContain('DATE_ORDER')
  })

  it('warns CHRONOLOGY when work entries are not reverse-chronological', async () => {
    const result = await lint({
      data: {
        work: [
          { name: 'Older Job', startDate: '2019-01' },
          { name: 'Newer Job', startDate: '2020-01' }
        ]
      }
    })
    expect(codesOf(result.warnings)).toContain('CHRONOLOGY')
  })

  it('flags URL_INVALID for a malformed url field', async () => {
    const result = await lint({ data: { basics: { url: 'not-a-url' } } })
    expect(codesOf(result.errors)).toContain('URL_INVALID')
  })

  it('flags EMAIL_INVALID for a malformed email', async () => {
    const result = await lint({ data: { basics: { email: 'not-an-email' } } })
    expect(codesOf(result.errors)).toContain('EMAIL_INVALID')
  })

  it('warns PLACEHOLDER when a leftover marker string is found', async () => {
    const result = await lint({ data: { basics: { summary: 'TODO: write a real summary' } } })
    expect(codesOf(result.warnings)).toContain('PLACEHOLDER')
  })

  it('skips schema validation by default (opt-in)', async () => {
    // basics.email must be a string per the schema — wrong type, but schema is off by default.
    const result = await lint({ data: { basics: { email: 12345 } } })
    expect(codesOf(result.errors)).not.toContain('SCHEMA')
  })

  it('flags SCHEMA violations when explicitly enabled', async () => {
    const result = await lint({
      data: { basics: { email: 12345 } },
      rules: { schema: 'error' }
    })
    expect(codesOf(result.errors)).toContain('SCHEMA')
  })

  it('passes schema validation for a minimal conforming resume when enabled', async () => {
    const result = await lint({
      data: { basics: { name: 'Jane Doe', email: 'jane@example.com' } },
      rules: { schema: 'error' }
    })
    expect(codesOf(result.errors)).not.toContain('SCHEMA')
  })

  it('honors rule severity overrides, including turning a rule off', async () => {
    const data = { work: [{ name: 'Acme', startDate: '2020/01' }] }
    const off = await lint({ data, rules: { dateFormat: 'off' } })
    expect(codesOf(off.errors)).not.toContain('DATE_FORMAT')

    const downgraded = await lint({ data, rules: { dateFormat: 'warn' } })
    expect(codesOf(downgraded.errors)).not.toContain('DATE_FORMAT')
    expect(codesOf(downgraded.warnings)).toContain('DATE_FORMAT')
  })

  it('reads from disk when given a path instead of data', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises')
    const { tmpdir } = await import('node:os')
    const path = await import('node:path')

    const dir = await mkdtemp(path.join(tmpdir(), 'jsonresume-lint-test-'))
    const filePath = path.join(dir, 'resume.en.json')
    await writeFile(filePath, JSON.stringify({ basics: { email: 'jane@example.com' } }))

    const result = await lint({ path: filePath })
    expect(result.errors).toEqual([])

    await rm(dir, { recursive: true, force: true })
  })
})
