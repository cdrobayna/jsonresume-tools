#!/usr/bin/env node
// Generates docs/reference/<pkg>.md from packages/<pkg>/README.md.
//
// This is the single source of truth rule for reference docs: the package READMEs (which are
// also what renders on each package's npm page) stay canonical and hand-edited. This script
// mirrors them into VitePress pages with front-matter injected, badges stripped, and relative
// links rewritten to work on the docs site. The generated files are gitignored — never hand-edit
// docs/reference/{lint,parity,tailor,execute}.md; edit the source README instead and re-run
// `pnpm docs:prepare`.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// docs/.vitepress/scripts -> repo root
const repoRoot = join(__dirname, '..', '..', '..')
const docsReferenceDir = join(repoRoot, 'docs', 'reference')

const GITHUB_BLOB = 'https://github.com/cdrobayna/jsonresume-tools/blob/main'

const PACKAGES = [
  {
    dir: 'lint',
    slug: 'lint',
    title: 'jsonresume-lint (jrl)',
    description: 'Per-file quality checks for a single JSON Resume.'
  },
  {
    dir: 'parity',
    slug: 'parity',
    title: 'jsonresume-parity (jrp)',
    description: 'Structural and content parity checks across locale variants of a JSON Resume.'
  },
  {
    dir: 'tailor',
    slug: 'tailor',
    title: 'jsonresume-tailor (jrt)',
    description: 'Generate role-tailored variants of a JSON Resume from one annotated master.'
  },
  {
    dir: 'execute',
    slug: 'execute',
    title: 'jsonresume-execute (jrx)',
    description: 'Unified CLI that orchestrates lint, parity, and tailor across languages and roles.'
  }
]

// Matches one or more markdown badge links back to back, e.g.
// [![npm version](https://img.shields.io/npm/v/x.svg)](https://www.npmjs.com/package/x)
const BADGE_LINE_RE = /^(\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)\s*)+$/

// Known relative links used across package READMEs, rewritten to work on the docs site.
const LINK_REWRITES = [
  [/\]\(\.\.\/\.\.\/LICENSE\)/g, `](${GITHUB_BLOB}/LICENSE)`],
  [/\]\(\.\.\/lint\)/g, '](/reference/lint)'],
  [/\]\(\.\.\/parity\)/g, '](/reference/parity)'],
  [/\]\(\.\.\/tailor\)/g, '](/reference/tailor)'],
  [/\]\(\.\.\/execute\)/g, '](/reference/execute)'],
  [/\]\(\.\/tailor-variant\.schema\.json\)/g, `](${GITHUB_BLOB}/packages/tailor/tailor-variant.schema.json)`]
]

function stripBadgeBlock(content) {
  const lines = content.split('\n')
  const h1Index = lines.findIndex((l) => l.startsWith('# '))
  if (h1Index === -1) return content

  let i = h1Index + 1
  while (i < lines.length && lines[i].trim() === '') i++

  const headerEnd = (() => {
    let j = i
    while (j < lines.length && BADGE_LINE_RE.test(lines[j].trim())) j++
    return j
  })()

  if (headerEnd === i) return content // no badge block found

  const before = lines.slice(0, h1Index + 1)
  const after = lines.slice(headerEnd)
  while (after.length && after[0].trim() === '') after.shift()
  return [...before, '', ...after].join('\n')
}

function rewriteLinks(content) {
  return LINK_REWRITES.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), content)
}

function buildPage(pkg) {
  const readmePath = join(repoRoot, 'packages', pkg.dir, 'README.md')
  const raw = readFileSync(readmePath, 'utf8')

  const transformed = rewriteLinks(stripBadgeBlock(raw)).trimEnd()

  const frontMatter = ['---', `title: ${pkg.title}`, `description: ${pkg.description}`, '---', ''].join('\n')

  const banner = `<!-- GENERATED FROM packages/${pkg.dir}/README.md — do not edit; run \`pnpm docs:prepare\` -->\n\n`

  return `${frontMatter}\n${banner}${transformed}\n`
}

mkdirSync(docsReferenceDir, { recursive: true })

for (const pkg of PACKAGES) {
  const output = buildPage(pkg)
  const outPath = join(docsReferenceDir, `${pkg.slug}.md`)
  writeFileSync(outPath, output, 'utf8')
  console.log(`[docs:prepare] wrote docs/reference/${pkg.slug}.md`)
}
