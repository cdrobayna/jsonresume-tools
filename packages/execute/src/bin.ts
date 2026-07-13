#!/usr/bin/env node
import { readOwnVersion, runSubcommandCli } from '@jsonresume-tools/core'
import { runAll } from './commands/all.js'
import { runBuild } from './commands/build.js'
import { runCheck } from './commands/check.js'
import { runDoctor } from './commands/doctor.js'
import { runRun } from './commands/run.js'
import { runSetup } from './commands/setup.js'

const HELP = `Usage: jrx <command> [options]    (alias: jsonresume-execute)

Orchestrates jsonresume-lint, jsonresume-parity, jsonresume-tailor, and resume-cli across
languages and role variants. jrx does not bundle these tools — it detects each one where it's
installed and shells out to it. Run "jrx doctor" to see what's missing and how to install it.

Commands:
  build   Generate the full {role}.{lang}.json variant matrix
  check   Run every validator across masters + the variant matrix (QA gate)
  all     build -> check -> export (PDF/HTML via resume-cli) -> audit, one pipeline
  doctor  Show which tools are installed, their versions, and install hints for what's missing
  setup   Install the recommended toolchain (print-and-confirm)
  run     Resolve and exec an arbitrary tool through the same resolver (npx-style)

build:
  jrx build
    --masters <paths>          Comma-separated master resume paths (default: auto-detect)
    --lang <codes>              Comma-separated locale filter, e.g. en,es
    -d, --variants-dir <dirs>   Comma-separated <dir> or <lang>=<dir> overrides
    -O, --out-dir <path>        Output directory (default: dist)
    -v, --verbose                Show which entries survived per section
    -n, --dry-run                Print summaries without writing files
    -q, --quiet                  Silence basics-override warnings

check:
  jrx check
    --masters, --lang, --variants-dir, --out-dir   Same as build
    --theme <name>               Run the ATS audit step too (requires resume-cli + Chromium)
    -c, --config <path>          Explicit config file path (default --theme; see docs)
    -v, --verbose                 Show every step's output, not just failing ones

all:
  jrx all
    --masters, --lang, --variants-dir, --out-dir, --theme, --verbose   Same as build/check
    --format <pdf|html>          Export format when --theme is given (default: pdf)
    -c, --config <path>          Explicit config file path (default --theme; see docs)
    -n, --dry-run                 Skip the export step's actual rendering

doctor:
  jrx doctor

setup:
  jrx setup
    -y, --yes      Skip the confirmation prompt
    -n, --dry-run  Print the install command without running it
    -g, --global   Install globally instead of as a dev dependency

run:
  jrx run <tool> [-- <args...>]
    <tool> is one of lint|parity|tailor|resume, or any binary name on PATH/node_modules/.bin

Global options:
  -h, --help       Show this help
  -V, --version    Show version number

Examples:
  jrx build --out-dir dist
  jrx check --theme operations-precision
  jrx all --theme operations-precision --format pdf
  jrx doctor
  jrx setup --dry-run
  jrx run tailor -- list
`

const code = await runSubcommandCli(process.argv.slice(2), {
  name: 'jsonresume-execute',
  version: readOwnVersion(import.meta.url),
  helpText: HELP,
  commands: {
    build: { describe: 'Generate the full {role}.{lang}.json variant matrix', run: runBuild },
    check: { describe: 'Run every validator across masters + the variant matrix', run: runCheck },
    all: { describe: 'build -> check -> export -> audit, one pipeline', run: runAll },
    doctor: { describe: 'Show which tools are installed and how to install what is missing', run: runDoctor },
    setup: { describe: 'Install the recommended toolchain', run: runSetup },
    run: { describe: 'Resolve and exec an arbitrary tool (npx-style)', run: runRun }
  }
})

process.exit(code)
