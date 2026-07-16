import { defineConfig } from 'vitepress'
import { withThemeDefaults } from '@leapsight/vitepress-theme/config'
import { withKbDefaults } from '@leapsight/vitepress-kb/config'
import { blogContext, blogTransformPageData, emitFeeds } from '@leapsight/vitepress-blog/config'

// ---- Site identity ---------------------------------------------------------
// `siteNamespace` is the IRI base for this site's stable @ids. `namespaces`
// declares OTHER sites you cross-link into (here: a Bondy docs namespace),
// so references into them are recorded in the graph but not build-checked.
const hostname = 'https://blog.example.com'
const idPrefix = 'post'
const siteNamespace = 'https://blog.example.com/kb/'
const namespaces = { bondydoc: 'https://bondy.io/kb/' }

export default defineConfig(
  withThemeDefaults(
    withKbDefaults(
      {
        lang: 'en-GB',
        title: 'Acme Blog',
        description: 'Notes on graph-native documentation, built on the Leapsight VitePress template.',
        sitemap: { hostname },

        themeConfig: {
          nav: [
            { text: 'Blog', link: '/' },
            { text: 'Tags', link: '/tags/' },
            { text: 'Archive', link: '/archive' },
            { text: 'Graph', link: '/graph' }
          ],
          socialLinks: [{ icon: 'github', link: 'https://github.com/leapsight' }],
          footer: {
            message: 'Released under the Apache 2.0 License.',
            copyright: `Copyright © ${new Date().getFullYear()} Leapsight`
          }
        },

        // Per-page JSON-LD @graph + Open Graph / Twitter meta + canonical.
        transformPageData: blogTransformPageData({
          hostname,
          siteNamespace,
          idPrefix,
          namespaces,
          organization: { name: 'Acme', logo: '/logo.svg' },
          twitterSite: '@acme'
        }),

        // RSS + Atom + JSON feeds, written to the build output.
        async buildEnd(cfg) {
          await emitFeeds(cfg, {
            hostname,
            title: 'Acme Blog',
            description: 'Notes on graph-native documentation.',
            pattern: 'posts/*.md'
          })
        },

        // The shared packages ship raw .ts/.vue source.
        vite: {
          ssr: { noExternal: ['@leapsight/vitepress-kb', '@leapsight/vitepress-blog'] }
        }
      },
      // Register the typed-edge markdown rule against the blog ontology.
      { context: blogContext({ idPrefix, siteNamespace, namespaces }) }
    ),
    { markdown: {} }
  )
)
