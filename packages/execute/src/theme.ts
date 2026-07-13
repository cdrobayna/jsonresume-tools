import { loadConfig } from '@jsonresume-tools/core'

/**
 * Resolves the `--theme` value for `check`/`all`: the flag wins if given, otherwise falls back
 * to a `jsonresumeexecute` cosmiconfig file (same discovery as `jrl`/`jrp`). Skips the
 * filesystem search entirely when the flag is set and no explicit `--config` was passed — an
 * explicit `--config` is still loaded (and a missing file still errors) even if the flag ends up
 * winning, since passing it is a deliberate signal the file should exist.
 */
export async function resolveTheme(flags: Record<string, string>, cwd: string): Promise<string | undefined> {
  if (!flags.config && flags.theme) return flags.theme

  const config = await loadConfig<{ theme?: string }>({
    moduleName: 'jsonresumeexecute',
    explicitPath: flags.config,
    searchFrom: cwd,
    defaults: {}
  })

  return flags.theme ?? config.theme
}
