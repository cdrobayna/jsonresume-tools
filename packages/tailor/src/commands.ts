import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CliUsageError, reportText } from '@jsonresume-tools/core'
import { checkTailor } from './check.js'
import { entryLabel, inspect } from './inspect.js'
import { FILTERABLE_SECTIONS, TAGGABLE_FIELDS, tailor } from './tailor.js'
import type { TailorSummary } from './tailor.js'
import type { JsonResume, ResumeEntry, Variant } from './types/resume.js'
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

function parseFlags(
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

function formatSummary(
  variantName: string,
  summary: TailorSummary,
  target: string,
  verbose: boolean,
  filteredResume: JsonResume
): string[] {
  const lines = [`[tailor] ${variantName} → ${target}`]
  for (const [section, sectionSummary] of Object.entries(summary.sections)) {
    const stats = Object.entries(sectionSummary.arrayStats ?? {})
      .map(([field, { before, after }]) => `${field}: ${before} → ${after}`)
      .join(', ')
    const extra = stats ? ` (${stats})` : ''
    lines.push(`[tailor] ${section}: ${sectionSummary.before} → ${sectionSummary.after} entries${extra}`)

    if (verbose) {
      const entries = filteredResume[section]
      if (Array.isArray(entries)) {
        for (const entry of entries as ResumeEntry[]) {
          const label = entryLabel(entry, section)
          const extras: string[] = []
          for (const { field } of TAGGABLE_FIELDS) {
            const values = entry[field]
            if (Array.isArray(values) && values.length > 0) {
              extras.push(`${values.length} ${field}`)
            }
          }
          const suffix = extras.length > 0 ? ` (${extras.join(', ')})` : ''
          lines.push(`[tailor]   - ${label}${suffix}`)
        }
      }
    }
  }
  return lines
}

export async function runBuild(argv: string[]): Promise<CommandResult> {
  const { positional, flags, booleans } = parseFlags(
    argv,
    ['resume', 'out', 'variant-file'],
    ['dry-run', 'quiet', 'verbose'],
    { r: 'resume', o: 'out', n: 'dry-run', q: 'quiet', v: 'verbose' }
  )

  const [variantName] = positional
  if (!variantName) throw new CliUsageError('build requires a <variant> argument, e.g. "build backend"')
  if (!flags.resume) throw new CliUsageError('build requires --resume <path>')
  const dryRun = booleans.has('dry-run')
  if (!dryRun && !flags.out) throw new CliUsageError('build requires --out <path> (unless --dry-run)')
  const quiet = booleans.has('quiet')
  const verbose = booleans.has('verbose')

  const resumeOrError = await readResume(flags.resume)
  if (isCommandResult(resumeOrError)) return resumeOrError
  const resume = resumeOrError

  const variantPath = flags['variant-file'] ?? path.join('variants', `${variantName}.json`)
  let variant: Variant
  try {
    variant = await loadVariant(variantPath)
  } catch (err) {
    if (err instanceof ValidationError) return { code: 1, stderr: err.message }
    throw err
  }

  const warnings: string[] = []
  const { resume: output, summary } = tailor(resume, variant, {
    quiet,
    input: flags.resume,
    onWarning: (message) => warnings.push(message)
  })

  const target = dryRun ? '(dry run)' : (flags.out as string)
  const lines = formatSummary(variant.name, summary, target, verbose, output)

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
  const { flags } = parseFlags(argv, ['variants-dir'], [], { d: 'variants-dir' })
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
  const { positional, flags } = parseFlags(argv, ['resume', 'variants-dir'], [], { r: 'resume', d: 'variants-dir' })
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

/** `jsonresume-tailor inspect --resume <path> [--section <name>] [--format text|json]` */
export async function runInspect(argv: string[]): Promise<CommandResult> {
  const { flags } = parseFlags(argv, ['resume', 'section', 'format'], [], { r: 'resume', s: 'section', f: 'format' })

  if (!flags.resume) throw new CliUsageError('inspect requires --resume <path>')
  const format = flags.format ?? 'text'
  if (format !== 'text' && format !== 'json') {
    throw new CliUsageError('--format must be "text" or "json"')
  }
  const sectionFilter = flags.section
  if (sectionFilter && !(FILTERABLE_SECTIONS as readonly string[]).includes(sectionFilter)) {
    throw new CliUsageError(`unknown section: ${sectionFilter}. Valid: ${FILTERABLE_SECTIONS.join(', ')}`)
  }

  const resumeOrError = await readResume(flags.resume)
  if (isCommandResult(resumeOrError)) return resumeOrError

  const entries = inspect(resumeOrError, sectionFilter)

  if (format === 'json') {
    return { code: 0, stdout: JSON.stringify(entries, null, 2) }
  }

  const lines: string[] = []
  for (const entry of entries) {
    lines.push(`${entry.section}[${entry.index}] ${entry.label}`)
    if (entry.tags.length > 0) {
      lines.push(`  tags: ${entry.tags.join(', ')}`)
    }
    for (const [field, values] of Object.entries(entry.taggableFields)) {
      lines.push(`  ${field}:`)
      values.forEach((value, i) => {
        lines.push(`    [${i}] ${value}`)
      })
      const metaKey = TAGGABLE_FIELDS.find((t) => t.field === field)?.metaKey
      if (metaKey && entry.tagMaps[metaKey]) {
        lines.push(`  ${metaKey}:`)
        for (const [tag, indices] of Object.entries(entry.tagMaps[metaKey])) {
          lines.push(`    ${tag}: [${indices.join(', ')}]`)
        }
      }
    }
    if (entry.labelPerTag) {
      lines.push('  labelPerTag:')
      for (const [tag, label] of Object.entries(entry.labelPerTag)) {
        lines.push(`    ${tag}: "${label}"`)
      }
    }
    lines.push('')
  }

  return { code: 0, stdout: lines.join('\n').trimEnd() }
}
