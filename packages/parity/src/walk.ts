import { emit, type Result, type RuleSeverities } from '@jsonresume-tools/core'
import type { LengthRatioConfig } from './index.js'

export interface WalkContext {
  result: Result
  rules: RuleSeverities
  identityFields: Set<string>
  identityArrays: Set<string>
  properNounFields: Set<string>
  skipSubtreeKeys: Set<string>
  lengthRatio: LengthRatioConfig
  /** Locale of `locales[0]` — every other locale is walked against this one. */
  baselineLocale: string
  /** Locale currently being compared against the baseline. */
  locale: string
}

function describe(v: unknown): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}

function resolveLengthRatioThreshold(ctx: WalkContext): number {
  const pairKey = `${ctx.baselineLocale}:${ctx.locale}`
  return ctx.lengthRatio[pairKey] ?? ctx.lengthRatio.default
}

/**
 * Recursively compares the baseline and a candidate locale, structure-first: type mismatches
 * short-circuit, array length/identity is checked at the array level, object key drift is
 * checked at each level, and leaves fall through to `checkLeaf`. Ported from the legacy
 * validator's `walkParallel`, generalized from hardcoded EN/ES to arbitrary baseline/locale pairs.
 */
export function walkParallel(a: unknown, b: unknown, path: string, parentKey: string | null, ctx: WalkContext): void {
  if (parentKey !== null && ctx.skipSubtreeKeys.has(parentKey)) return

  const aIsArr = Array.isArray(a)
  const bIsArr = Array.isArray(b)
  const aIsObj = a !== null && typeof a === 'object' && !aIsArr
  const bIsObj = b !== null && typeof b === 'object' && !bIsArr

  if (aIsArr !== bIsArr || aIsObj !== bIsObj || typeof a !== typeof b) {
    emit(
      ctx.result,
      ctx.rules,
      'typeMismatch',
      'TYPE_MISMATCH',
      path,
      `type mismatch (${ctx.baselineLocale}=${describe(a)}, ${ctx.locale}=${describe(b)})`
    )
    return
  }

  if (aIsArr) {
    const arrA = a as unknown[]
    const arrB = b as unknown[]

    if (arrA.length !== arrB.length) {
      emit(
        ctx.result,
        ctx.rules,
        'arrayLength',
        'ARRAY_LENGTH',
        path,
        `array length differs (${ctx.baselineLocale}=${arrA.length}, ${ctx.locale}=${arrB.length})`
      )
    }

    const n = Math.min(arrA.length, arrB.length)
    for (let i = 0; i < n; i++) {
      walkParallel(arrA[i], arrB[i], `${path}[${i}]`, parentKey, ctx)
    }

    if (parentKey !== null && ctx.identityArrays.has(parentKey)) {
      const strA = JSON.stringify(arrA)
      const strB = JSON.stringify(arrB)
      if (strA !== strB) {
        emit(
          ctx.result,
          ctx.rules,
          'mustBeIdenticalArray',
          'MUST_BE_IDENTICAL_ARRAY',
          path,
          `array under "${parentKey}" must be identical between locales (${ctx.baselineLocale}=${strA}, ${ctx.locale}=${strB})`
        )
      }
    }
    return
  }

  if (aIsObj) {
    const objA = a as Record<string, unknown>
    const objB = b as Record<string, unknown>
    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)

    for (const k of keysA) {
      if (!keysB.includes(k)) {
        emit(
          ctx.result,
          ctx.rules,
          'keyOnlyBaseline',
          'KEY_ONLY_BASELINE',
          `${path}.${k}`,
          `key present in ${ctx.baselineLocale} but not ${ctx.locale}`
        )
      }
    }
    for (const k of keysB) {
      if (!keysA.includes(k)) {
        emit(
          ctx.result,
          ctx.rules,
          'keyOnlyLocale',
          'KEY_ONLY_LOCALE',
          `${path}.${k}`,
          `key present in ${ctx.locale} but not ${ctx.baselineLocale}`
        )
      }
    }
    for (const k of keysA) {
      if (keysB.includes(k)) walkParallel(objA[k], objB[k], `${path}.${k}`, k, ctx)
    }
    return
  }

  checkLeaf(a, b, path, parentKey, ctx)
}

function checkLeaf(a: unknown, b: unknown, path: string, parentKey: string | null, ctx: WalkContext): void {
  if (typeof a === 'string' && typeof b === 'string') {
    if (a === '' && b !== '') {
      emit(
        ctx.result,
        ctx.rules,
        'emptyOneSide',
        'EMPTY_ONE_SIDE',
        `${path} (${ctx.baselineLocale})`,
        `empty in ${ctx.baselineLocale} but not ${ctx.locale}`
      )
    }
    if (b === '' && a !== '') {
      emit(
        ctx.result,
        ctx.rules,
        'emptyOneSide',
        'EMPTY_ONE_SIDE',
        `${path} (${ctx.locale})`,
        `empty in ${ctx.locale} but not ${ctx.baselineLocale}`
      )
    }

    if (parentKey !== null && ctx.identityFields.has(parentKey)) {
      if (a !== b) {
        emit(
          ctx.result,
          ctx.rules,
          'mustBeIdentical',
          'MUST_BE_IDENTICAL',
          path,
          `non-translatable field differs (${ctx.baselineLocale}="${a}", ${ctx.locale}="${b}")`
        )
      }
      return
    }

    // Elements of an identity array (e.g. keywords, tags) are already covered as a whole by
    // MUST_BE_IDENTICAL_ARRAY at the array level — skip translation-quality checks on them.
    if (parentKey !== null && ctx.identityArrays.has(parentKey)) return

    if (a.length > 0 && b.length > 0) {
      const ratio = Math.max(a.length, b.length) / Math.min(a.length, b.length)
      const threshold = resolveLengthRatioThreshold(ctx)
      if (ratio > threshold) {
        emit(
          ctx.result,
          ctx.rules,
          'lengthRatio',
          'LENGTH_RATIO',
          path,
          `length ratio ${ratio.toFixed(1)}× — possible translation mismatch (${ctx.baselineLocale}=${a.length}ch, ${ctx.locale}=${b.length}ch)`
        )
      }
      if (a === b && a.length > 10 && (parentKey === null || !ctx.properNounFields.has(parentKey))) {
        emit(
          ctx.result,
          ctx.rules,
          'identicalTranslation',
          'IDENTICAL_TRANSLATION',
          path,
          'identical translated string in both languages — did you forget to translate?'
        )
      }
    }
    return
  }

  if (a !== b) {
    emit(
      ctx.result,
      ctx.rules,
      'valueDiffers',
      'VALUE_DIFFERS',
      path,
      `non-string value differs (${ctx.baselineLocale}=${JSON.stringify(a)}, ${ctx.locale}=${JSON.stringify(b)})`
    )
  }
}
