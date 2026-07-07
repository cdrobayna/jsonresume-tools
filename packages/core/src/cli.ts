export class CliUsageError extends Error {}

export interface ParsedArgs {
  files: string[]
  format: 'text' | 'json'
  configPath?: string
  ruleOverrides: Record<string, string>
  help: boolean
}

/** Parses the shared CLI surface both `jsonresume-parity` and `jsonresume-lint` expose. */
export function parseArgs(argv: string[]): ParsedArgs {
  const files: string[] = []
  const ruleOverrides: Record<string, string> = {}
  let format: 'text' | 'json' = 'text'
  let configPath: string | undefined
  let help = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      help = true
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

  return { files, format, configPath, ruleOverrides, help }
}

export interface RunCliOptions {
  name: string
  helpText: string
  run: (args: ParsedArgs) => Promise<{ hasErrors: boolean; output: string }>
}

/**
 * Shared CLI entry point: parses argv, handles `--help` and usage errors, invokes `run`,
 * prints its output, and returns the process exit code (`0` clean, `1` errors present,
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
