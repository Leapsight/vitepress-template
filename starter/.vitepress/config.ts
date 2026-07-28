import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vitepress'
import { withThemeDefaults, buildContentSidebar } from '@leapsight/vitepress-template/theme/config'

// VitePress source root (this site keeps content at the package root).
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Serve under a sub-path by setting DOCS_BASE (e.g. '/docs/').
const base = process.env.DOCS_BASE ?? '/'

export default defineConfig(
  withThemeDefaults(
    {
      base,
      lang: 'en-GB',
      title: 'Acme Docs',
      description: 'Documentation starter built on the Leapsight VitePress theme.',

      head: [
        // Site-owned: favicons, fonts, analytics. Examples:
        // ['link', { rel: 'icon', href: '/favicon.ico' }],
        // ['script', { defer: 'true', 'data-domain': 'example.com', src: 'https://plausible.io/js/script.js' }]
      ],

      sitemap: {
        // Set your production hostname to emit sitemap.xml at build time.
        hostname: 'https://docs.example.com'
      },

      themeConfig: {
        logo: '/logo.svg',
        siteTitle: 'Acme Docs',

        nav: [
          { text: 'Guide', link: '/guide/' },
          { text: 'Reference', link: '/reference/' }
        ],

        sidebar: {
          '/guide/': buildContentSidebar(SRC, '/guide'),
          '/reference/': buildContentSidebar(SRC, '/reference')
        },

        // Shown by the <NavbarVersion> widget. Remove to hide it.
        versions: [{ version: '0.1.0', label: '0.1.0', current: true }],

        // Arbitrary site metadata, readable in markdown via <SiteMeta k="..."/>.
        metadata: {
          productVersion: '0.1.0'
        },

        socialLinks: [{ icon: 'github', link: 'https://github.com/leapsight' }],

        editLink: {
          pattern: 'https://github.com/leapsight/REPO/edit/main/:path',
          text: 'Edit this page on GitHub'
        },

        footer: {
          message: 'Released under the Apache 2.0 License.',
          copyright: `Copyright © ${new Date().getFullYear()} Leapsight`
        }
      }
    },
    {
      // Options for the shared markdown kit.
      markdown: {
        math: false // set true and add the KaTeX CSS to `head` if you need math
      }
    }
  )
)
