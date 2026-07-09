import { describe, expect, it } from 'vitest'
import { tailor } from './tailor.js'
import type { JsonResume, Variant } from './types/resume.js'

function makeVariant(overrides: Partial<Variant> = {}): Variant {
  return { name: 'v', tag: 'v', ...overrides }
}

describe('tailor', () => {
  it('includes an entry whose tags intersect the active tag set', () => {
    const resume: JsonResume = { work: [{ name: 'Acme', meta: { tailor: { tags: ['backend'] } } }] }
    const result = tailor(resume, makeVariant({ tag: 'backend' }))
    expect(result.resume.work).toHaveLength(1)
  })

  it('excludes entries with no tags or an empty tags array', () => {
    const resume: JsonResume = {
      work: [{ name: 'Acme' }, { name: 'Widget', meta: { tailor: { tags: [] } } }]
    }
    const result = tailor(resume, makeVariant({ tag: 'backend' }))
    expect(result.resume.work).toEqual([])
  })

  it('composes via also: an entry tagged only "short" appears under a backend variant with also: ["short"]', () => {
    const resume: JsonResume = { work: [{ name: 'Acme', meta: { tailor: { tags: ['short'] } } }] }
    const result = tailor(resume, makeVariant({ tag: 'backend', also: ['short'] }))
    expect(result.resume.work).toHaveLength(1)
  })

  it('emits all highlights when highlightTags is absent', () => {
    const resume: JsonResume = {
      work: [{ name: 'Acme', highlights: ['a', 'b', 'c'], meta: { tailor: { tags: ['backend'] } } }]
    }
    const result = tailor(resume, makeVariant({ tag: 'backend' }))
    expect((result.resume.work as any[])[0].highlights).toEqual(['a', 'b', 'c'])
  })

  it('unions "*" with active-tag highlightTags, preserving original order without duplicates', () => {
    const resume: JsonResume = {
      work: [
        {
          name: 'Acme',
          highlights: ['h0', 'h1', 'h2', 'h3'],
          meta: {
            tailor: {
              tags: ['backend', 'devops'],
              highlightTags: { '*': [1], backend: [0, 1], devops: [3] }
            }
          }
        }
      ]
    }
    const result = tailor(resume, makeVariant({ tag: 'backend', also: ['devops'] }))
    expect((result.resume.work as any[])[0].highlights).toEqual(['h0', 'h1', 'h3'])
  })

  it('silently ignores out-of-range highlight indices', () => {
    const resume: JsonResume = {
      work: [
        {
          name: 'Acme',
          highlights: ['h0', 'h1'],
          meta: { tailor: { tags: ['backend'], highlightTags: { backend: [0, 5] } } }
        }
      ]
    }
    const result = tailor(resume, makeVariant({ tag: 'backend' }))
    expect((result.resume.work as any[])[0].highlights).toEqual(['h0'])
  })

  it('emits all keywords when keywordTags is absent', () => {
    const resume: JsonResume = {
      skills: [{ name: 'Backend', keywords: ['Node.js', 'PHP', 'Laravel'], meta: { tailor: { tags: ['backend'] } } }]
    }
    const result = tailor(resume, makeVariant({ tag: 'backend' }))
    expect((result.resume.skills as any[])[0].keywords).toEqual(['Node.js', 'PHP', 'Laravel'])
  })

  it('unions "*" with active-tag keywordTags, preserving original order without duplicates', () => {
    const resume: JsonResume = {
      skills: [
        {
          name: 'Backend',
          keywords: ['Node.js', 'TypeScript', 'PHP', 'Laravel'],
          meta: {
            tailor: {
              tags: ['node-ts', 'laravel'],
              keywordTags: { '*': [0], 'node-ts': [0, 1], laravel: [2, 3] }
            }
          }
        }
      ]
    }
    const result = tailor(resume, makeVariant({ tag: 'node-ts' }))
    expect((result.resume.skills as any[])[0].keywords).toEqual(['Node.js', 'TypeScript'])
  })

  it('silently ignores out-of-range keyword indices', () => {
    const resume: JsonResume = {
      skills: [
        {
          name: 'Backend',
          keywords: ['Node.js', 'TypeScript'],
          meta: { tailor: { tags: ['node-ts'], keywordTags: { 'node-ts': [0, 5] } } }
        }
      ]
    }
    const result = tailor(resume, makeVariant({ tag: 'node-ts' }))
    expect((result.resume.skills as any[])[0].keywords).toEqual(['Node.js'])
  })

  it('emits all courses when courseTags is absent', () => {
    const resume: JsonResume = {
      education: [{ institution: 'MIT', courses: ['CS101', 'STAT200', 'ML301'], meta: { tailor: { tags: ['dev'] } } }]
    }
    const result = tailor(resume, makeVariant({ tag: 'dev' }))
    expect((result.resume.education as any[])[0].courses).toEqual(['CS101', 'STAT200', 'ML301'])
  })

  it('unions "*" with active-tag courseTags, preserving original order without duplicates', () => {
    const resume: JsonResume = {
      education: [
        {
          institution: 'MIT',
          courses: ['CS101', 'CS201', 'STAT200', 'STAT301'],
          meta: {
            tailor: {
              tags: ['dev', 'data'],
              courseTags: { '*': [0], dev: [0, 1], data: [2, 3] }
            }
          }
        }
      ]
    }
    const result = tailor(resume, makeVariant({ tag: 'dev' }))
    expect((result.resume.education as any[])[0].courses).toEqual(['CS101', 'CS201'])
  })

  it('silently ignores out-of-range course indices', () => {
    const resume: JsonResume = {
      education: [
        {
          institution: 'MIT',
          courses: ['CS101', 'CS201'],
          meta: { tailor: { tags: ['dev'], courseTags: { dev: [0, 8] } } }
        }
      ]
    }
    const result = tailor(resume, makeVariant({ tag: 'dev' }))
    expect((result.resume.education as any[])[0].courses).toEqual(['CS101'])
  })

  it('summary includes arrayStats for sections with taggable arrays', () => {
    const resume: JsonResume = {
      work: [
        { name: 'A', highlights: ['h0', 'h1', 'h2'], meta: { tailor: { tags: ['v'], highlightTags: { v: [0] } } } }
      ],
      skills: [
        { name: 'B', keywords: ['k0', 'k1'], meta: { tailor: { tags: ['v'], keywordTags: { v: [1] } } } }
      ]
    }
    const result = tailor(resume, makeVariant())
    expect(result.summary.sections.work.arrayStats).toEqual({ highlights: { before: 3, after: 1 } })
    expect(result.summary.sections.skills.arrayStats).toEqual({ keywords: { before: 2, after: 1 } })
  })

  it('labelPerTag: the primary tag wins over secondaries', () => {
    const resume: JsonResume = {
      skills: [
        {
          name: 'Backend',
          meta: {
            tailor: {
              tags: ['backend', 'short'],
              labelPerTag: { short: 'Short Label', backend: 'Primary Label' }
            }
          }
        }
      ]
    }
    const result = tailor(resume, makeVariant({ tag: 'backend', also: ['short'] }))
    expect((result.resume.skills as any[])[0].name).toBe('Primary Label')
  })

  it('basics merge: fields absent from the variant are left untouched', () => {
    const resume: JsonResume = { basics: { name: 'Jordan', email: 'j@example.com' } }
    const result = tailor(resume, makeVariant({ basics: { summary: 'New summary' } }))
    expect(result.resume.basics).toEqual({ name: 'Jordan', email: 'j@example.com', summary: 'New summary' })
  })

  it('basics merge: fields present in the variant override the master', () => {
    const resume: JsonResume = { basics: { summary: 'Old summary' } }
    const result = tailor(resume, makeVariant({ basics: { summary: 'New summary' } }), { quiet: true })
    expect(result.resume.basics?.summary).toBe('New summary')
  })

  it('warns when overriding a non-empty basics field', () => {
    const resume: JsonResume = { basics: { summary: 'Old summary' } }
    const warnings: string[] = []
    tailor(resume, makeVariant({ name: 'backend', basics: { summary: 'New summary' } }), {
      onWarning: (message) => warnings.push(message)
    })
    expect(warnings).toEqual(['[tailor] warn: overriding basics.summary with variant "backend"'])
  })

  it('does not warn when the master field was empty or absent', () => {
    const resume: JsonResume = { basics: {} }
    const warnings: string[] = []
    tailor(resume, makeVariant({ basics: { summary: 'New summary' } }), {
      onWarning: (message) => warnings.push(message)
    })
    expect(warnings).toEqual([])
  })

  it('sections.drop removes the section entirely, including from the summary', () => {
    const resume: JsonResume = { awards: [{ title: 'Award', meta: { tailor: { tags: ['v'] } } }] }
    const result = tailor(resume, makeVariant({ sections: { drop: ['awards'] } }))
    expect(result.resume.awards).toBeUndefined()
    expect(result.summary.sections.awards).toBeUndefined()
  })

  it('sections.order reorders keys, with unlisted sections appended in original order', () => {
    const resume: JsonResume = { basics: {}, work: [], skills: [], projects: [] }
    const result = tailor(resume, makeVariant({ sections: { order: ['skills', 'basics'] } }))
    expect(Object.keys(result.resume)).toEqual(['skills', 'basics', 'work', 'projects'])
  })

  it('limits cuts a section to the first N entries after filtering', () => {
    const resume: JsonResume = {
      work: [
        { name: 'A', meta: { tailor: { tags: ['v'] } } },
        { name: 'B', meta: { tailor: { tags: ['v'] } } },
        { name: 'C', meta: { tailor: { tags: ['v'] } } }
      ]
    }
    const result = tailor(resume, makeVariant({ limits: { work: 2 } }))
    expect((result.resume.work as any[]).map((entry) => entry.name)).toEqual(['A', 'B'])
  })

  it('strips meta.tailor from the output, dropping meta entirely when it becomes empty', () => {
    const resume: JsonResume = { work: [{ name: 'A', meta: { tailor: { tags: ['v'] } } }] }
    const result = tailor(resume, makeVariant())
    expect((result.resume.work as any[])[0].meta).toBeUndefined()
  })

  it('preserves other meta keys after stripping tailor', () => {
    const resume: JsonResume = { work: [{ name: 'A', meta: { tailor: { tags: ['v'] }, language: 'en' } }] }
    const result = tailor(resume, makeVariant())
    expect((result.resume.work as any[])[0].meta).toEqual({ language: 'en' })
  })

  it('does not mutate the input resume', () => {
    const resume: JsonResume = {
      basics: { summary: 'Old' },
      work: [{ name: 'A', highlights: ['h0'], meta: { tailor: { tags: ['v'] } } }]
    }
    const snapshot = JSON.parse(JSON.stringify(resume))
    tailor(resume, makeVariant({ basics: { summary: 'New' } }), { quiet: true })
    expect(resume).toEqual(snapshot)
  })
})
