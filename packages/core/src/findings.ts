/** Rule severity, ESLint-style: `off` drops a finding, `warn`/`error` route it into the matching bucket. */
export type Severity = 'off' | 'warn' | 'error'

/** A single check result: a machine-readable code, a JSON-pointer-ish path, and a human message. */
export interface Finding {
  code: string
  path: string
  message: string
  extra?: unknown
}

/** The accumulated outcome of running a set of checks against one input. */
export interface Result {
  errors: Finding[]
  warnings: Finding[]
}

export function createResult(): Result {
  return { errors: [], warnings: [] }
}

export function push(list: Finding[], code: string, path: string, message: string, extra?: unknown): void {
  list.push(extra !== undefined ? { code, path, message, extra } : { code, path, message })
}
