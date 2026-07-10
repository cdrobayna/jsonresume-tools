import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'jsonresume-tools',
  description:
    'A suite of independent tools for JSON Resume: multi-locale parity checks, per-file quality linting, role-tailored variants, and jrx, a unified CLI to orchestrate them all.',
  // Pages URL is https://cdrobayna.github.io/jsonresume-tools/
  base: '/jsonresume-tools/',
  cleanUrls: true,
  lastUpdated: true,

  head: [['link', { rel: 'icon', href: '/jsonresume-tools/favicon.svg' }]],

  themeConfig: {
    search: {
      provider: 'local'
    },

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/lint' },
      { text: 'FAQ', link: '/faq' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Which tool do I need?', link: '/guide/which-tool' },
          { text: 'Full workflow', link: '/guide/full-workflow' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'jsonresume-lint (jrl)', link: '/reference/lint' },
          { text: 'jsonresume-parity (jrp)', link: '/reference/parity' },
          { text: 'jsonresume-tailor (jrt)', link: '/reference/tailor' },
          { text: 'jsonresume-execute (jrx)', link: '/reference/execute' },
          { text: 'Config discovery', link: '/reference/config' }
        ]
      },
      {
        text: 'More',
        items: [{ text: 'FAQ', link: '/faq' }]
      }
    ],

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
