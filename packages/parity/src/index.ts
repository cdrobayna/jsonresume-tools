import { readFile } from 'node:fs/promises'
import { createResult, type Result, type RuleSeverities, type Severity } from '@jsonresume-tools/core'
import { checkMetaLanguage } from './rules/meta-language.js'
import { walkParallel } from './walk.js'

export interface LocaleInput {
  locale: string
  /** Read and JSON.parse this file. Mutually usable with `data` (data wins if both are set). */
  path?: string
  /** Already-parsed resume data — useful for tests or custom pipelines. */
  data?: unknown
}

export type ParityRuleName =
  | 'typeMismatch'
  | 'keyOnlyBaseline'
  | 'keyOnlyLocale'
  | 'arrayLength'
  | 'mustBeIdentical'
  | 'mustBeIdenticalArray'
  | 'valueDiffers'
  | 'metaLanguage'
  | 'emptyOneSide'
  | 'lengthRatio'
  | 'identicalTranslation'

export type ParityRules = Partial<Record<ParityRuleName, Severity>>

/** Per-locale-pair length-ratio thresholds, keyed `"<baseline>:<locale>"`, plus a required `default`. */
export type LengthRatioConfig = { default: number } & Partial<Record<string, number>>

export interface CheckParityOptions {
  /** `locales[0]` is the baseline; every other entry is compared against it, pairwise. */
  locales: LocaleInput[]
  rules?: ParityRules
  lengthRatio?: LengthRatioConfig
  identityFields?: string[]
  identityArrays?: string[]
  properNounFields?: string[]
  skipSubtreeKeys?: string[]
}

export const defaults = {
  rules: {
    typeMismatch: 'error',
    keyOnlyBaseline: 'error',
    keyOnlyLocale: 'error',
    arrayLength: 'error',
    mustBeIdentical: 'error',
    mustBeIdenticalArray: 'error',
    valueDiffers: 'error',
    metaLanguage: 'error',
    emptyOneSide: 'warn',
    lengthRatio: 'warn',
    identicalTranslation: 'warn'
  } as Record<ParityRuleName, Severity>,
  identityFields: [
    'startDate',
    'endDate',
    'url',
    'email',
    'phone',
    'image',
    'network',
    'username',
    'address',
    'postalCode',
    'countryCode',
    'lastModified',
    'version'
  ] as string[],
  identityArrays: ['keywords', 'tags'] as string[],
  properNounFields: ['name', 'institution'] as string[],
  skipSubtreeKeys: ['$schema'] as string[],
  lengthRatio: { default: 2.5 } as LengthRatioConfig
}

async function resolveLocaleInput(input: LocaleInput): Promise<{ locale: string; data: unknown }> {
  if (input.data !== undefined) return { locale: input.locale, data: input.data }
  if (input.path) return { locale: input.locale, data: JSON.parse(await readFile(input.path, 'utf8')) }
  throw new Error(`locale "${input.locale}" needs either "path" or "data"`)
}

/**
 * Checks structural and content parity across locale variants of a JSON Resume: matching
 * shape, identical non-translatable fields, and translation-quality heuristics. Every
 * non-baseline locale (`locales[1..]`) is compared independently against `locales[0]`.
 */
export async function checkParity(options: CheckParityOptions): Promise<Result> {
  if (options.locales.length < 2) {
    throw new Error('checkParity requires at least 2 locales (a baseline plus one to compare against it)')
  }

  const rules = { ...defaults.rules, ...options.rules } as unknown as RuleSeverities
  const identityFields = new Set(options.identityFields ?? defaults.identityFields)
  const identityArrays = new Set(options.identityArrays ?? defaults.identityArrays)
  const properNounFields = new Set(options.properNounFields ?? defaults.properNounFields)
  const skipSubtreeKeys = new Set(options.skipSubtreeKeys ?? defaults.skipSubtreeKeys)
  const lengthRatio = options.lengthRatio ?? defaults.lengthRatio

  const resolved = await Promise.all(options.locales.map(resolveLocaleInput))
  const [baseline, ...candidates] = resolved

  const result = createResult()

  for (const candidate of candidates) {
    walkParallel(baseline.data, candidate.data, '$', null, {
      result,
      rules,
      identityFields,
      identityArrays,
      properNounFields,
      skipSubtreeKeys,
      lengthRatio,
      baselineLocale: baseline.locale,
      locale: candidate.locale
    })
  }

  for (const entry of resolved) {
    checkMetaLanguage(entry.data, entry.locale, { result, rules })
  }

  return result
}

export type { WalkContext } from './walk.js'
