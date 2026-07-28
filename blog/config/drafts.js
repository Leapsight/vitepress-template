// SPDX-License-Identifier: Apache-2.0
//
// Draft gating for the page build. Posts are marked unpublished with
// `draft: true` in their frontmatter. The posts loader, feeds and taxonomy
// routes already drop drafts (see posts.js / feeds.js / paths.js) — but that
// only hides them from *listings*; VitePress would still render each draft's
// own page and put it in the sitemap. `draftExcludes()` closes that gap by
// returning the draft files so a site can add them to `srcExclude`:
//
//     import { draftExcludes } from '@leapsight/vitepress-template/blog/config'
//     srcExclude: ['draft/**', ...draftExcludes()]
//
// Drafts are only excluded from a *production build*, so `vitepress dev` still
// renders them for preview. Set `{ always: true }` to exclude them everywhere.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import matter from 'gray-matter'

/** True when VitePress is doing a production build (not dev / preview). */
export function isProductionBuild() {
  return process.env.NODE_ENV === 'production' || process.argv.includes('build')
}

/** Recursively collect `.md` files under `dir` (relative to cwd). */
function mdFiles(dir) {
  const root = resolve(process.cwd(), dir)
  const out = []
  const walk = (d) => {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const full = join(d, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.isFile() && e.name.endsWith('.md')) out.push(full)
    }
  }
  try {
    if (statSync(root).isDirectory()) walk(root)
  } catch {
    /* no posts dir */
  }
  return out
}

/**
 * Relative paths of every draft post (`draft: true`), ready to spread into a
 * site's `srcExclude` so VitePress never builds them into pages or the sitemap.
 * Returns `[]` outside a production build (unless `always`), keeping drafts
 * previewable with `vitepress dev`.
 *
 * @param {{ dir?: string, always?: boolean }} [options]
 * @returns {string[]}
 */
export function draftExcludes(options = {}) {
  const { dir = 'posts', always = false } = options
  if (!always && !isProductionBuild()) return []

  const root = process.cwd()
  const out = []
  for (const file of mdFiles(dir)) {
    let fm
    try {
      fm = matter(readFileSync(file, 'utf-8')).data
    } catch {
      continue
    }
    // Escape glob metacharacters — srcExclude entries are matched as globs.
    if (fm?.draft === true) out.push(relative(root, file).replace(/[[\]{}()!*?+@]/g, '\\$&'))
  }
  return out
}
