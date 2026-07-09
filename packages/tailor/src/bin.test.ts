import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import jsonResumeSchema from '@jsonresume/schema'
import { afterEach, describe, expect, it } from 'vitest'
import { runBuild, runCheck, runInspect, runList } from './commands.js'

const FIXTURES_DIR = fileURLToPath(new URL('../fixtures', import.meta.url))
const MASTER = path.join(FIXTURES_DIR, 'master.json')
const VARIANTS_DIR = path.join(FIXTURES_DIR, 'variants')
const BACKEND_VARIANT = path.join(VARIANTS_DIR, 'backend.json')

describe('runBuild', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  async function tempOutPath(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jsonresume-tailor-test-'))
    dirs.push(dir)
    return path.join(dir, 'out.json')
  }

  it('produces the expected file', async () => {
    const out = await tempOutPath()
    const result = await runBuild([
      'backend',
      '--resume',
      MASTER,
      '--variant-file',
      BACKEND_VARIANT,
      '--out',
      out,
      '--quiet'
    ])

    expect(result.code).toBe(0)
    const written = JSON.parse(await readFile(out, 'utf8'))
    expect(written.awards).toBeUndefined()
    expect(written.work).toHaveLength(4)
    expect(written.projects).toHaveLength(1)
  })

  it('--dry-run prints a summary without writing the output file', async () => {
    const out = await tempOutPath()
    const result = await runBuild([
      'backend',
      '--resume',
      MASTER,
      '--variant-file',
      BACKEND_VARIANT,
      '--out',
      out,
      '--dry-run',
      '--quiet'
    ])

    expect(result.code).toBe(0)
    expect(result.stdout).toContain('backend')
    expect(result.stdout).toContain('work:')
    await expect(readFile(out, 'utf8')).rejects.toThrow()
  })

  it('short flags (-r, -o, -q) produce the same result as long flags', async () => {
    const out = await tempOutPath()
    const result = await runBuild(['backend', '-r', MASTER, '--variant-file', BACKEND_VARIANT, '-o', out, '-q'])

    expect(result.code).toBe(0)
    const written = JSON.parse(await readFile(out, 'utf8'))
    expect(written.work).toHaveLength(4)
    expect(result.stderr).toBeUndefined()
  })

  it('--quiet suppresses the basics-override warning', async () => {
    const out = await tempOutPath()
    const result = await runBuild(['backend', '--resume', MASTER, '--variant-file', BACKEND_VARIANT, '--out', out, '--quiet'])
    expect(result.stderr).toBeUndefined()
  })

  it('--verbose shows entry names per section', async () => {
    const out = await tempOutPath()
    const result = await runBuild([
      'backend', '-r', MASTER, '--variant-file', BACKEND_VARIANT, '-o', out, '-q', '-v'
    ])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('[tailor]   -')
    expect(result.stdout).toContain('Northwind Traders')
  })

  it('without --verbose, does not show individual entry names', async () => {
    const out = await tempOutPath()
    const result = await runBuild([
      'backend', '-r', MASTER, '--variant-file', BACKEND_VARIANT, '-o', out, '-q'
    ])
    expect(result.code).toBe(0)
    expect(result.stdout).not.toContain('[tailor]   -')
  })

  it('without --quiet, reports the basics-override warning on stderr', async () => {
    const out = await tempOutPath()
    const result = await runBuild(['backend', '--resume', MASTER, '--variant-file', BACKEND_VARIANT, '--out', out])
    expect(result.stderr).toContain('overriding basics.summary')
  })

  it('produces a resume that validates against the official JSON Resume schema, has no tailor key, filters ' +
    'work, and applies basics/highlight/labelPerTag overrides from the variant', async () => {
    const out = await tempOutPath()
    await runBuild(['backend', '--resume', MASTER, '--variant-file', BACKEND_VARIANT, '--out', out, '--quiet'])
    const written = JSON.parse(await readFile(out, 'utf8'))

    expect(JSON.stringify(written)).not.toContain('tailor')
    expect(written.basics.summary).toBe(
      'Backend engineer with production experience across Node.js, PostgreSQL, and cloud infrastructure.'
    )

    const backendSkill = written.skills.find((skill: { name: string }) => skill.name === 'Core Backend Stack')
    expect(backendSkill).toBeDefined()

    const northwind = written.work.find((entry: { name: string }) => entry.name === 'Northwind Traders')
    expect(northwind.highlights).toHaveLength(2)

    let schemaErrors: unknown[] = []
    jsonResumeSchema.validate(written, (err) => {
      schemaErrors = err ?? []
    })
    expect(schemaErrors).toEqual([])
  })
})

describe('runList', () => {
  it('short flag -d works like --variants-dir', async () => {
    const result = await runList(['-d', VARIANTS_DIR])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('backend')
  })

  it('lists the variants found in the fixtures directory', async () => {
    const result = await runList(['--variants-dir', VARIANTS_DIR])
    expect(result.code).toBe(0)
    for (const name of ['backend', 'devops', 'sysadmin', 'short']) {
      expect(result.stdout).toContain(name)
    }
  })
})

describe('runInspect', () => {
  it('text format shows indexed highlights and tag maps', async () => {
    const result = await runInspect(['-r', MASTER])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('work[0]')
    expect(result.stdout).toContain('[0]')
    expect(result.stdout).toContain('tags:')
  })

  it('--section filters to one section', async () => {
    const result = await runInspect(['-r', MASTER, '-s', 'skills'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('skills[')
    expect(result.stdout).not.toContain('work[')
  })

  it('json format produces parseable output', async () => {
    const result = await runInspect(['-r', MASTER, '-f', 'json'])
    expect(result.code).toBe(0)
    const parsed = JSON.parse(result.stdout!)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed[0]).toHaveProperty('section')
    expect(parsed[0]).toHaveProperty('label')
    expect(parsed[0]).toHaveProperty('taggableFields')
  })

  it('unknown section throws CliUsageError', async () => {
    await expect(runInspect(['-r', MASTER, '-s', 'bogus'])).rejects.toThrow('unknown section')
  })
})

describe('runCheck', () => {
  it('short flags -r and -d work like --resume and --variants-dir', async () => {
    const result = await runCheck(['-r', MASTER, '-d', VARIANTS_DIR])
    expect(result.code).toBe(0)
  })

  it('runs cleanly against the fixture master and all fixture variants', async () => {
    const result = await runCheck(['--resume', MASTER, '--variants-dir', VARIANTS_DIR])
    expect(result.code).toBe(0)
  })
})
