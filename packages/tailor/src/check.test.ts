import { describe, expect, it } from 'vitest'
import { checkTailor } from './check.js'
import type { JsonResume, Variant } from './types/resume.js'

function codesOf(list: { code: string }[]): string[] {
  return list.map((finding) => finding.code)
}

describe('checkTailor', () => {
  it('flags a tag used in the resume but not declared by any variant', () => {
    const resume: JsonResume = { work: [{ name: 'Acme', meta: { tailor: { tags: ['frontend'] } } }] }
    const variants: Variant[] = [{ name: 'backend', tag: 'backend' }]

    const result = checkTailor(resume, variants)
    expect(codesOf(result.warnings)).toContain('TAILOR_ORPHAN_TAG')
  })

  it('flags a variant that matches no entry in the resume', () => {
    const resume: JsonResume = { work: [{ name: 'Acme', meta: { tailor: { tags: ['backend'] } } }] }
    const variants: Variant[] = [
      { name: 'backend', tag: 'backend' },
      { name: 'devops', tag: 'devops' }
    ]

    const result = checkTailor(resume, variants)
    expect(codesOf(result.warnings)).toContain('TAILOR_UNUSED_VARIANT')
  })

  it('flags an out-of-range highlightTags index as a hard error', () => {
    const resume: JsonResume = {
      work: [
        {
          name: 'Acme',
          highlights: ['h0', 'h1'],
          meta: { tailor: { tags: ['backend'], highlightTags: { backend: [0, 9] } } }
        }
      ]
    }
    const variants: Variant[] = [{ name: 'backend', tag: 'backend' }]

    const result = checkTailor(resume, variants)
    expect(codesOf(result.errors)).toContain('TAILOR_HIGHLIGHT_INDEX')
  })

  it('flags an out-of-range keywordTags index as a hard error', () => {
    const resume: JsonResume = {
      skills: [
        {
          name: 'Backend',
          keywords: ['Node.js', 'TypeScript'],
          meta: { tailor: { tags: ['backend'], keywordTags: { backend: [0, 9] } } }
        }
      ]
    }
    const variants: Variant[] = [{ name: 'backend', tag: 'backend' }]

    const result = checkTailor(resume, variants)
    expect(codesOf(result.errors)).toContain('TAILOR_KEYWORD_INDEX')
  })

  it('flags meta.tailor present with empty or missing tags', () => {
    const resume: JsonResume = { work: [{ name: 'Acme', meta: { tailor: {} } }] }

    const result = checkTailor(resume, [])
    expect(codesOf(result.warnings)).toContain('TAILOR_EMPTY_TAGS')
  })

  it('flags tags that are not an array of strings', () => {
    const resume = {
      work: [{ name: 'Acme', meta: { tailor: { tags: 'backend' } } }]
    } as unknown as JsonResume

    const result = checkTailor(resume, [])
    expect(codesOf(result.warnings)).toContain('TAILOR_TAG_SHAPE')
  })

  it('flags a section left empty by a filter that does not drop it', () => {
    const resume: JsonResume = {
      work: [{ name: 'Acme', meta: { tailor: { tags: ['backend'] } } }],
      awards: [{ title: 'Award', meta: { tailor: { tags: ['backend'] } } }]
    }
    const variants: Variant[] = [{ name: 'devops', tag: 'devops' }]

    const result = checkTailor(resume, variants)
    expect(codesOf(result.warnings)).toContain('TAILOR_EMPTY_SECTION')
  })

  it('passes cleanly when tags, variants, and highlights are all coherent', () => {
    const resume: JsonResume = {
      work: [
        { name: 'Acme', highlights: ['h0'], meta: { tailor: { tags: ['backend'], highlightTags: { backend: [0] } } } }
      ]
    }
    const variants: Variant[] = [{ name: 'backend', tag: 'backend' }]

    const result = checkTailor(resume, variants)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })
})
