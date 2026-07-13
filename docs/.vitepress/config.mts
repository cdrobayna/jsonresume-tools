import { defineConfig } from 'vitepress'

// Reference pages are generated 1:1 from packages/*/README.md (plus the hand-authored config.md)
// and stay English-only in content — see docs/reference/config.md's scope note. They're also
// mirrored under docs/es/reference/ (same English content, see build-reference.mjs) purely so
// VitePress's URL-prefix locale detection keeps the Spanish nav/sidebar/footer chrome instead of
// flipping to English when a Spanish-site visitor opens a reference page.
const referenceItemsEn = [
  { text: 'jsonresume-parity (jrp)', link: '/reference/parity' },
  { text: 'jsonresume-tailor (jrt)', link: '/reference/tailor' },
  { text: 'jsonresume-lint (jrl)', link: '/reference/lint' },
  { text: 'jsonresume-execute (jrx)', link: '/reference/execute' },
  { text: 'Config discovery', link: '/reference/config' }
]

const referenceItemsEs = [
  { text: 'jsonresume-parity (jrp) (EN)', link: '/es/reference/parity' },
  { text: 'jsonresume-tailor (jrt) (EN)', link: '/es/reference/tailor' },
  { text: 'jsonresume-lint (jrl) (EN)', link: '/es/reference/lint' },
  { text: 'jsonresume-execute (jrx) (EN)', link: '/es/reference/execute' },
  { text: 'Configuración (EN)', link: '/es/reference/config' }
]

export default defineConfig({
  title: 'jsonresume-tools',
  description:
    'A suite of independent tools for JSON Resume: multi-locale parity checks, role-tailored variants, per-file quality linting, and jrx, a unified CLI that orchestrates all three (plus resume-cli) across languages and roles.',
  // Pages URL is https://cdrobayna.github.io/jsonresume-tools/
  base: '/jsonresume-tools/',
  cleanUrls: true,
  lastUpdated: true,

  head: [['link', { rel: 'icon', href: '/jsonresume-tools/favicon.svg' }]],

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/getting-started' },
          { text: 'Reference', link: '/reference/parity' },
          { text: 'FAQ', link: '/faq' }
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Getting started', link: '/guide/getting-started' },
              { text: 'Start with an example', link: '/guide/start-with-an-example' },
              { text: 'Which tool do I need?', link: '/guide/which-tool' },
              { text: 'Full workflow', link: '/guide/full-workflow' }
            ]
          },
          { text: 'Reference', items: referenceItemsEn },
          { text: 'More', items: [{ text: 'FAQ', link: '/faq' }] }
        ]
      }
    },
    es: {
      label: 'Español',
      lang: 'es',
      link: '/es/',
      title: 'jsonresume-tools',
      description:
        'Un conjunto de herramientas independientes para JSON Resume: chequeos de paridad multi-idioma, variantes por rol, chequeos de calidad por archivo, y jrx, una CLI unificada que orquesta las tres (más resume-cli) entre idiomas y roles.',
      themeConfig: {
        nav: [
          { text: 'Guía', link: '/es/guide/getting-started' },
          { text: 'Referencia', link: '/es/reference/parity' },
          { text: 'FAQ', link: '/es/faq' }
        ],
        sidebar: [
          {
            text: 'Guía',
            items: [
              { text: 'Primeros pasos', link: '/es/guide/getting-started' },
              { text: 'Empieza con un ejemplo', link: '/es/guide/start-with-an-example' },
              { text: '¿Qué herramienta necesito?', link: '/es/guide/which-tool' },
              { text: 'Flujo completo', link: '/es/guide/full-workflow' }
            ]
          },
          { text: 'Referencia', items: referenceItemsEs },
          { text: 'Más', items: [{ text: 'FAQ', link: '/es/faq' }] }
        ]
      }
    }
  },

  // Shared across all locales unless overridden above (search, social links, footer, edit link).
  themeConfig: {
    search: {
      provider: 'local'
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/cdrobayna/jsonresume-tools' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © jsonresume-tools contributors'
    },

    editLink: {
      pattern: 'https://github.com/cdrobayna/jsonresume-tools/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
