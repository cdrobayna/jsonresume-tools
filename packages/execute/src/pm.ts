import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

export type PackageManager = 'pnpm' | 'yarn' | 'bun' | 'npm'

const LOCKFILES: Array<[string, PackageManager]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm']
]

function isPackageManager(value: string): value is PackageManager {
  return value === 'pnpm' || value === 'yarn' || value === 'bun' || value === 'npm'
}

/**
 * Detects the package manager for `cwd`'s project: walks up looking for a `package.json` with a
 * `packageManager` field first (most authoritative), then falls back to whichever lockfile is
 * present, then defaults to `npm`.
 */
export function detectPackageManager(cwd: string = process.cwd()): PackageManager {
  let dir = path.resolve(cwd)
  while (true) {
    const pkgPath = path.join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { packageManager?: string }
        const name = pkg.packageManager?.split('@')[0]
        if (name && isPackageManager(name)) return name
      } catch {
        // malformed package.json — keep searching up the tree
      }
    }
    for (const [file, pm] of LOCKFILES) {
      if (existsSync(path.join(dir, file))) return pm
    }
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return 'npm'
}

export interface InstallCommandOptions {
  global?: boolean
}

/** Builds the install command a user should run for `packages`, in the given package manager's syntax. */
export function installCommand(pm: PackageManager, packages: string[], opts: InstallCommandOptions = {}): string {
  const pkgs = packages.join(' ')
  if (opts.global) {
    switch (pm) {
      case 'pnpm':
        return `pnpm add -g ${pkgs}`
      case 'yarn':
        return `yarn global add ${pkgs}`
      case 'bun':
        return `bun add -g ${pkgs}`
      case 'npm':
        return `npm install -g ${pkgs}`
    }
  }
  switch (pm) {
    case 'pnpm':
      return `pnpm add -D ${pkgs}`
    case 'yarn':
      return `yarn add -D ${pkgs}`
    case 'bun':
      return `bun add -D ${pkgs}`
    case 'npm':
      return `npm install --save-dev ${pkgs}`
  }
}
