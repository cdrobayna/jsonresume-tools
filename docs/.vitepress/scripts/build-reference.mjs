#!/usr/bin/env node
// Generates docs/reference/<pkg>.md from packages/<pkg>/README.md, then mirrors every
// /reference/* page (the 4 generated ones plus the hand-authored config.md) into
// docs/es/reference/ so visiting a reference page from the Spanish site doesn't flip the
// surrounding nav/sidebar/footer chrome to English — VitePress picks locale purely from URL
// prefix, so the content must physically live under docs/es/ to keep the ES theme config.
// Reference content itself stays English in both locations (see docs/reference/config.md's
// scope note); the mirror only adds a short Spanish notice pointing that out.
//
// This is the single source of truth rule for reference docs: the package READMEs (which are
// also what renders on each package's npm page) stay canonical and hand-edited. This script
// mirrors them into VitePress pages with front-matter injected, badges stripped, and relative
// links rewritten to work on the docs site. The generated files are gitignored — never hand-edit
// docs/reference/{lint,parity,tailor,execute}.md or docs/es/reference/*.md; edit the source
// README (or, for config.md, docs/reference/config.md directly) and re-run `pnpm docs:prepare`.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// docs/.vitepress/scripts -> repo root
const repoRoot = join(__dirname, '..', '..', '..')
const docsReferenceDir = join(repoRoot, 'docs', 'reference')
const docsEsReferenceDir = join(repoRoot, 'docs', 'es', 'reference')

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

// Mirror every /reference/* page into docs/es/reference/ — same English content, hosted under
// /es/ so the page's locale (and therefore its nav/sidebar/footer) is Spanish. `config.md` isn't
// generated above (it's hand-authored), but it's still an English-only reference page, so it's
// mirrored the same way.
const ES_MIRROR_NOTICE =
  '::: info Esta página de referencia está solo en inglés\n' +
  'El contenido de referencia (generado desde el README de cada paquete) se mantiene en inglés ' +
  'en ambos idiomas del sitio; las guías y la FAQ sí están traducidas.\n' +
  ':::\n\n'

function mirrorToSpanish(slug) {
  const raw = readFileSync(join(docsReferenceDir, `${slug}.md`), 'utf8')
  const frontMatterMatch = raw.match(/^---\n[\s\S]*?\n---\n/)
  const frontMatter = frontMatterMatch ? frontMatterMatch[0] : ''
  const body = raw.slice(frontMatter.length).replace(/^\n+/, '')
  return `${frontMatter}\n${ES_MIRROR_NOTICE}${body}`
}

mkdirSync(docsEsReferenceDir, { recursive: true })

for (const slug of [...PACKAGES.map((pkg) => pkg.slug), 'config']) {
  const output = mirrorToSpanish(slug)
  const outPath = join(docsEsReferenceDir, `${slug}.md`)
  writeFileSync(outPath, output, 'utf8')
  console.log(`[docs:prepare] wrote docs/es/reference/${slug}.md (EN content, ES chrome)`)
}
