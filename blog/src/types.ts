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
  /** 1-based position in its series, counting unpublished (draft) parts. */
  seriesPart: number | null
  /** Number of parts in its series, published or not. */
  seriesTotal: number | null
  /** Positions of the series' parts that are not published (drafts). */
  seriesUnpublished: number[]
  cover: string | null
  featured: boolean
  /** Announcement-bar candidate: flagged and not yet expired at build time. */
  announce: boolean
  /** Announcement bar copy (else the title is used). */
  announceText: string | null
  /** Announcement bar link label (else a default). */
  announceCta: string | null
  /** ISO end date after which the announcement stops showing (or null). */
  announceUntil: string | null
  /** localStorage key recording a dismissal (null unless `announce`). */
  announceKey: string | null
  excerpt: string
  readingTime: number
  wordCount: number
}

export const POSTS_KEY = Symbol('blog-posts')
