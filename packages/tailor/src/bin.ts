#!/usr/bin/env node
import { readOwnVersion, runSubcommandCli } from '@jsonresume-tools/core'
import { runBuild, runCheck, runInspect, runList } from './commands.js'

const HELP = `Usage: jrt <command> [options]    (alias: jsonresume-tailor)

Generate role-tailored variants of a JSON Resume from a single annotated master resume.

Commands:
  build <variant>   Filter the master resume through a variant and write the result
  inspect           Show indexed taggable fields and tag maps for resume entries
  list              List the variants found in a variants directory
  check [<variant>] Check meta.tailor annotations for coherence against the variants

Global options:
  -h, --help       Show this help
  -V, --version    Show version number

build (single):
  jrt build <variant>
    -r, --resume <path>       Master resume to filter (required)
    -o, --out <path>          Where to write the filtered resume (required unless -n)
    --variant-file <path>     Explicit variant path (default: variants/<variant>.json)
    -v, --verbose             Show which entries survived per section
    -n, --dry-run             Print the summary without writing the output
    -q, --quiet               Silence basics-override warnings

build (batch):
  jrt build -d <path>
    -r, --resume <path>       Master resume to filter (required)
    -d, --variants-dir <path> Directory of variant files to build
    -O, --out-dir <path>      Output directory (required unless -n)
    -v, --verbose             Show which entries survived per section
    -n, --dry-run             Print summaries without writing files
    -q, --quiet               Silence basics-override warnings

inspect:
  jrt inspect
    -r, --resume <path>       Master resume to inspect (required)
    -s, --section <name>      Filter to one section (e.g. work, skills)
    -f, --format <text|json>  Output format (default: text)

list:
  jrt list
    -d, --variants-dir <path> Directory to scan (default: variants)

check:
  jrt check [<variant>]
    -r, --resume <path>       Master resume to check (required)
    -d, --variants-dir <path> Directory to scan when <variant> is omitted (default: variants)

Examples:
  jrt build backend -r resume.en.json -o resume.backend.en.json
  jrt build -d variants/ -r resume.en.json -O dist/ -v
  jrt inspect -r resume.json -s work
  jrt list
  jrt check -r resume.en.json
`

const code = await runSubcommandCli(process.argv.slice(2), {
  name: 'jsonresume-tailor',
  version: readOwnVersion(import.meta.url),
  helpText: HELP,
  commands: {
    build: { describe: 'Filter the master resume through a variant and write the result', run: runBuild },
    inspect: { describe: 'Show indexed taggable fields and tag maps for resume entries', run: runInspect },
    list: { describe: 'List the variants found in a variants directory', run: runList },
    check: { describe: 'Check meta.tailor annotations for coherence against the variants', run: runCheck }
  }
})

process.exit(code)
