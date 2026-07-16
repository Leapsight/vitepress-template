// SPDX-License-Identifier: Apache-2.0
//
// RSS 2.0 + Atom + JSON Feed generation, for a site's `buildEnd` hook:
//
//     import { emitFeeds } from '@leapsight/vitepress-blog/config'
//     buildEnd: (cfg) => emitFeeds(cfg, {
//       hostname: 'https://blog.example.com',
//       title: 'Acme Blog', description: '…', pattern: 'posts/*.md'
//     })
//
// Full-content feeds (dev readers want the whole post). Follows the canonical
// Vue-blog recipe: createContentLoader({ render: true }) in buildEnd + the
// `feed` package.

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Feed } from 'feed'
import { createContentLoader } from 'vitepress'

function toArray(v) {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

/**
 * @param {object} siteConfig VitePress resolved config (has outDir, site, base)
 * @param {{
 *   hostname: string,
 *   title?: string,
 *   description?: string,
 *   pattern?: string,
 *   limit?: number,
 *   copyright?: string,
 *   author?: { name?: string, email?: string, link?: string }
 * }} options
 */
export async function emitFeeds(siteConfig, options) {
  const { hostname, pattern = 'posts/*.md', limit = 50 } = options
  if (!hostname) throw new Error('[blog] emitFeeds: `hostname` is required')

  const base = siteConfig.site?.base ?? '/'
  const origin = hostname.replace(/\/$/, '')
  const link = (url) => origin + (base === '/' ? '' : base.replace(/\/$/, '')) + url

  const title = options.title ?? siteConfig.site?.title ?? 'Blog'
  const description = options.description ?? siteConfig.site?.description ?? ''

  const feed = new Feed({
    title,
    description,
    id: origin + '/',
    link: origin + '/',
    language: siteConfig.site?.lang ?? 'en',
    copyright: options.copyright ?? `© ${new Date().getFullYear()}`,
    updated: new Date(),
    generator: 'VitePress + @leapsight/vitepress-blog',
    feedLinks: {
      rss: link('/feed.rss'),
      atom: link('/feed.atom'),
      json: link('/feed.json')
    },
    author: options.author
  })

  const posts = await createContentLoader(pattern, {
    render: true,
    excerpt: true,
    globOptions: { ignore: ['**/node_modules/**'] }
  }).load()

  posts
    .filter((p) => p.frontmatter?.draft !== true)
    .sort((a, b) => +new Date(b.frontmatter?.date ?? 0) - +new Date(a.frontmatter?.date ?? 0))
    .slice(0, limit)
    .forEach((p) => {
      const fm = p.frontmatter ?? {}
      feed.addItem({
        title: fm.title ?? p.url,
        id: link(p.url),
        link: link(p.url),
        description: fm.description ?? p.excerpt ?? '',
        content: p.html ?? p.excerpt ?? '',
        date: fm.date ? new Date(fm.date) : new Date(),
        category: toArray(fm.tags).map((name) => ({ name })),
        author: toArray(fm.author).map((name) => ({ name })),
        image: fm.cover ? link(fm.cover) : undefined
      })
    })

  const out = siteConfig.outDir
  writeFileSync(resolve(out, 'feed.rss'), feed.rss2(), 'utf-8')
  writeFileSync(resolve(out, 'feed.atom'), feed.atom1(), 'utf-8')
  writeFileSync(resolve(out, 'feed.json'), feed.json1(), 'utf-8')
}
