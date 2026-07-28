// SPDX-License-Identifier: Apache-2.0
//
// Zod schema for post frontmatter. The posts loader validates every post
// against this and FAILS THE BUILD on a bad/missing field — the "schema-
// validated frontmatter" guarantee (Astro/Nuxt Content parity). KB keys
// (@id, @type, schema:*) are allowed through via .passthrough().

import { z } from 'zod'

const stringOrArray = z.union([z.string(), z.array(z.string())])

export const postFrontmatterSchema = z
  .object({
    title: z.string().min(1, 'title is required'),
    date: z.union([z.string(), z.date()]).optional(),
    description: z.string().optional(),
    excerpt: z.string().optional(),
    author: stringOrArray.optional(),
    tags: z.array(z.string()).optional(),
    section: z.string().optional(),
    series: z.string().optional(),
    seriesOrder: z.number().optional(),
    cover: z.string().optional(),
    draft: z.boolean().optional(),
    featured: z.boolean().optional(),
    // Site-wide announcement bar: flag a post, optionally with copy, a link
    // label, and a lifetime (weeks from `date`, or an explicit end date).
    announce: z.boolean().optional(),
    announceText: z.string().optional(),
    announceCta: z.string().optional(),
    announceWeeks: z.number().optional(),
    announceUntil: z.union([z.string(), z.date()]).optional(),
    canonical: z.string().url().optional()
  })
  .passthrough()

/**
 * Validate a post's frontmatter; throws a readable error tagged with the path.
 * @param {object} frontmatter
 * @param {string} where a file path / url for the error message
 */
export function validatePostFrontmatter(frontmatter, where) {
  const result = postFrontmatterSchema.safeParse(frontmatter)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `      ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')
    throw new Error(`[blog] Invalid frontmatter — build aborted:\n  • ${where}\n${issues}`)
  }
  return result.data
}
