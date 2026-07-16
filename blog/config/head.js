// SPDX-License-Identifier: Apache-2.0
//
// Per-page SEO head: a linked schema.org JSON-LD @graph (BlogPosting ⇄ Person
// ⇄ Organization ⇄ WebSite) plus Open Graph / Twitter meta and a canonical
// link. Wire into a site's `transformPageData`:
//
//     import { blogTransformPageData } from '@leapsight/vitepress-blog/config'
//     transformPageData: blogTransformPageData({
//       hostname: 'https://blog.example.com',
//       siteNamespace: 'https://blog.example.com/kb/',
//       organization: { name: 'Acme', logo: '/logo.svg' }
//     })
//
// The @graph is what makes posts linked RDF nodes rather than isolated blobs:
// `about`/`mentions` carry the @id URIs of whatever the post links to,
// including cross-site references into a docs namespace.

import { injectJsonLd } from '@leapsight/vitepress-kb/config'
import { buildOntology } from '@leapsight/vitepress-kb/config'
import { blogContext } from './kb-preset.js'

function toArray(v) {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}
function deriveId(url, idPrefix) {
  if (url === '/') return `${idPrefix}:home`
  const path = url.replace(/^\/+/, '').replace(/\/+$/, '')
  return `${idPrefix}:` + (path || 'home')
}
/** Collect object-property targets (CURIE | {@id} | array) as CURIE strings. */
function targets(fm, key) {
  return toArray(fm[key])
    .map((v) => (typeof v === 'string' ? v : v && typeof v === 'object' ? v['@id'] : undefined))
    .filter(Boolean)
}

/**
 * @param {{
 *   hostname: string,
 *   siteNamespace: string,
 *   idPrefix?: string,
 *   namespaces?: Record<string,string>,
 *   siteName?: string,
 *   organization?: { name: string, logo?: string, url?: string },
 *   twitterSite?: string,
 *   postPathPrefix?: string
 * }} options
 * @returns {(pageData: object, ctx: { siteConfig: object }) => void}
 */
export function blogTransformPageData(options) {
  const {
    hostname,
    siteNamespace,
    idPrefix = 'post',
    namespaces = {},
    organization,
    twitterSite,
    postPathPrefix = '/posts/'
  } = options
  if (!hostname) throw new Error('[blog] blogTransformPageData: `hostname` is required')
  if (!siteNamespace) throw new Error('[blog] blogTransformPageData: `siteNamespace` is required')

  const { expandCurie } = buildOntology(blogContext({ idPrefix, siteNamespace, namespaces }))
  const origin = hostname.replace(/\/$/, '')

  return function transformPageData(pageData, ctx) {
    const fm = pageData.frontmatter ?? {}
    const base = ctx?.siteConfig?.site?.base ?? '/'
    const siteName = options.siteName ?? ctx?.siteConfig?.site?.title ?? 'Blog'

    const url = '/' + String(pageData.relativePath || '').replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
    const canonical = fm.canonical ?? origin + (base === '/' ? '' : base.replace(/\/$/, '')) + url
    const isPost = url.startsWith(postPathPrefix) && !url.endsWith('/')

    const title = fm.title ?? pageData.title ?? siteName
    const description = fm.description ?? fm.excerpt ?? ctx?.siteConfig?.site?.description ?? ''

    // ---- Open Graph / Twitter / canonical ----
    pageData.frontmatter ??= {}
    pageData.frontmatter.head ??= []
    const head = pageData.frontmatter.head
    const push = (tag, attrs) => head.push([tag, attrs])

    push('link', { rel: 'canonical', href: canonical })
    push('meta', { property: 'og:title', content: title })
    if (description) push('meta', { property: 'og:description', content: description })
    push('meta', { property: 'og:type', content: isPost ? 'article' : 'website' })
    push('meta', { property: 'og:url', content: canonical })
    push('meta', { property: 'og:site_name', content: siteName })
    if (fm.cover) push('meta', { property: 'og:image', content: origin + fm.cover })
    push('meta', { name: 'twitter:card', content: fm.cover ? 'summary_large_image' : 'summary' })
    if (twitterSite) push('meta', { name: 'twitter:site', content: twitterSite })
    if (isPost && fm.date) push('meta', { property: 'article:published_time', content: new Date(fm.date).toISOString() })

    // ---- JSON-LD @graph ----
    injectJsonLd(pageData, ctx?.siteConfig, {
      build() {
        const websiteId = origin + '/#website'
        const orgId = origin + '/#organization'
        const graph = []

        const org = organization
          ? {
              '@type': 'Organization',
              '@id': orgId,
              name: organization.name,
              url: organization.url ?? origin + '/',
              ...(organization.logo ? { logo: origin + organization.logo } : {})
            }
          : null
        if (org) graph.push(org)

        graph.push({
          '@type': 'WebSite',
          '@id': websiteId,
          url: origin + '/',
          name: siteName,
          ...(org ? { publisher: { '@id': orgId } } : {})
        })

        if (!isPost) return graph

        const nodeIri = expandCurie(
          typeof fm['@id'] === 'string' && fm['@id'] ? fm['@id'] : deriveId(url, idPrefix)
        )
        const about = [...targets(fm, 'schema:about')].map((c) => ({ '@id': expandCurie(c) }))
        const mentions = [...targets(fm, 'schema:mentions')].map((c) => ({ '@id': expandCurie(c) }))
        const authors = toArray(fm.author).map((name) => ({ '@type': 'Person', name }))

        graph.push({
          '@type': 'BlogPosting',
          '@id': nodeIri + '#post',
          isPartOf: { '@id': websiteId },
          mainEntityOfPage: canonical,
          url: canonical,
          headline: title,
          name: title,
          ...(description ? { description } : {}),
          ...(fm.date ? { datePublished: new Date(fm.date).toISOString() } : {}),
          ...(fm.lastUpdated ? { dateModified: new Date(fm.lastUpdated).toISOString() } : {}),
          ...(authors.length ? { author: authors } : {}),
          ...(org ? { publisher: { '@id': orgId } } : {}),
          ...(toArray(fm.tags).length ? { keywords: toArray(fm.tags).join(', ') } : {}),
          ...(about.length ? { about } : {}),
          ...(mentions.length ? { mentions } : {}),
          ...(fm.series ? { isPartOf: { '@type': 'CreativeWorkSeries', name: fm.series } } : {}),
          ...(fm.cover ? { image: origin + fm.cover } : {})
        })
        return graph
      }
    })
  }
}
