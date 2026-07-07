import { readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { CliUsageError } from '@jsonresume-tools/core'
// Named import, not default: ajv's CJS-authored types resolve `import Ajv from 'ajv'` to the
// module namespace (not the class) under `moduleResolution: NodeNext`, so `new Ajv(...)` fails
// to type-check. The class is also exported by name — use that instead.
import { Ajv, type ValidateFunction } from 'ajv'
import type { Variant } from './types/resume.js'

/** A variant that parsed as JSON but failed schema validation (or wasn't JSON at all). Maps to
 * CLI exit code 1, distinct from `CliUsageError`'s exit code 2 (bad arguments/missing files). */
export class ValidationError extends Error {}

// `tailor-variant.schema.json` lives at the package root, one level above both `src/` (when
// running from source, e.g. under vitest) and `dist/` (when running the built CLI) — resolving
// it relative to this module's URL works in both cases without needing `resolveJsonModule`.
const schemaUrl = new URL('../tailor-variant.schema.json', import.meta.url)
const schema: object = JSON.parse(readFileSync(schemaUrl, 'utf8'))

const ajv = new Ajv({ allErrors: true })
const validate: ValidateFunction = ajv.compile(schema)

function isEnoent(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT'
}

/**
 * Parses and validates a variant document against `tailor-variant.schema.json`, the single
 * source of truth also published for editor `$schema` autocompletion. Throws `ValidationError`
 * when the input isn't valid JSON or doesn't conform to the schema.
 */
export function loadVariantFromString(json: string): Variant {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch (err) {
    throw new ValidationError(`invalid variant: malformed JSON (${err instanceof Error ? err.message : String(err)})`)
  }

  if (!validate(data)) {
    const message = ajv.errorsText(validate.errors, { separator: '\n  ' })
    throw new ValidationError(`invalid variant:\n  ${message}`)
  }

  return data as Variant
}

/**
 * Reads and validates a variant file. A missing file is a usage error (`CliUsageError`); an
 * unreadable-as-JSON or schema-invalid file is a `ValidationError`.
 */
export async function loadVariant(filePath: string): Promise<Variant> {
  let content: string
  try {
    content = await readFile(filePath, 'utf8')
  } catch (err) {
    if (isEnoent(err)) throw new CliUsageError(`variant file not found: ${filePath}`)
    throw err
  }
  return loadVariantFromString(content)
}

/**
 * Loads every variant found in `dir` (default `variants/`), sorted by filename. Each file is
 * validated the same way `loadVariant` does, so a malformed variant surfaces immediately rather
 * than being silently omitted.
 */
export async function loadVariants(dir = 'variants'): Promise<Variant[]> {
  let filenames: string[]
  try {
    filenames = await readdir(dir)
  } catch (err) {
    if (isEnoent(err)) throw new CliUsageError(`variants directory not found: ${dir}`)
    throw err
  }

  const variants: Variant[] = []
  for (const filename of filenames.filter((name) => name.endsWith('.json')).sort()) {
    variants.push(await loadVariant(path.join(dir, filename)))
  }
  return variants
}

export interface VariantSummary {
  name: string
  description?: string
}

/** Lists `{ name, description }` for every variant in `dir` — the projection `list` prints. */
export async function listVariants(dir = 'variants'): Promise<VariantSummary[]> {
  const variants = await loadVariants(dir)
  return variants.map((variant) => ({ name: variant.name, description: variant.description }))
}
