// SPDX-License-Identifier: Apache-2.0
//
// Blog post-metadata loader. A site's `.vitepress/posts.data.ts` does:
//
//     import { createPostsLoader } from '@leapsight/vitepress-template/blog/config'
//     export default createPostsLoader({ pattern: 'posts/*.md' })
//
// It emits a date-sorted array of post summaries consumed by the listing,
// tag, author, archive, series and pagination components. Drafts are excluded
// in production. Frontmatter is Zod-validated (build fails on a bad field).

import { createContentLoader } from 'vitepress'
import readingTime from 'reading-time'
import { validatePostFrontmatter } from './frontmatter.js'
import { stripFrontmatter } from '@leapsight/vitepress-template/kb/lib/extract.js'

function toArray(v) {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

/** First non-empty paragraph of the body, truncated — excerpt fallback. */
function deriveExcerpt(src, limit = 200) {
  const body = stripFrontmatter(src)
    .replace(/^#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~]/g, '')
    .trim()
  const para = body.split(/\n\s*\n/).find((p) => p.trim().length > 0) ?? ''
  const flat = para.replace(/\s+/g, ' ').trim()
  return flat.length > limit ? flat.slice(0, limit).replace(/\s+\S*$/, '') + '…' : flat
}

/**
 * @param {{
 *   pattern?: string,
 *   ignore?: string[],
 *   excerptLength?: number,
 *   dateLocale?: string
 * }} [options]
 */
export function createPostsLoader(options = {}) {
  const {
    pattern = 'posts/*.md',
    ignore = ['**/node_modules/**'],
    excerptLength = 200,
    dateLocale = 'en-GB'
  } = options

  return createContentLoader(pattern, {
    includeSrc: true,
    globOptions: { ignore },
    transform(raw) {
      const posts = []
      // Every part of every series, drafts included: a series' length and
      // each part's number count the parts not yet published.
      const seriesParts = new Map()
      for (const p of raw) {
        const fm = p.frontmatter ?? {}
        if (!fm.series) continue
        const unpublished = fm.draft === true && process.env.NODE_ENV === 'production'
        const entry = { url: p.url, order: fm.seriesOrder, date: fm.date ? new Date(fm.date).toISOString() : '', unpublished }
        seriesParts.set(fm.series, [...(seriesParts.get(fm.series) ?? []), entry])
      }
      for (const parts of seriesParts.values()) {
        parts.sort((a, b) => {
          if (a.order != null && b.order != null) return a.order - b.order
          if (a.order != null) return -1
          if (b.order != null) return 1
          return a.date.localeCompare(b.date)
        })
      }

      for (const p of raw) {
        const fm = p.frontmatter ?? {}
        validatePostFrontmatter(fm, p.url)
        if (fm.draft === true && process.env.NODE_ENV === 'production') continue

        const parts = fm.series ? seriesParts.get(fm.series) : null

        const src = p.src ?? ''
        const rt = readingTime(stripFrontmatter(src))

        // Announcement lifetime → an absolute end date (ISO). Explicit
        // `announceUntil` wins; otherwise `date` + `announceWeeks` (default 4).
        let announceUntil = null
        if (fm.announce === true) {
          if (fm.announceUntil) announceUntil = new Date(fm.announceUntil).toISOString()
          else if (fm.date) {
            const weeks = typeof fm.announceWeeks === 'number' ? fm.announceWeeks : 4
            announceUntil = new Date(new Date(fm.date).getTime() + weeks * 7 * 86400000).toISOString()
          }
        }
        // Already expired at build time → not a candidate. AnnouncementBanner
        // server-renders every candidate, so this keeps long-expired ones
        // out of the HTML; expiry after the build is handled in the browser.
        const announce =
          fm.announce === true && (!announceUntil || Date.now() < Date.parse(announceUntil))

        posts.push({
          url: p.url,
          title: fm.title ?? p.url,
          date: fm.date ? new Date(fm.date).toISOString() : null,
          dateFormatted: fm.date
            ? new Date(fm.date).toLocaleDateString(dateLocale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC'
              })
            : '',
          tags: toArray(fm.tags),
          authors: toArray(fm.author),
          section: fm.section ?? null,
          series: fm.series ?? null,
          seriesOrder: typeof fm.seriesOrder === 'number' ? fm.seriesOrder : null,
          seriesPart: parts ? parts.findIndex((e) => e.url === p.url) + 1 : null,
          seriesTotal: parts ? parts.length : null,
          seriesUnpublished: parts ? parts.flatMap((e, i) => (e.unpublished ? [i + 1] : [])) : [],
          cover: fm.cover ?? null,
          featured: fm.featured === true,
          announce,
          announceText: typeof fm.announceText === 'string' ? fm.announceText : null,
          announceCta: typeof fm.announceCta === 'string' ? fm.announceCta : null,
          announceUntil,
          // Per-announcement dismissal key: a new end date re-shows it.
          announceKey: announce ? 'ls-announce:' + p.url + '|' + (announceUntil ?? '') : null,
          excerpt: fm.description ?? fm.excerpt ?? deriveExcerpt(src, excerptLength),
          readingTime: Math.max(1, Math.round(rt.minutes)),
          wordCount: rt.words
        })
      }

      posts.sort((a, b) => {
        if (a.date && b.date) return b.date.localeCompare(a.date)
        if (a.date) return -1
        if (b.date) return 1
        return a.title.localeCompare(b.title)
      })
      return posts
    }
  })
}
