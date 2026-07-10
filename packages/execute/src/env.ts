import { findOnPath } from './which.js'

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
