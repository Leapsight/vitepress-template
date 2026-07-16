// SPDX-License-Identifier: Apache-2.0
//
// Pure, framework-neutral parsing helpers shared by the node-side loader,
// the typed-edge markdown plugin, and the client components. No I/O and no
// vocabulary knowledge — vocabulary (types, object-properties, prefixes)
// is injected as config so the same machinery serves docs, blogs, anything.

/** Derive a stable `@id` CURIE from a published route. */
export function deriveId(url, idPrefix = 'doc') {
  if (url === '/') return `${idPrefix}:home`
  const path = url.replace(/^\/+/, '').replace(/\/+$/, '')
  return `${idPrefix}:` + (path || 'home')
}

/** Humanize a slug into a title fallback. */
export function humanize(name) {
  return name
    .replace(/^[0-9]+-/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Normalize a title to a slug key for `[[xref]]` title resolution. */
export function slugifyTitle(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Strip the leading YAML frontmatter block (if `src` includes it). */
export function stripFrontmatter(src) {
  return src.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/** Strip fenced + inline code so links inside examples aren't harvested. */
export function stripCode(src) {
  return src
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`]*`/g, '')
}

const LINK_RE = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)(?:\{([^}]*)\})?/g
// One `key="value"` / `key='value'` / `key=bareword` pair. Bare values run to
// the next whitespace or `}` so CURIE values (`schema:about`) parse unquoted.
const ATTR_RE = /([A-Za-z_][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g

/**
 * Parse the inside of a `{ … }` attribute block into key→value pairs.
 * Shared by the loader (harvesting typed edges from raw source) and the
 * typed-edge render rule, so both agree on which `{rel=…}` blocks are edges.
 */
export function parseAttrBlock(inner) {
  const attrs = {}
  ATTR_RE.lastIndex = 0
  let a
  while ((a = ATTR_RE.exec(inner)) !== null) {
    attrs[a[1]] = a[2] ?? a[3] ?? a[4] ?? ''
  }
  return attrs
}

/** Parse markdown links with an optional `{ … }` attribute block. */
export function parseLinks(body) {
  const out = []
  LINK_RE.lastIndex = 0
  let m
  while ((m = LINK_RE.exec(body)) !== null) {
    out.push({ text: m[1], target: m[2].trim(), attrs: m[3] ? parseAttrBlock(m[3]) : {} })
  }
  return out
}

/** Parse `[[target]]` / `[[target|alias]]` / `[[target#heading]]` wikilinks. */
export function parseWikilinks(body) {
  const out = []
  WIKILINK_RE.lastIndex = 0
  let m
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    const target = m[1].split('|')[0].split('#')[0].trim()
    if (target) out.push(target)
  }
  return out
}

/** The local name of a `@type`/predicate CURIE — `schema:BlogPosting` → `BlogPosting`. */
export function localName(curie) {
  const i = curie.indexOf(':')
  return i === -1 ? curie : curie.slice(i + 1)
}
