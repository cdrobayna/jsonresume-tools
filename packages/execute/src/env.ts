import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { findOnPath } from './which.js'

const requireFromHere = createRequire(import.meta.url)

const CHROMIUM_CANDIDATES = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'chrome']

/**
 * Locates a system Chromium/Chrome binary for `resume export`/`resume audit` (resume-cli
 * renders through Puppeteer). Honors an already-set `PUPPETEER_EXECUTABLE_PATH` first, then
 * searches PATH. Returns undefined if nothing is found.
 */
export function detectChromium(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env.PUPPETEER_EXECUTABLE_PATH) return env.PUPPETEER_EXECUTABLE_PATH
  for (const bin of CHROMIUM_CANDIDATES) {
    const found = findOnPath(bin)
    if (found) return found
  }
  return undefined
}

export interface ChromiumEnv {
  PUPPETEER_EXECUTABLE_PATH: string
  RESUME_PUPPETEER_NO_SANDBOX: string
}

/**
 * Builds the env overlay `resume export`/`resume audit` need to render without downloading
 * their own Chromium — mirrors what the CV repo's Nix flake sets by hand
 * (`PUPPETEER_EXECUTABLE_PATH`, `RESUME_PUPPETEER_NO_SANDBOX`). Returns undefined if no
 * Chromium could be located; the caller should surface a clear error in that case rather than
 * silently running `resume export` without it.
 */
export function chromiumEnv(baseEnv: NodeJS.ProcessEnv = process.env): ChromiumEnv | undefined {
  const execPath = detectChromium(baseEnv)
  if (!execPath) return undefined
  return {
    PUPPETEER_EXECUTABLE_PATH: execPath,
    RESUME_PUPPETEER_NO_SANDBOX: '1'
  }
}

/**
 * Read-only probe for `jrx doctor`: resolves resume-cli's own bundled Puppeteer and asks it for
 * the Chrome it would launch — the exact resolution `resume export`/`resume audit` now fall back
 * to when no system Chromium is found (see `chromiumEnv`'s callers in `check.ts`/`all.ts`).
 * Deliberately kept separate from `detectChromium`/`chromiumEnv`, which remain the "explicit
 * override" path: this probe must never influence what env gets passed to the spawned
 * `resume-cli` process, only what `doctor` reports.
 *
 * Reaches into a *consuming* project's `node_modules` (resume-cli's own puppeteer, not a
 * dependency of this package), so every step is wrapped in try/catch and any failure just means
 * "couldn't determine it" rather than a thrown error.
 */
export function detectPuppeteerChromium(cwd: string = process.cwd()): string | undefined {
  try {
    let puppeteerSearchPaths = [cwd]
    try {
      const resumeCliPkgPath = requireFromHere.resolve('resume-cli/package.json', { paths: [cwd] })
      puppeteerSearchPaths = [path.dirname(resumeCliPkgPath), cwd]
    } catch {
      // resume-cli isn't resolvable by name from cwd (e.g. a pnpm layout without a matching
      // hoist) — fall back to resolving puppeteer from cwd alone.
    }

    const puppeteerEntry = requireFromHere.resolve('puppeteer', { paths: puppeteerSearchPaths })
    const puppeteer = requireFromHere(puppeteerEntry) as { executablePath?: () => string; default?: { executablePath?: () => string } }
    const executablePath = puppeteer.executablePath ?? puppeteer.default?.executablePath
    if (typeof executablePath !== 'function') return undefined

    const execPath = executablePath()
    return execPath && existsSync(execPath) ? execPath : undefined
  } catch {
    return undefined
  }
}
