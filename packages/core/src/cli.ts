import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export class CliUsageError extends Error {}

export interface ParsedArgs {
  files: string[]
  format: 'text' | 'json'
  configPath?: string
  ruleOverrides: Record<string, string>
  help: boolean
  version: boolean
}

/** Parses the shared CLI surface both `jsonresume-parity` and `jsonresume-lint` expose. */
export function parseArgs(argv: string[]): ParsedArgs {
  const files: string[] = []
  const ruleOverrides: Record<string, string> = {}
  let format: 'text' | 'json' = 'text'
  let configPath: string | undefined
  let help = false
  let version = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      help = true
    } else if (arg === '--version') {
      version = true
    } else if (arg === '--format') {
      const value = argv[++i]
      if (value !== 'text' && value !== 'json') {
        throw new CliUsageError(`--format must be "text" or "json", got "${value ?? '<missing>'}"`)
      }
      format = value
    } else if (arg === '-c' || arg === '--config') {
      const value = argv[++i]
      if (!value) throw new CliUsageError('-c/--config requires a path argument')
      configPath = value
    } else if (arg === '--rule') {
      const value = argv[++i]
      if (!value || !value.includes('=')) {
        throw new CliUsageError('--rule requires "name=severity", e.g. --rule dateFormat=off')
      }
      const [name, severity] = value.split('=')
      ruleOverrides[name] = severity
    } else if (arg.startsWith('--')) {
      throw new CliUsageError(`unknown flag: ${arg}`)
    } else {
      files.push(arg)
    }
  }

  return { files, format, configPath, ruleOverrides, help, version }
}

export interface RunCliOptions {
  name: string
  helpText: string
  /** Printed on `--version`. Typically `readOwnVersion(import.meta.url)`. */
  version?: string
  run: (args: ParsedArgs) => Promise<{ hasErrors: boolean; output: string }>
}

/**
 * Shared CLI entry point: parses argv, handles `--help`/`--version` and usage errors, invokes
 * `run`, prints its output, and returns the process exit code (`0` clean, `1` errors present,
 * `2` misuse). Warnings alone never produce a non-zero exit.
 */
export async function runCli(argv: string[], options: RunCliOptions): Promise<number> {
  let args: ParsedArgs
  try {
    args = parseArgs(argv)
  } catch (err) {
    if (err instanceof CliUsageError) {
      console.error(`${options.name}: ${err.message}`)
      console.error(options.helpText)
      return 2
    }
    throw err
  }

  if (args.version) {
    console.log(options.version ?? '0.0.0')
    return 0
  }

  if (args.help) {
    console.log(options.helpText)
    return 0
  }

  if (args.files.length === 0) {
    console.error(`${options.name}: no input files given`)
    console.error(options.helpText)
    return 2
  }

  try {
    const { hasErrors, output } = await options.run(args)
    console.log(output)
    return hasErrors ? 1 : 0
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    return 2
  }
}

export interface CommandResult {
  code: number
  stdout?: string
  stderr?: string
}

export interface Subcommand {
  describe: string
  run: (argv: string[]) => Promise<CommandResult>
}

export interface RunSubcommandCliOptions {
  name: string
  helpText: string
  /** Printed on `--version`/`-V`. Typically `readOwnVersion(import.meta.url)`. */
  version?: string
  commands: Record<string, Subcommand>
}

/**
 * Shared entry point for CLIs built around verbs (`build`, `list`, `check`, ...) rather than a
 * flat file list — a sibling to `runCli` for tools whose subcommands take different flags.
 * Owns the same lifecycle concerns `runCli` does (`--help`, unknown-input handling, exit codes,
 * stdout/stderr routing) while leaving per-command flag parsing to the command itself: each
 * `Subcommand.run` parses its own argv and returns its own exit code, so a caller can
 * distinguish e.g. a validation failure (1) from a usage error (2) without this harness knowing
 * about command-specific error types. A `CliUsageError` thrown by a command is still caught
 * here and mapped to exit `2`, matching `runCli`'s convention.
 */
export async function runSubcommandCli(argv: string[], options: RunSubcommandCliOptions): Promise<number> {
  const [cmd, ...rest] = argv

  if (!cmd || cmd === '--help' || cmd === '-h') {
    console.log(options.helpText)
    return 0
  }

  if (cmd === '--version' || cmd === '-V') {
    console.log(options.version ?? '0.0.0')
    return 0
  }

  const command = options.commands[cmd]
  if (!command) {
    console.error(`${options.name}: unknown command "${cmd}"`)
    console.error(options.helpText)
    return 2
  }

  try {
    const { code, stdout, stderr } = await command.run(rest)
    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)
    return code
  } catch (err) {
    if (err instanceof CliUsageError) {
      console.error(`${options.name}: ${err.message}`)
      return 2
    }
    console.error(err instanceof Error ? err.message : String(err))
    return 2
  }
}

export interface ParsedFlags {
  positional: string[]
  flags: Record<string, string>
  booleans: Set<string>
}

/**
 * Generic flag parser for verb-style CLIs, where each subcommand declares its own flag set
 * rather than sharing one fixed surface — the companion `runSubcommandCli` needs but `parseArgs`
 * can't provide (it bakes in the flat-CLI surface: `--rule`, `--format`, ...). Long flags
 * (`--foo`) are looked up in `valueFlags`/`booleanFlags`; short flags (`-f`, single character
 * only — no bundling, no `-fvalue`) are resolved through `shortFlags` to their long name.
 * Unknown or malformed flags throw `CliUsageError`. Everything else is positional.
 */
export function parseFlags(
  argv: string[],
  valueFlags: string[],
  booleanFlags: string[],
  shortFlags: Record<string, string> = {}
): ParsedFlags {
  const positional: string[] = []
  const flags: Record<string, string> = {}
  const booleans = new Set<string>()

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      if (booleanFlags.includes(name)) {
        booleans.add(name)
      } else if (valueFlags.includes(name)) {
        const value = argv[++i]
        if (value === undefined) throw new CliUsageError(`--${name} requires a value`)
        flags[name] = value
      } else {
        throw new CliUsageError(`unknown flag: ${arg}`)
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const long = shortFlags[arg[1]]
      if (!long) throw new CliUsageError(`unknown flag: ${arg}`)
      if (booleanFlags.includes(long)) {
        booleans.add(long)
      } else if (valueFlags.includes(long)) {
        const value = argv[++i]
        if (value === undefined) throw new CliUsageError(`-${arg[1]} requires a value`)
        flags[long] = value
      }
    } else {
      positional.push(arg)
    }
  }

  return { positional, flags, booleans }
}

export const LOCALE_RE = /\.([A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?)\.json$/

/** Extracts a trailing `.xx`/`.xx-YY` locale suffix from a filename, e.g. `resume.en.json` → `en`. */
export function extractLocale(filePath: string): string | undefined {
  return LOCALE_RE.exec(path.basename(filePath))?.[1]
}

/**
 * Reads the `version` field from the `package.json` one directory up from `importMetaUrl` —
 * i.e. `../package.json` relative to a built `dist/bin.js`, which is the package root. Lets
 * every CLI's `--version` report its real published version without hand-rolling a JSON read
 * (and without needing `resolveJsonModule` — this reads the file directly, no JSON import).
 */
export function readOwnVersion(importMetaUrl: string): string {
  const pkgPath = fileURLToPath(new URL('../package.json', importMetaUrl))
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string }
  return pkg.version ?? '0.0.0'
}
