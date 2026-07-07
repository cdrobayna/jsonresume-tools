import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CliUsageError } from '@jsonresume-tools/core'
import { describe, expect, it } from 'vitest'
import { loadVariant, loadVariantFromString, loadVariants, listVariants, ValidationError } from './variant.js'

const FIXTURES_DIR = fileURLToPath(new URL('../fixtures', import.meta.url))
const VARIANTS_DIR = path.join(FIXTURES_DIR, 'variants')

describe('loadVariantFromString', () => {
  it('accepts a minimal variant with just name and tag', () => {
    const variant = loadVariantFromString(JSON.stringify({ name: 'backend', tag: 'backend' }))
    expect(variant).toEqual({ name: 'backend', tag: 'backend' })
  })

  it('rejects a variant missing "name"', () => {
    expect(() => loadVariantFromString(JSON.stringify({ tag: 'backend' }))).toThrow(ValidationError)
  })

  it('rejects a variant missing "tag"', () => {
    expect(() => loadVariantFromString(JSON.stringify({ name: 'backend' }))).toThrow(ValidationError)
  })

  it('rejects "also" containing non-strings', () => {
    expect(() =>
      loadVariantFromString(JSON.stringify({ name: 'backend', tag: 'backend', also: ['short', 5] }))
    ).toThrow(ValidationError)
  })

  it('rejects malformed JSON', () => {
    expect(() => loadVariantFromString('{not json')).toThrow(ValidationError)
  })

  it('rejects unknown top-level properties', () => {
    expect(() => loadVariantFromString(JSON.stringify({ name: 'backend', tag: 'backend', bogus: true }))).toThrow(
      ValidationError
    )
  })
})

describe('loadVariant', () => {
  it('loads and validates a variant file', async () => {
    const variant = await loadVariant(path.join(VARIANTS_DIR, 'backend.json'))
    expect(variant.name).toBe('backend')
    expect(variant.tag).toBe('backend')
  })

  it('throws CliUsageError when the file does not exist', async () => {
    await expect(loadVariant(path.join(VARIANTS_DIR, 'does-not-exist.json'))).rejects.toThrow(CliUsageError)
  })
})

describe('loadVariants / listVariants', () => {
  it('loads every variant in a directory, sorted by filename', async () => {
    const variants = await loadVariants(VARIANTS_DIR)
    expect(variants.map((variant) => variant.name).sort()).toEqual(['backend', 'devops', 'short', 'sysadmin'])
  })

  it('lists name and description for each variant', async () => {
    const summaries = await listVariants(VARIANTS_DIR)
    const backend = summaries.find((summary) => summary.name === 'backend')
    expect(backend?.description).toBe('Backend engineer roles (Node/NestJS-focused)')
  })

  it('throws CliUsageError when the directory does not exist', async () => {
    await expect(loadVariants(path.join(FIXTURES_DIR, 'nope'))).rejects.toThrow(CliUsageError)
  })
})
