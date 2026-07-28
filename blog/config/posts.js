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
      for (const p of raw) {
        const fm = p.frontmatter ?? {}
        validatePostFrontmatter(fm, p.url)
        if (fm.draft === true && process.env.NODE_ENV === 'production') continue

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
          cover: fm.cover ?? null,
          featured: fm.featured === true,
          announce: fm.announce === true,
          announceText: typeof fm.announceText === 'string' ? fm.announceText : null,
          announceCta: typeof fm.announceCta === 'string' ? fm.announceCta : null,
          announceUntil,
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
