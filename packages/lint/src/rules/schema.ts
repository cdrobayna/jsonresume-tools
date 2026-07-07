import { emit, type Result, type RuleSeverities } from '@jsonresume-tools/core'
import jsonResumeSchema from '@jsonresume/schema'

/** Converts a `['work', 0, 'startDate']`-style path array to this toolchain's `$.work[0].startDate` style. */
function toJsonPath(path: (string | number)[] | undefined): string {
  if (!path || path.length === 0) return '$'
  let out = '$'
  for (const segment of path) {
    out += typeof segment === 'number' ? `[${segment}]` : `.${segment}`
  }
  return out
}

/**
 * Validates against the official JSON Resume schema (via `@jsonresume/schema` — the same
 * package `resumed`'s own `validate()` uses under the hood). Opt-in (`schema: 'off'` by
 * default): the schema restricts several objects to known properties, so documents with
 * custom extension fields can fail it even when otherwise valid.
 */
export function checkSchema(resume: unknown, ctx: { result: Result; rules: RuleSeverities }): void {
  // The callback runs synchronously (no I/O) — capture into an always-array variable so reading
  // it after the call doesn't rely on cross-closure narrowing (TS can't prove the callback ran).
  let errors: { path?: (string | number)[]; message: string }[] = []
  jsonResumeSchema.validate(resume, (err) => {
    errors = err ?? []
  })

  for (const err of errors) {
    emit(ctx.result, ctx.rules, 'schema', 'SCHEMA', toJsonPath(err.path), `schema violation: ${err.message}`)
  }
}
