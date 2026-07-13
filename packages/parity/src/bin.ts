#!/usr/bin/env node
import { CONFIG_MODULE_NAME, loadConfig, readOwnVersion, report, runCli, type Severity } from '@jsonresume-tools/core'
import { resolveLocaleInputs } from './cli-locale.js'
import { checkParity, defaults } from './index.js'

const HELP = `Usage: jrp [options] <file...>    (alias: jsonresume-parity)

Checks structural and content parity across locale variants of a JSON Resume.
Files use the convention <anything>.<locale>.json (first file = baseline), or
an explicit "<locale>=<path>" override when the filename doesn't encode the locale.

Options:
  --rule <name>=<severity>   Override one rule's severity (off|warn|error)
  --format <text|json>       Output format (default: text)
  -c, --config <path>        Explicit config file path
  -h, --help                 Show this help
  --version                  Show version number

Examples:
  jrp resume.en.json resume.es.json
  jrp en=cv-main.json es=cv-espanol.json
  jrp --rule lengthRatio=off resume.en.json resume.es.json
  jrp --format json resume.en.json resume.es.json
`

function isSeverity(value: string): value is Severity {
  return value === 'off' || value === 'warn' || value === 'error'
}

const exitCode = await runCli(process.argv.slice(2), {
  name: 'jsonresume-parity',
  version: readOwnVersion(import.meta.url),
  helpText: HELP,
  async run(args) {
    const locales = resolveLocaleInputs(args.files)

    const config = await loadConfig({
      moduleName: CONFIG_MODULE_NAME,
      section: 'parity',
      explicitPath: args.configPath,
      defaults: {
        rules: defaults.rules,
        lengthRatio: defaults.lengthRatio,
        identityFields: defaults.identityFields,
        identityArrays: defaults.identityArrays,
        properNounFields: defaults.properNounFields
      }
    })

    const rules = { ...config.rules }
    for (const [name, severity] of Object.entries(args.ruleOverrides)) {
      if (!isSeverity(severity)) {
        throw new Error(`--rule ${name}=${severity}: severity must be one of off|warn|error`)
      }
      ;(rules as Record<string, Severity>)[name] = severity
    }

    const result = await checkParity({
      locales,
      rules,
      lengthRatio: config.lengthRatio,
      identityFields: config.identityFields,
      identityArrays: config.identityArrays,
      properNounFields: config.properNounFields
    })

    return {
      hasErrors: result.errors.length > 0,
      output: report(result, args.format)
    }
  }
})

process.exit(exitCode)
