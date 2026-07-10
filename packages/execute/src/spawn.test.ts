import { describe, expect, it } from 'vitest'
import { parseJsonOutput, spawnGate } from './spawn.js'

describe('spawnGate', () => {
  it('captures stdout, stderr, and exit code', async () => {
    const result = await spawnGate(process.execPath, [
      '-e',
      "process.stdout.write('out'); process.stderr.write('err'); process.exit(3)"
    ])
    expect(result).toEqual({ code: 3, stdout: 'out', stderr: 'err' })
  })

  it('defaults a null exit code (e.g. signal termination) to 1', async () => {
    const result = await spawnGate(process.execPath, ['-e', "process.kill(process.pid, 'SIGKILL')"])
    expect(result.code).not.toBe(0)
  })

  it('passes cwd through to the child process', async () => {
    const result = await spawnGate(process.execPath, ['-e', 'process.stdout.write(process.cwd())'], { cwd: '/tmp' })
    expect(result.stdout).toBe('/tmp')
  })

  it('rejects when the executable cannot be spawned', async () => {
    await expect(spawnGate('/definitely/not/a/real/binary', [])).rejects.toThrow()
  })
})

describe('parseJsonOutput', () => {
  it('parses valid JSON stdout', () => {
    const parsed = parseJsonOutput<{ ok: boolean }>({ code: 0, stdout: '{"ok":true}', stderr: '' })
    expect(parsed).toEqual({ ok: true })
  })

  it('returns undefined for non-JSON stdout instead of throwing', () => {
    expect(parseJsonOutput({ code: 0, stdout: 'not json', stderr: '' })).toBeUndefined()
  })
})
