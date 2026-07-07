import type { Finding, Result, Severity } from './findings.js'

export type RuleSeverities = Record<string, Severity>

/**
 * Raises a finding for `ruleName`, routing it into `result.errors`, `result.warnings`, or
 * dropping it, based on the configured severity for that rule. Rules call this instead of
 * pushing directly to a list, so any rule's severity can be overridden via config — the
 * ESLint `off | warn | error` model the legacy single-file validator lacked.
 */
export function emit(
  result: Result,
  rules: RuleSeverities,
  ruleName: string,
  code: string,
  path: string,
  message: string,
  extra?: unknown
): void {
  const severity = resolveSeverity(rules, ruleName)
  if (severity === 'off') return

  const finding: Finding = extra !== undefined ? { code, path, message, extra } : { code, path, message }
  if (severity === 'error') {
    result.errors.push(finding)
  } else {
    result.warnings.push(finding)
  }
}

/** Looks up a rule's configured severity, falling back to `fallback` (default `'error'`) if unset. */
export function resolveSeverity(rules: RuleSeverities, ruleName: string, fallback: Severity = 'error'): Severity {
  return rules[ruleName] ?? fallback
}
