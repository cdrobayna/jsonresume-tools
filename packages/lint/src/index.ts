import { readFile } from 'node:fs/promises'
import { createResult, type Result, type RuleSeverities, type Severity } from '@jsonresume-tools/core'
import { checkChronology } from './rules/chronology.js'
import { checkDateFormat } from './rules/date-format.js'
import { checkDateOrder } from './rules/date-order.js'
import { checkEmail } from './rules/email.js'
import { checkPlaceholder } from './rules/placeholder.js'
import { checkSchema } from './rules/schema.js'
import { checkUrls } from './rules/url.js'

export type LintRuleName = 'dateFormat' | 'dateOrder' | 'chronology' | 'url' | 'email' | 'placeholder' | 'schema'

export type LintRules = Partial<Record<LintRuleName, Severity>>

export interface LintOptions {
  /** Read and JSON.parse this file. Mutually usable with `data` (data wins if both are set). */
  path?: string
  /** Already-parsed resume data — useful for tests or custom pipelines. */
  data?: unknown
  rules?: LintRules
}

export const defaults = {
  rules: {
    dateFormat: 'error',
    dateOrder: 'error',
    url: 'error',
    email: 'error',
    chronology: 'warn',
    placeholder: 'warn',
    // Opt-in: the official schema is strict (additionalProperties: false in places), so
    // documents with custom extension fields fail it even when otherwise valid.
    schema: 'off'
  } as Record<LintRuleName, Severity>
}

async function resolveInput(options: LintOptions): Promise<unknown> {
  if (options.data !== undefined) return options.data
  if (options.path) return JSON.parse(await readFile(options.path, 'utf8'))
  throw new Error('lint() needs either "path" or "data"')
}

/**
 * Runs per-file JSON Resume quality checks: date format and ordering, reverse-chronological
 * sections, valid URLs/email, leftover placeholders, and (opt-in) schema validation.
 */
export async function lint(options: LintOptions): Promise<Result> {
  const data = await resolveInput(options)
  const rules = { ...defaults.rules, ...options.rules } as unknown as RuleSeverities

  const result = createResult()
  const ctx = { result, rules }

  checkDateFormat(data, ctx)
  checkDateOrder(data, ctx)
  checkChronology(data, ctx)
  checkUrls(data, ctx)
  checkEmail(data, ctx)
  checkPlaceholder(data, ctx)
  checkSchema(data, ctx)

  return result
}
