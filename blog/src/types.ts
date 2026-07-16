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
  excerpt: string
  readingTime: number
  wordCount: number
}

export const POSTS_KEY = Symbol('blog-posts')
