// SPDX-License-Identifier: Apache-2.0
//
// Dynamic-route path loaders for tag + author archive pages. A site adds:
//
//     // tags/[tag].paths.js
//     import { createTagPaths } from '@leapsight/vitepress-template/blog/config'
//     export default createTagPaths()
//
// with a sibling `tags/[tag].md` that renders <TagPage :tag="$params.tag" />.
// VitePress then generates one static page per tag.
//
// NOTE: dynamic-route `paths()` loaders run before the VitePress process is
// active, so `createContentLoader` is unavailable here — we read post
// frontmatter straight from disk with gray-matter instead.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import matter from 'gray-matter'

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function toArray(v) {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
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

function collect(dir, field) {
  const seen = new Map()
  for (const file of mdFiles(dir)) {
    let fm
    try {
      fm = matter(readFileSync(file, 'utf-8')).data
    } catch {
      continue
    }
    if (fm?.draft === true) continue
    for (const v of toArray(fm?.[field])) {
      if (typeof v === 'string' && v && !seen.has(slug(v))) seen.set(slug(v), v)
    }
  }
  return seen
}

/** @param {{ dir?: string, key?: string }} [options] */
export function createTagPaths(options = {}) {
  const { dir = 'posts', key = 'tag' } = options
  return {
    paths() {
      return [...collect(dir, 'tags').entries()].map(([s, name]) => ({ params: { [key]: s, name } }))
    }
  }
}

/** @param {{ dir?: string, key?: string }} [options] */
export function createAuthorPaths(options = {}) {
  const { dir = 'posts', key = 'author' } = options
  return {
    paths() {
      return [...collect(dir, 'author').entries()].map(([s, name]) => ({ params: { [key]: s, name } }))
    }
  }
}
