#!/usr/bin/env node
import { runSubcommandCli } from '@jsonresume-tools/core'
import { runBuild, runCheck, runList } from './commands.js'

const HELP = `Usage: jsonresume-tailor <command> [options]

Generate role-tailored variants of a JSON Resume from a single annotated master resume.

Commands:
  build <variant>   Filter the master resume through a variant and write the result
  list              List the variants found in a variants directory
  check [<variant>] Check meta.tailor annotations for coherence against the variants

build:
  jsonresume-tailor build <variant>
    --resume <path>          Master resume to filter (required)
    --out <path>              Where to write the filtered resume (required unless --dry-run)
    --variant-file <path>     Explicit variant path (default: variants/<variant>.json)
    --dry-run                 Print the summary without writing --out
    --quiet                   Silence basics-override warnings

list:
  jsonresume-tailor list
    --variants-dir <path>     Directory to scan (default: variants)

check:
  jsonresume-tailor check [<variant>]
    --resume <path>           Master resume to check (required)
    --variants-dir <path>     Directory to scan when <variant> is omitted (default: variants)

Examples:
  jsonresume-tailor build backend --resume resume.en.json --out resume.backend.en.json
  jsonresume-tailor list
  jsonresume-tailor check --resume resume.en.json
`

const code = await runSubcommandCli(process.argv.slice(2), {
  name: 'jsonresume-tailor',
  helpText: HELP,
  commands: {
    build: { describe: 'Filter the master resume through a variant and write the result', run: runBuild },
    list: { describe: 'List the variants found in a variants directory', run: runList },
    check: { describe: 'Check meta.tailor annotations for coherence against the variants', run: runCheck }
  }
})

process.exit(code)
