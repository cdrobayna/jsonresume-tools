import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
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

  it('batch mode: -d builds all variants into -O', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jsonresume-tailor-test-'))
    dirs.push(dir)
    const result = await runBuild(['-d', VARIANTS_DIR, '-r', MASTER, '-O', dir, '-q'])

    expect(result.code).toBe(0)
    const files = (await readdir(dir)).sort()
    expect(files).toEqual(['backend.json', 'devops.json', 'short.json', 'sysadmin.json'])

    const written = JSON.parse(await readFile(path.join(dir, 'backend.json'), 'utf8'))
    expect(written.work).toHaveLength(4)
  })

  it('batch mode: locale extracted from resume filename', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jsonresume-tailor-test-'))
    dirs.push(dir)
    const localeResume = path.join(dir, 'resume.en.json')
    const content = await readFile(MASTER, 'utf8')
    const { writeFile: wf } = await import('node:fs/promises')
    await wf(localeResume, content)

    const outDir = path.join(dir, 'out')
    const result = await runBuild(['-d', VARIANTS_DIR, '-r', localeResume, '-O', outDir, '-q'])
    expect(result.code).toBe(0)
    const files = (await readdir(outDir)).sort()
    expect(files[0]).toBe('backend.en.json')
  })

  it('batch mode: --dry-run prints summaries without writing files', async () => {
    const result = await runBuild(['-d', VARIANTS_DIR, '-r', MASTER, '-n', '-q'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('(dry run)')
    expect(result.stdout).toContain('work:')
  })

  it('batch mode: errors when combining -d with positional variant', async () => {
    await expect(runBuild(['-d', VARIANTS_DIR, 'backend', '-r', MASTER, '-O', '/tmp/x']))
      .rejects.toThrow('cannot be combined')
  })

  it('batch mode: errors when combining -d with --variant-file', async () => {
    await expect(runBuild(['-d', VARIANTS_DIR, '--variant-file', BACKEND_VARIANT, '-r', MASTER, '-O', '/tmp/x']))
      .rejects.toThrow('cannot be combined')
  })

  it('batch mode: empty dir returns no variants message', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jsonresume-tailor-test-'))
    dirs.push(dir)
    const result = await runBuild(['-d', dir, '-r', MASTER, '-O', dir])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('no variants found')
  })

  it('batch mode: verbose shows entry names', async () => {
    const result = await runBuild(['-d', VARIANTS_DIR, '-r', MASTER, '-n', '-q', '-v'])
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('[tailor]   -')
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
