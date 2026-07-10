import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CliUsageError, reportText } from '@jsonresume-tools/core'
import { checkTailor } from './check.js'
import { tailor } from './tailor.js'
import type { JsonResume, Variant } from './types/resume.js'
import { loadVariant, loadVariants, ValidationError } from './variant.js'

export interface CommandResult {
  code: number
  stdout?: string
  stderr?: string
}

function isEnoent(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT'
}

interface ParsedFlags {
  positional: string[]
  flags: Record<string, string>
  booleans: Set<string>
}

/**
 * Hand-rolled flag parser shared by the three subcommands below — each has a different set of
 * `--flag <value>` / `--boolean-flag` options, so this stays generic instead of hardcoding any
 * one command's shape. Mirrors the style (and the "unknown flag throws `CliUsageError`"
 * convention) of `@jsonresume-tools/core`'s `parseArgs`, just parameterized per-command since
 * `build`/`list`/`check` don't share a flag surface the way `lint`/`parity` do.
 */
function parseFlags(argv: string[], valueFlags: string[], booleanFlags: string[]): ParsedFlags {
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
    } else {
      positional.push(arg)
    }
  }

  return { positional, flags, booleans }
}

async function readResume(resumePath: string): Promise<JsonResume | { code: 1; stderr: string }> {
  try {
    return JSON.parse(await readFile(resumePath, 'utf8'))
  } catch (err) {
    if (isEnoent(err)) throw new CliUsageError(`resume file not found: ${resumePath}`)
    return { code: 1, stderr: `invalid resume JSON: ${err instanceof Error ? err.message : String(err)}` }
  }
}

function isCommandResult(value: unknown): value is CommandResult {
  return typeof value === 'object' && value !== null && 'code' in value
}

/** `jsonresume-tailor build <variant> --resume <path> --out <path> [--variant-file <path>] [--dry-run] [--quiet]` */
export async function runBuild(argv: string[]): Promise<CommandResult> {
  const { positional, flags, booleans } = parseFlags(argv, ['resume', 'out', 'variant-file'], ['dry-run', 'quiet'])

  const [variantName] = positional
  if (!variantName) throw new CliUsageError('build requires a <variant> argument, e.g. "build backend"')
  if (!flags.resume) throw new CliUsageError('build requires --resume <path>')
  const dryRun = booleans.has('dry-run')
  if (!dryRun && !flags.out) throw new CliUsageError('build requires --out <path> (unless --dry-run)')
  const quiet = booleans.has('quiet')

  const resumeOrError = await readResume(flags.resume)
  if (isCommandResult(resumeOrError)) return resumeOrError
  const resume = resumeOrError

  const variantPath = flags['variant-file'] ?? path.join('variants', `${variantName}.json`)
  let variant: Variant
  try {
    variant = await loadVariant(variantPath)
  } catch (err) {
    if (err instanceof ValidationError) return { code: 1, stderr: err.message }
    throw err // CliUsageError (missing variant file) bubbles up to exit 2
  }

  const warnings: string[] = []
  const { resume: output, summary } = tailor(resume, variant, {
    quiet,
    input: flags.resume,
    onWarning: (message) => warnings.push(message)
  })

  const lines = [`[tailor] ${variant.name} → ${dryRun ? '(dry run)' : flags.out}`]
  for (const [section, sectionSummary] of Object.entries(summary.sections)) {
    const stats = Object.entries(sectionSummary.arrayStats ?? {})
      .map(([field, { before, after }]) => `${field}: ${before} → ${after}`)
      .join(', ')
    const extra = stats ? ` (${stats})` : ''
    lines.push(`[tailor] ${section}: ${sectionSummary.before} → ${sectionSummary.after} entries${extra}`)
  }

  if (!dryRun) {
    await writeFile(flags.out as string, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  }

  return {
    code: 0,
    stdout: lines.join('\n'),
    stderr: quiet || warnings.length === 0 ? undefined : warnings.join('\n')
  }
}

/** `jsonresume-tailor list [--variants-dir <path>]` */
export async function runList(argv: string[]): Promise<CommandResult> {
  const { flags } = parseFlags(argv, ['variants-dir'], [])
  const dir = flags['variants-dir'] ?? 'variants'

  let variants
  try {
    variants = await loadVariants(dir)
  } catch (err) {
    if (err instanceof ValidationError) return { code: 1, stderr: err.message }
    throw err
  }

  if (variants.length === 0) {
    return { code: 0, stdout: `no variants found in ${dir}` }
  }

  const lines = variants.map((variant) => (variant.description ? `${variant.name} — ${variant.description}` : variant.name))
  return { code: 0, stdout: lines.join('\n') }
}

/** `jsonresume-tailor check [<variant>] --resume <path> [--variants-dir <path>]` */
export async function runCheck(argv: string[]): Promise<CommandResult> {
  const { positional, flags } = parseFlags(argv, ['resume', 'variants-dir'], [])
  const [variantName] = positional
  if (!flags.resume) throw new CliUsageError('check requires --resume <path>')
  const dir = flags['variants-dir'] ?? 'variants'

  const resumeOrError = await readResume(flags.resume)
  if (isCommandResult(resumeOrError)) return resumeOrError
  const resume = resumeOrError

  let variants: Variant[]
  try {
    variants = variantName ? [await loadVariant(path.join(dir, `${variantName}.json`))] : await loadVariants(dir)
  } catch (err) {
    if (err instanceof ValidationError) return { code: 1, stderr: err.message }
    throw err
  }

  const result = checkTailor(resume, variants)
  const hasErrors = result.errors.length > 0
  return { code: hasErrors ? 1 : 0, stdout: reportText(result) }
}
