// SPDX-License-Identifier: Apache-2.0

/** One post summary, as emitted by createPostsLoader. */
export interface PostSummary {
  url: string
  title: string
  date: string | null
  dateFormatted: string
  tags: string[]
  authors: string[]
  section: string | null
  series: string | null
  seriesOrder: number | null
  cover: string | null
  featured: boolean
  /** Show in the site-wide announcement bar. */
  announce: boolean
  /** Announcement bar copy (else the title is used). */
  announceText: string | null
  /** Announcement bar link label (else a default). */
  announceCta: string | null
  /** ISO end date after which the announcement stops showing (or null). */
  announceUntil: string | null
  excerpt: string
  readingTime: number
  wordCount: number
}

export const POSTS_KEY = Symbol('blog-posts')
