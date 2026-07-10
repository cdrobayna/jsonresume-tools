import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { CliUsageError } from '@jsonresume-tools/core'
import { afterEach, describe, expect, it } from 'vitest'
import type { SpawnFn, SpawnResult } from '../spawn.js'
import { runBuild } from './build.js'

interface Call {
  execPath: string
  args: string[]
}

function makeSpawnStub(result: Partial<SpawnResult> = {}): { spawn: SpawnFn; calls: Call[] } {
  const calls: Call[] = []
  const spawn: SpawnFn = async (execPath, args) => {
    calls.push({ execPath, args })
    return { code: 0, stdout: '', stderr: '', ...result }
  }
  return { spawn, calls }
}

describe('runBuild', () => {
  const dirs: string[] = []

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  /** A fixture repo with a fake `jsonresume-tailor` bin resolvable via node_modules/.bin, plus
   * bilingual masters and per-language variants dirs. */
  async function fixtureRepo(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-build-test-'))
    dirs.push(dir)
    await mkdir(path.join(dir, 'node_modules', '.bin'), { recursive: true })
    await writeFile(path.join(dir, 'node_modules', '.bin', 'jsonresume-tailor'), '')
    await writeFile(path.join(dir, 'resume.en.json'), '{}')
    await writeFile(path.join(dir, 'resume.es.json'), '{}')
    await mkdir(path.join(dir, 'variants', 'en'), { recursive: true })
    await mkdir(path.join(dir, 'variants', 'es'), { recursive: true })
    return dir
  }

  it('fans out one tailor build call per discovered master, with the right per-language variants dir', async () => {
    const cwd = await fixtureRepo()
    const { spawn, calls } = makeSpawnStub()

    const result = await runBuild(['--out-dir', 'dist'], { spawn, cwd })

    expect(result.code).toBe(0)
    expect(calls).toHaveLength(2)
    expect(calls[0].args).toEqual([
      'build',
      '--variants-dir',
      path.join('variants', 'en'),
      '--resume',
      path.join(cwd, 'resume.en.json'),
      '--out-dir',
      'dist'
    ])
    expect(calls[1].args).toEqual([
      'build',
      '--variants-dir',
      path.join('variants', 'es'),
      '--resume',
      path.join(cwd, 'resume.es.json'),
      '--out-dir',
      'dist'
    ])
  })

  it('defaults --out-dir to "dist"', async () => {
    const cwd = await fixtureRepo()
    const { spawn, calls } = makeSpawnStub()
    await runBuild([], { spawn, cwd })
    expect(calls[0].args).toContain('dist')
  })

  it('forwards --dry-run, --verbose, --quiet to each tailor invocation', async () => {
    const cwd = await fixtureRepo()
    const { spawn, calls } = makeSpawnStub()
    await runBuild(['--dry-run', '--verbose', '--quiet'], { spawn, cwd })
    for (const call of calls) {
      expect(call.args).toEqual(expect.arrayContaining(['--dry-run', '--verbose', '--quiet']))
    }
  })

  it('--lang filters which masters are built', async () => {
    const cwd = await fixtureRepo()
    const { spawn, calls } = makeSpawnStub()
    await runBuild(['--lang', 'en'], { spawn, cwd })
    expect(calls).toHaveLength(1)
    expect(calls[0].args).toContain(path.join(cwd, 'resume.en.json'))
  })

  it('--masters overrides auto-discovery', async () => {
    const cwd = await fixtureRepo()
    const { spawn, calls } = makeSpawnStub()
    const explicit = path.join(cwd, 'resume.en.json')
    await runBuild(['--masters', explicit], { spawn, cwd })
    expect(calls).toHaveLength(1)
    expect(calls[0].args).toContain(explicit)
  })

  it('reports the worst exit code across all fanned-out calls', async () => {
    const cwd = await fixtureRepo()
    let n = 0
    const calls: Call[] = []
    const spawn: SpawnFn = async (execPath, args) => {
      calls.push({ execPath, args })
      n++
      return { code: n === 1 ? 0 : 1, stdout: '', stderr: '' }
    }
    const result = await runBuild([], { spawn, cwd })
    expect(result.code).toBe(1)
  })

  it('returns 0 and a message when no masters are found, without touching the spawn fn', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-build-test-'))
    dirs.push(dir)
    const { spawn, calls } = makeSpawnStub()
    const result = await runBuild([], { spawn, cwd: dir })
    expect(result.code).toBe(0)
    expect(result.stdout).toContain('no master resume files found')
    expect(calls).toHaveLength(0)
  })

  it('throws a CliUsageError with an install hint when tailor is not resolvable', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'jrx-build-test-'))
    dirs.push(dir)
    await writeFile(path.join(dir, 'resume.json'), '{}')
    const { spawn } = makeSpawnStub()
    await expect(runBuild([], { spawn, cwd: dir })).rejects.toThrow(CliUsageError)
    await expect(runBuild([], { spawn, cwd: dir })).rejects.toThrow(/jsonresume-tailor not found/)
  })
})
