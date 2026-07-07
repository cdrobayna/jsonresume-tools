import { describe, expect, it } from 'vitest'
import { resolveLocaleInputs } from './cli-locale.js'

describe('resolveLocaleInputs', () => {
  it('infers the locale from a <anything>.<locale>.json filename', () => {
    expect(resolveLocaleInputs(['resume.en.json'])).toEqual([{ locale: 'en', path: 'resume.en.json' }])
  })

  it('infers a hyphenated locale like en-US', () => {
    expect(resolveLocaleInputs(['resume.en-US.json'])).toEqual([{ locale: 'en-US', path: 'resume.en-US.json' }])
  })

  it('honors an explicit <locale>=<path> override', () => {
    expect(resolveLocaleInputs(['en=cv-main.json'])).toEqual([{ locale: 'en', path: 'cv-main.json' }])
  })

  it('does not mistake a path containing "=" after a slash for an override', () => {
    // No '=' before the first '/', so this must fall through to filename inference — and fail, since
    // this filename doesn't encode a locale.
    expect(() => resolveLocaleInputs(['some/dir=x/resume.json'])).toThrow(/cannot infer locale/)
  })

  it('throws when the filename has neither an override nor an inferable locale', () => {
    expect(() => resolveLocaleInputs(['cv-main.json'])).toThrow(/cannot infer locale/)
  })

  it('resolves multiple files independently', () => {
    expect(resolveLocaleInputs(['resume.en.json', 'es=cv-espanol.json'])).toEqual([
      { locale: 'en', path: 'resume.en.json' },
      { locale: 'es', path: 'cv-espanol.json' }
    ])
  })
})
