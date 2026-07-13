import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts', bin: 'src/bin.ts' },
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  dts: { resolve: true },
  noExternal: ['@jsonresume-tools/core'],
  // cosmiconfig comes in via the bundled core (config.ts), not direct use here — see AGENTS.md
  external: ['typescript', 'cosmiconfig']
})
