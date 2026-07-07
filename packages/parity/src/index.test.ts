import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { checkParity } from './index.js'

function codesOf(list: { code: string }[]): string[] {
  return list.map((f) => f.code)
}

describe('checkParity', () => {
  it('reports no findings for a clean, matching pair', async () => {
    const result = await checkParity({
      locales: [
        {
          locale: 'en',
          data: {
            basics: { name: 'Jane Doe', email: 'jane@example.com', url: 'https://example.com' },
            work: [{ name: 'Acme Corp', startDate: '2020-01', endDate: '2023-06', highlights: ['Led the platform migration to Kubernetes.'] }],
            meta: { language: 'en' }
          }
        },
        {
          locale: 'es',
          data: {
            basics: { name: 'Jane Doe', email: 'jane@example.com', url: 'https://example.com' },
            work: [{ name: 'Acme Corp', startDate: '2020-01', endDate: '2023-06', highlights: ['Lideró la migración de la plataforma a Kubernetes.'] }],
            meta: { language: 'es' }
          }
        }
      ]
    })

    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('flags TYPE_MISMATCH when a field is an array in one locale and an object in another', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { work: [{ name: 'Acme' }] } },
        { locale: 'es', data: { work: { name: 'Acme' } } }
      ]
    })
    expect(codesOf(result.errors)).toContain('TYPE_MISMATCH')
  })

  it('flags ARRAY_LENGTH when array lengths differ', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { work: [{ name: 'A' }, { name: 'B' }] } },
        { locale: 'es', data: { work: [{ name: 'A' }] } }
      ]
    })
    expect(codesOf(result.errors)).toContain('ARRAY_LENGTH')
  })

  it('flags KEY_ONLY_BASELINE and KEY_ONLY_LOCALE for keys present on only one side', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { basics: { name: 'Jane', email: 'jane@example.com' } } },
        { locale: 'es', data: { basics: { name: 'Jane', phone: '123' } } }
      ]
    })
    expect(codesOf(result.errors)).toContain('KEY_ONLY_BASELINE')
    expect(codesOf(result.errors)).toContain('KEY_ONLY_LOCALE')
  })

  it('flags MUST_BE_IDENTICAL when an identity field differs', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { work: [{ name: 'Acme', startDate: '2020-01' }] } },
        { locale: 'es', data: { work: [{ name: 'Acme', startDate: '2020-02' }] } }
      ]
    })
    expect(codesOf(result.errors)).toContain('MUST_BE_IDENTICAL')
  })

  it('flags MUST_BE_IDENTICAL_ARRAY when an identity array (e.g. keywords) differs', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { work: [{ name: 'Acme', keywords: ['a', 'b'] }] } },
        { locale: 'es', data: { work: [{ name: 'Acme', keywords: ['a', 'c'] }] } }
      ]
    })
    expect(codesOf(result.errors)).toContain('MUST_BE_IDENTICAL_ARRAY')
  })

  it('flags VALUE_DIFFERS when a non-string leaf differs', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { basics: { available: true } } },
        { locale: 'es', data: { basics: { available: false } } }
      ]
    })
    expect(codesOf(result.errors)).toContain('VALUE_DIFFERS')
  })

  it('flags META_LANGUAGE when meta.language does not match the locale', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { meta: { language: 'xx' } } },
        { locale: 'es', data: { meta: { language: 'es' } } }
      ]
    })
    expect(codesOf(result.errors)).toContain('META_LANGUAGE')
  })

  it('warns EMPTY_ONE_SIDE when a string is empty on only one side', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { basics: { summary: '' } } },
        { locale: 'es', data: { basics: { summary: 'Resumen completo aquí.' } } }
      ]
    })
    expect(codesOf(result.warnings)).toContain('EMPTY_ONE_SIDE')
  })

  it('warns LENGTH_RATIO when translated strings differ wildly in length', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { basics: { summary: 'Short bio.' } } },
        {
          locale: 'es',
          data: {
            basics: {
              summary:
                'Esta es una biografía muchísimo más larga que la versión en inglés, escrita deliberadamente así para disparar el chequeo de proporción de longitud.'
            }
          }
        }
      ]
    })
    expect(codesOf(result.warnings)).toContain('LENGTH_RATIO')
  })

  it('respects a per-pair lengthRatio override', async () => {
    const locales = [
      { locale: 'en', data: { basics: { summary: 'A shortish sentence here.' } } },
      { locale: 'ja', data: { basics: { summary: '短い文。' } } }
    ]
    const strict = await checkParity({ locales, lengthRatio: { default: 2.5, 'en:ja': 0.5 } })
    expect(codesOf(strict.warnings)).toContain('LENGTH_RATIO')

    const lenient = await checkParity({ locales, lengthRatio: { default: 2.5, 'en:ja': 50 } })
    expect(codesOf(lenient.warnings)).not.toContain('LENGTH_RATIO')
  })

  it('warns IDENTICAL_TRANSLATION when a long translatable string is identical in both locales', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { basics: { summary: 'This exact sentence was never translated at all.' } } },
        { locale: 'es', data: { basics: { summary: 'This exact sentence was never translated at all.' } } }
      ]
    })
    expect(codesOf(result.warnings)).toContain('IDENTICAL_TRANSLATION')
  })

  it('does not warn IDENTICAL_TRANSLATION for proper-noun fields like name/institution', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { basics: { name: 'Jane Alexandra Doe' } } },
        { locale: 'es', data: { basics: { name: 'Jane Alexandra Doe' } } }
      ]
    })
    expect(codesOf(result.warnings)).not.toContain('IDENTICAL_TRANSLATION')
  })

  it('skips subtrees under configured skipSubtreeKeys (e.g. $schema)', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { $schema: 'https://example.com/a.json', meta: { language: 'en' } } },
        { locale: 'es', data: { $schema: 'https://example.com/b.json', meta: { language: 'es' } } }
      ]
    })
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  it('honors rule severity overrides, including turning a rule off', async () => {
    const locales = [
      { locale: 'en', data: { work: [{ name: 'Acme', startDate: '2020-01' }] } },
      { locale: 'es', data: { work: [{ name: 'Acme', startDate: '2020-02' }] } }
    ]
    const off = await checkParity({ locales, rules: { mustBeIdentical: 'off' } })
    expect(codesOf(off.errors)).not.toContain('MUST_BE_IDENTICAL')

    const downgraded = await checkParity({ locales, rules: { mustBeIdentical: 'warn' } })
    expect(codesOf(downgraded.errors)).not.toContain('MUST_BE_IDENTICAL')
    expect(codesOf(downgraded.warnings)).toContain('MUST_BE_IDENTICAL')
  })

  it('supports N locales, checking each independently against the baseline', async () => {
    const result = await checkParity({
      locales: [
        { locale: 'en', data: { basics: { name: 'Jane', email: 'jane@example.com' }, meta: { language: 'en' } } },
        { locale: 'es', data: { basics: { name: 'Jane', email: 'jane@example.com' }, meta: { language: 'es' } } },
        {
          locale: 'fr',
          data: { basics: { name: 'Jane', email: 'jane@example.com', phone: '123' }, meta: { language: 'fr' } }
        }
      ]
    })

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({ code: 'KEY_ONLY_LOCALE', path: '$.basics.phone' })
  })

  it('rejects fewer than 2 locales', async () => {
    await expect(checkParity({ locales: [{ locale: 'en', data: {} }] })).rejects.toThrow(/at least 2 locales/)
  })

  it('reads from disk when given paths instead of data', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jsonresume-parity-test-'))
    const enPath = path.join(dir, 'resume.en.json')
    const esPath = path.join(dir, 'resume.es.json')
    await writeFile(enPath, JSON.stringify({ basics: { name: 'Jane' }, meta: { language: 'en' } }))
    await writeFile(esPath, JSON.stringify({ basics: { name: 'Jane' }, meta: { language: 'es' } }))

    const result = await checkParity({
      locales: [
        { locale: 'en', path: enPath },
        { locale: 'es', path: esPath }
      ]
    })

    expect(result.errors).toEqual([])
    await rm(dir, { recursive: true, force: true })
  })
})
