import { emit, type Result, type RuleSeverities } from '@jsonresume-tools/core'

/** Checks that a locale's declared `meta.language` matches the locale it's being run as. */
export function checkMetaLanguage(
  data: unknown,
  locale: string,
  ctx: { result: Result; rules: RuleSeverities }
): void {
  const declared = (data as { meta?: { language?: unknown } } | null | undefined)?.meta?.language
  if (declared !== locale) {
    emit(
      ctx.result,
      ctx.rules,
      'metaLanguage',
      'META_LANGUAGE',
      `${locale}:meta.language`,
      `meta.language="${declared ?? '<missing>'}" does not match locale "${locale}"`
    )
  }
}
