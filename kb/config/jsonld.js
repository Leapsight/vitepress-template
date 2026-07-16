// SPDX-License-Identifier: Apache-2.0
//
// Per-page JSON-LD `@graph` emitter, for use in a site's `transformPageData`.
// Builds a linked schema.org-style graph node from frontmatter and pushes it
// into the page's head as a <script type="application/ld+json">. Kept generic:
// the node shape is supplied by a `build` callback (the blog package provides
// a BlogPosting builder); this module handles head plumbing and @graph merge.

/**
 * Push a JSON-LD `@graph` script into pageData.head.
 *
 * @param {object} pageData VitePress page data (has .frontmatter, .relativePath)
 * @param {object} siteConfig VitePress site config
 * @param {{
 *   build: (ctx: { frontmatter: object, url: string, site: object }) => object[] | object | null,
 *   context?: string
 * }} opts `build` returns one or more JSON-LD nodes for this page (or null to skip).
 */
export function injectJsonLd(pageData, siteConfig, opts) {
  const fm = pageData.frontmatter ?? {}
  const base = siteConfig?.site?.base ?? siteConfig?.base ?? '/'
  const url = '/' + String(pageData.relativePath || '').replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')

  const built = opts.build({ frontmatter: fm, url, site: siteConfig?.site ?? siteConfig })
  if (!built) return

  const nodes = Array.isArray(built) ? built : [built]
  if (!nodes.length) return

  const doc = {
    '@context': opts.context ?? 'https://schema.org',
    '@graph': nodes
  }

  pageData.frontmatter ??= {}
  pageData.frontmatter.head ??= []
  pageData.frontmatter.head.push([
    'script',
    { type: 'application/ld+json' },
    // Escape `<` to dodge the </script> XSS/parse hazard, per Next.js guidance.
    JSON.stringify(doc).replace(/</g, '\\u003c')
  ])

  // Suppress unused-var lint for base (kept for callers that resolve URLs).
  void base
}
