#!/usr/bin/env node
import { loadConfig, readOwnVersion, reportJson, reportText, runCli, type Severity } from '@jsonresume-tools/core'
import { defaults, lint } from './index.js'

const HELP = `Usage: jsonresume-lint [options] <file...>

Runs per-file JSON Resume quality checks: date format and ordering, reverse-chronological
work/education sections, valid URLs and email, leftover placeholders, and (opt-in) schema
validation.

Options:
  --rule <name>=<severity>   Override one rule's severity (off|warn|error)
  --format <text|json>       Output format (default: text)
  -c, --config <path>        Explicit config file path
  -h, --help                 Show this help
  --version                  Show version number

Examples:
  jsonresume-lint resume.en.json
  jsonresume-lint resume.en.json resume.es.json
  jsonresume-lint --rule schema=error resume.en.json
  jsonresume-lint --format json resume.en.json resume.es.json
`

function isSeverity(value: string): value is Severity {
  return value === 'off' || value === 'warn' || value === 'error'
}

const exitCode = await runCli(process.argv.slice(2), {
  name: 'jsonresume-lint',
  version: readOwnVersion(import.meta.url),
  helpText: HELP,
  async run(args) {
    const config = await loadConfig({
      moduleName: 'jsonresumelint',
      explicitPath: args.configPath,
      defaults: { rules: defaults.rules }
    })

    const rules = { ...config.rules }
    for (const [name, severity] of Object.entries(args.ruleOverrides)) {
      if (!isSeverity(severity)) {
        throw new Error(`--rule ${name}=${severity}: severity must be one of off|warn|error`)
      }
      ;(rules as Record<string, Severity>)[name] = severity
    }

    const perFile = await Promise.all(
      args.files.map(async (file) => ({ file, result: await lint({ path: file, rules }) }))
    )

    const hasErrors = perFile.some(({ result }) => result.errors.length > 0)

    const output =
      args.format === 'json'
        ? perFile.length === 1
          ? reportJson(perFile[0].result)
          : JSON.stringify(
              perFile.map(({ file, result }) => ({ file, ...result })),
              null,
              2
            )
        : perFile.map(({ file, result }) => reportText(result, { label: file })).join('\n\n')

    return { hasErrors, output }
  }
})

process.exit(exitCode)
