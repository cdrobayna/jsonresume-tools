import { describe, expect, it } from 'vitest'
import { CliUsageError, parseArgs } from './cli.js'

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
