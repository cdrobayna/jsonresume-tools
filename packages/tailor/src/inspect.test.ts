import { describe, expect, it } from 'vitest'
import { entryLabel, inspect } from './inspect.js'
import type { JsonResume, ResumeEntry } from './types/resume.js'

function entry(overrides: Partial<ResumeEntry> = {}): ResumeEntry {
  return { name: 'Test', ...overrides }
}

describe('entryLabel', () => {
  it('work: name — position', () => {
    expect(entryLabel(entry({ name: 'Acme', position: 'Engineer' }), 'work')).toBe('Acme — Engineer')
  })

  it('work: only name if no position', () => {
    expect(entryLabel(entry({ name: 'Acme' }), 'work')).toBe('Acme')
  })

  it('education: institution — area', () => {
    expect(entryLabel(entry({ institution: 'MIT', area: 'CS' } as ResumeEntry), 'education')).toBe('MIT — CS')
  })

  it('skills: name', () => {
    expect(entryLabel(entry({ name: 'Backend' }), 'skills')).toBe('Backend')
  })

  it('projects: name', () => {
    expect(entryLabel(entry({ name: 'My App' }), 'projects')).toBe('My App')
  })

  it('awards: title', () => {
    expect(entryLabel(entry({ title: 'Best Paper' } as ResumeEntry), 'awards')).toBe('Best Paper')
  })

  it('volunteer: organization — position', () => {
    expect(entryLabel(entry({ organization: 'NGO', position: 'Lead' } as ResumeEntry), 'volunteer')).toBe('NGO — Lead')
  })

  it('falls back to (unnamed) when no identifying field', () => {
    expect(entryLabel(entry({ name: undefined }), 'skills')).toBe('(unnamed)')
  })
})

describe('inspect', () => {
  const resume: JsonResume = {
    work: [
      {
        name: 'Acme',
        position: 'Engineer',
        highlights: ['Built API', 'Led team'],
        meta: {
          tailor: {
            tags: ['backend', 'short'],
            highlightTags: { backend: [0], '*': [1] }
          }
        }
      }
    ],
    skills: [
      {
        name: 'Backend',
        keywords: ['Node.js', 'TypeScript', 'Go'],
        meta: {
          tailor: {
            tags: ['backend'],
            keywordTags: { backend: [0, 1] },
            labelPerTag: { backend: 'Core Backend' }
          }
        }
      },
      {
        name: 'Frontend',
        keywords: ['React'],
        meta: { tailor: { tags: ['frontend'] } }
      }
    ],
    projects: [
      {
        name: 'Side Project'
      }
    ]
  }

  it('lists entries with their taggable fields and indices', () => {
    const results = inspect(resume)
    const work0 = results.find((r) => r.section === 'work' && r.index === 0)!
    expect(work0.label).toBe('Acme — Engineer')
    expect(work0.tags).toEqual(['backend', 'short'])
    expect(work0.taggableFields.highlights).toEqual(['Built API', 'Led team'])
  })

  it('shows existing tag maps', () => {
    const results = inspect(resume)
    const work0 = results.find((r) => r.section === 'work')!
    expect(work0.tagMaps.highlightTags).toEqual({ backend: [0], '*': [1] })
  })

  it('shows labelPerTag when present', () => {
    const results = inspect(resume)
    const skill0 = results.find((r) => r.section === 'skills' && r.index === 0)!
    expect(skill0.labelPerTag).toEqual({ backend: 'Core Backend' })
  })

  it('omits labelPerTag when absent', () => {
    const results = inspect(resume)
    const skill1 = results.find((r) => r.section === 'skills' && r.index === 1)!
    expect(skill1.labelPerTag).toBeUndefined()
  })

  it('filters by section', () => {
    const results = inspect(resume, 'skills')
    expect(results.every((r) => r.section === 'skills')).toBe(true)
    expect(results).toHaveLength(2)
  })

  it('handles entries without meta.tailor', () => {
    const results = inspect(resume)
    const project = results.find((r) => r.section === 'projects')!
    expect(project.tags).toEqual([])
    expect(project.taggableFields).toEqual({})
    expect(project.tagMaps).toEqual({})
  })

  it('omits taggable fields with empty arrays', () => {
    const r: JsonResume = { work: [{ name: 'X', highlights: [], meta: { tailor: { tags: ['a'] } } }] }
    const results = inspect(r)
    expect(results[0].taggableFields).toEqual({})
  })
})
