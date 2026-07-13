import type { CommandResult } from '@jsonresume-tools/core'
import { detectChromium, detectPuppeteerChromium } from '../env.js'
import { detectPackageManager, installCommand } from '../pm.js'
import { REGISTRY, resolveTool, type ToolId } from '../resolve.js'

export interface RunDoctorDeps {
  cwd?: string
}

const TOOL_ORDER: ToolId[] = ['lint', 'parity', 'tailor', 'resume']

/**
 * `jrx doctor` — reports which tools resolve, their versions and where they were found, plus a
 * PM-aware install hint for anything missing. Purely informational: always exits `0`.
 */
export async function runDoctor(_argv: string[], deps: RunDoctorDeps = {}): Promise<CommandResult> {
  const cwd = deps.cwd ?? process.cwd()
  const pm = detectPackageManager(cwd)

  const lines: string[] = []
  let missing = 0

  for (const id of TOOL_ORDER) {
    const entry = REGISTRY[id]
    const tool = resolveTool(id, { cwd })
    if (tool) {
      lines.push(`✓ ${entry.pkg}${tool.version ? ` (${tool.version})` : ''} — ${tool.source} — ${tool.execPath}`)
    } else {
      missing++
      lines.push(`✗ ${entry.pkg} — not found (${entry.describe})`)
      lines.push(`    install: ${installCommand(pm, [entry.pkg])}`)
    }
  }

  lines.push('')
  const systemChromium = detectChromium()
  const chromium = systemChromium ?? detectPuppeteerChromium(cwd)
  if (chromium) {
    lines.push(`✓ Chromium/Chrome — ${chromium}${systemChromium ? '' : ' (Puppeteer-managed)'}`)
  } else {
    lines.push('✗ Chromium/Chrome — not found (needed by `resume export`/`resume audit`)')
    lines.push('    install: your OS package manager, or set PUPPETEER_EXECUTABLE_PATH')
  }

  lines.push('')
  lines.push(missing === 0 ? 'All recommended tools are installed.' : `${missing} tool(s) missing. Run "jrx setup" to install them.`)

  return { code: 0, stdout: lines.join('\n') }
}
