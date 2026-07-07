import { describe, expect, it, vi } from 'vitest'
import { CliUsageError, parseArgs, runSubcommandCli } from './cli.js'

describe('parseArgs', () => {
  it('collects positional files', () => {
    const args = parseArgs(['a.json', 'b.json'])
    expect(args.files).toEqual(['a.json', 'b.json'])
    expect(args.format).toBe('text')
  })

  it('parses --format json', () => {
    expect(parseArgs(['--format', 'json', 'a.json']).format).toBe('json')
  })

  it('rejects an invalid --format value', () => {
    expect(() => parseArgs(['--format', 'xml'])).toThrow(CliUsageError)
  })

  it('parses -c and --config as equivalent', () => {
    expect(parseArgs(['-c', 'my.config.js']).configPath).toBe('my.config.js')
    expect(parseArgs(['--config', 'my.config.js']).configPath).toBe('my.config.js')
  })

  it('rejects -c with no path', () => {
    expect(() => parseArgs(['-c'])).toThrow(CliUsageError)
  })

  it('parses repeated --rule name=severity overrides', () => {
    const args = parseArgs(['--rule', 'dateFormat=off', '--rule', 'url=warn', 'a.json'])
    expect(args.ruleOverrides).toEqual({ dateFormat: 'off', url: 'warn' })
  })

  it('rejects a malformed --rule value', () => {
    expect(() => parseArgs(['--rule', 'dateFormat'])).toThrow(CliUsageError)
  })

  it('rejects unknown flags', () => {
    expect(() => parseArgs(['--nope'])).toThrow(CliUsageError)
  })

  it('parses --help and -h', () => {
    expect(parseArgs(['--help']).help).toBe(true)
    expect(parseArgs(['-h']).help).toBe(true)
  })
})

describe('runSubcommandCli', () => {
  const noop = { describe: 'noop', run: async () => ({ code: 0 }) }

  it('prints help and exits 0 when no command is given', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const code = await runSubcommandCli([], { name: 'tool', helpText: 'HELP TEXT', commands: { noop } })
    expect(code).toBe(0)
    expect(log).toHaveBeenCalledWith('HELP TEXT')
    log.mockRestore()
  })

  it('prints help and exits 0 on --help/-h', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await runSubcommandCli(['--help'], { name: 'tool', helpText: 'HELP', commands: { noop } })).toBe(0)
    expect(await runSubcommandCli(['-h'], { name: 'tool', helpText: 'HELP', commands: { noop } })).toBe(0)
    log.mockRestore()
  })

  it('exits 2 with an unknown command', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const code = await runSubcommandCli(['bogus'], { name: 'tool', helpText: 'HELP', commands: { noop } })
    expect(code).toBe(2)
    expect(error).toHaveBeenCalledWith('tool: unknown command "bogus"')
    error.mockRestore()
  })

  it('dispatches to the matching command with the remaining argv', async () => {
    const run = vi.fn(async (rest: string[]) => ({ code: 0, stdout: `got:${rest.join(',')}` }))
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const code = await runSubcommandCli(['build', 'backend', '--out', 'x.json'], {
      name: 'tool',
      helpText: 'HELP',
      commands: { build: { describe: '', run } }
    })
    expect(code).toBe(0)
    expect(run).toHaveBeenCalledWith(['backend', '--out', 'x.json'])
    expect(log).toHaveBeenCalledWith('got:backend,--out,x.json')
    log.mockRestore()
  })

  it('propagates the command exit code and routes stdout/stderr', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const command = { describe: '', run: async () => ({ code: 1, stdout: 'out', stderr: 'warn' }) }
    const code = await runSubcommandCli(['go'], { name: 'tool', helpText: 'HELP', commands: { go: command } })
    expect(code).toBe(1)
    expect(log).toHaveBeenCalledWith('out')
    expect(error).toHaveBeenCalledWith('warn')
    log.mockRestore()
    error.mockRestore()
  })

  it('maps a thrown CliUsageError from a command to exit 2', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const command = {
      describe: '',
      run: async () => {
        throw new CliUsageError('bad flag')
      }
    }
    const code = await runSubcommandCli(['go'], { name: 'tool', helpText: 'HELP', commands: { go: command } })
    expect(code).toBe(2)
    expect(error).toHaveBeenCalledWith('tool: bad flag')
    error.mockRestore()
  })

  it('maps any other thrown error to exit 2', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const command = {
      describe: '',
      run: async () => {
        throw new Error('boom')
      }
    }
    const code = await runSubcommandCli(['go'], { name: 'tool', helpText: 'HELP', commands: { go: command } })
    expect(code).toBe(2)
    expect(error).toHaveBeenCalledWith('boom')
    error.mockRestore()
  })
})
