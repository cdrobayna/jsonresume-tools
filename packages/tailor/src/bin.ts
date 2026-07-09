#!/usr/bin/env node
import { runSubcommandCli } from '@jsonresume-tools/core'
import { runBuild, runCheck, runList } from './commands.js'

const HELP = `Usage: jrt <command> [options]    (alias: jsonresume-tailor)

Generate role-tailored variants of a JSON Resume from a single annotated master resume.

Commands:
  build <variant>   Filter the master resume through a variant and write the result
  list              List the variants found in a variants directory
  check [<variant>] Check meta.tailor annotations for coherence against the variants

build:
  jrt build <variant>
    -r, --resume <path>       Master resume to filter (required)
    -o, --out <path>          Where to write the filtered resume (required unless -n)
    --variant-file <path>     Explicit variant path (default: variants/<variant>.json)
    -n, --dry-run             Print the summary without writing the output
    -q, --quiet               Silence basics-override warnings

list:
  jrt list
    -d, --variants-dir <path> Directory to scan (default: variants)

check:
  jrt check [<variant>]
    -r, --resume <path>       Master resume to check (required)
    -d, --variants-dir <path> Directory to scan when <variant> is omitted (default: variants)

Examples:
  jrt build backend -r resume.en.json -o resume.backend.en.json
  jrt list
  jrt check -r resume.en.json
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
