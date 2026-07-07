import { emit, type Result, type RuleSeverities } from '@jsonresume-tools/core'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Checks `basics.email` has a plausible email shape. */
export function checkEmail(resume: unknown, ctx: { result: Result; rules: RuleSeverities }): void {
  const email = (resume as { basics?: { email?: unknown } } | null | undefined)?.basics?.email
  if (typeof email === 'string' && email.length > 0 && !EMAIL_RE.test(email)) {
    emit(ctx.result, ctx.rules, 'email', 'EMAIL_INVALID', '$.basics.email', `invalid email: "${email}"`)
  }
}
