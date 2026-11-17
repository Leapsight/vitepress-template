/**
 * @leapsight/vitepress-template/theme/config — node-side config kit.
 *
 * Usage in a site's `.vitepress/config.ts`:
 *
 *   import { defineConfig } from 'vitepress'
 *   import { withThemeDefaults, buildContentSidebar } from '@leapsight/vitepress-template/theme/config'
 *
 *   export default defineConfig(withThemeDefaults({
 *     title: 'My Site',
 *     themeConfig: {
 *       nav: [...],
 *       sidebar: { '/guide/': buildContentSidebar(SRC, '/guide') }
 *     }
 *   }))
 */
import { applyMarkdown } from './markdown.js'
import { codeGroupChoices } from '../src/lib/code-group-choices.js'

export { applyMarkdown } from './markdown.js'
export { buildContentSidebar, humanize } from './sidebar.js'

const THEME_PKG = '@leapsight/vitepress-template'

/**
 * Merge sensible defaults with a site's config:
 *
 *   - `cleanUrls`, `lastUpdated` on
 *   - local search (unless the site configures its own)
 *   - the shared markdown kit (containers, v-pre fix, title
 *     injection), composed BEFORE the site's own `markdown.config`
 *   - an inline `<head>` script that puts named code groups
 *     (`::: code-group NAME`) on the reader's choice while the page is
 *     parsed, so it is never painted on another tab. It is
 *     `codeGroupChoices`, the function the client imports, serialised with
 *     toString(). Checked with every script file blocked by
 *     theme/test/code-group-sync.browser.mjs. A site whose
 *     Content-Security-Policy forbids inline scripts loses only this: the
 *     client still applies the choice once it has started.
 *   - `vite.ssr.noExternal` for the theme package (it ships raw
 *     `.vue`/`.ts` source)
 *   - `vite.optimizeDeps.exclude` for it too: esbuild's dev pre-bundle
 *     leaves the `.vue` files out, so they import a second copy of the
 *     `.ts` modules — a second POSTS_KEY, and every component reading
 *     posts through inject() (SeriesNav, AnnouncementBanner, …) found
 *     none under `vitepress dev`. Excluded, there is one module graph.
 *
 * @param {import('vitepress').UserConfig} [userConfig]
 * @param {{ markdown?: Parameters<typeof applyMarkdown>[1] }} [opts]
 * @returns {import('vitepress').UserConfig}
 */
export function withThemeDefaults(userConfig = {}, opts = {}) {
  const userMarkdown = userConfig.markdown ?? {}
  const userVite = userConfig.vite ?? {}
  const userSsr = userVite.ssr ?? {}

  return {
    cleanUrls: true,
    lastUpdated: true,
    ...userConfig,

    head: [...(userConfig.head ?? []), ['script', {}, `(${codeGroupChoices})().applyWhileParsing()`]],

    markdown: {
      ...userMarkdown,
      config(md) {
        // The site's own `base` feeds the containers that emit raw HTML,
        // which VitePress's link rewriting never sees. An explicit
        // opts.markdown.base still wins.
        applyMarkdown(md, { base: userConfig.base ?? '/', ...opts.markdown })
        userMarkdown.config?.(md)
      }
    },

    themeConfig: {
      search: { provider: 'local' },
      ...userConfig.themeConfig
    },

    vite: {
      ...userVite,
      ssr: {
        ...userSsr,
        noExternal: mergeNoExternal(userSsr.noExternal)
      },
      optimizeDeps: {
        ...userVite.optimizeDeps,
        exclude: [...new Set([THEME_PKG, ...(userVite.optimizeDeps?.exclude ?? [])])]
      }
    }
  }
}

function mergeNoExternal(existing) {
  if (existing === true) return true
  if (existing == null) return [THEME_PKG]
  const list = Array.isArray(existing) ? existing : [existing]
  return list.includes(THEME_PKG) ? list : [THEME_PKG, ...list]
}
