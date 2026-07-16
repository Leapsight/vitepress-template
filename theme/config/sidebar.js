/**
 * Filesystem-driven sidebar generation (extracted from bondy_lang).
 *
 * `buildContentSidebar(srcDir, tabPath)` walks one section directory
 * one level deep:
 *
 *   srcDir/
 *     guide/            ← tabPath '/guide'
 *       index.md        ← "Overview" link
 *       basics/         ← sidebar group "Basics"
 *         intro.md      ← leaf, ordered by frontmatter `order:`
 *
 * Frontmatter keys read from each page:
 *   title:        sidebar text (falls back to first `# Heading`,
 *                 then to a humanized file name)
 *   order:        numeric sort key within the group
 *   description:  carried onto the sidebar item — used by
 *                 <SectionFeatures> to render landing-page cards
 *   feature:      `true` marks the item for <SectionFeatures>
 *
 * A section directory whose `index.md` has `sidebar_children: false`
 * collapses to a single sidebar link (useful for glossaries).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * @param {string} srcDir  absolute path of the VitePress source root
 * @param {string} tabPath section path, e.g. '/guide'
 * @returns {any[]} VitePress sidebar array for `sidebar[tabPath + '/']`
 */
export function buildContentSidebar(srcDir, tabPath) {
  const tabDir = resolve(srcDir, '.' + tabPath)
  if (!existsSync(tabDir)) {
    return [{ text: 'Overview', link: `${tabPath}/` }]
  }

  const out = [{ text: 'Overview', link: `${tabPath}/` }]

  // Top-level .md files (other than index) come first, in order.
  const looseFiles = readdirSync(tabDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'index.md')
    .map((e) => readEntry(tabDir, e.name, tabPath))
    .filter(Boolean)
    .sort(entryOrder)
  for (const { text, link, description, isFeature } of looseFiles) {
    out.push(pruned({ text, link, description, isFeature }))
  }

  // Subdirectories — each is a sidebar group.
  const subdirs = readdirSync(tabDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
  for (const sub of subdirs) {
    const subPath = join(tabDir, sub)
    // A section whose index opts out of child listing collapses to a
    // single sidebar link.
    if (readIndexFlag(subPath, 'sidebar_children') === 'false') {
      out.push({ text: humanize(sub), link: `${tabPath}/${sub}/` })
      continue
    }
    const items = readdirSync(subPath, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'index.md')
      .map((e) => readEntry(subPath, e.name, `${tabPath}/${sub}`))
      .filter(Boolean)
      .sort(entryOrder)
    if (items.length === 0) continue
    out.push({
      text: humanize(sub),
      collapsed: false,
      items: items.map(({ text, link, description, isFeature }) =>
        pruned({ text, link, description, isFeature })
      )
    })
  }
  return out
}

function entryOrder(a, b) {
  return (a.order ?? 999) - (b.order ?? 999) || a.fileName.localeCompare(b.fileName)
}

/** Drop undefined keys so the sidebar JSON stays clean. */
function pruned(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

function readEntry(dir, fileName, linkPrefix) {
  const full = join(dir, fileName)
  let title = null
  let order
  let description
  let isFeature
  try {
    const src = readFileSync(full, 'utf-8')
    const fm = src.match(/^---\n([\s\S]*?)\n---/)
    if (fm) {
      for (const line of fm[1].split('\n')) {
        const m = line.match(/^([a-zA-Z_]+):\s*(.*?)\s*$/)
        if (!m) continue
        if (m[1] === 'title') title = stripQuotes(m[2])
        else if (m[1] === 'description') description = stripQuotes(m[2])
        else if (m[1] === 'feature') isFeature = m[2] === 'true' || undefined
        else if (m[1] === 'order') {
          const n = Number.parseInt(m[2], 10)
          if (!Number.isNaN(n)) order = n
        }
      }
    }
    if (!title) {
      // Fall back to the first `# Heading` line.
      const h = src.match(/^\s*#\s+(.+?)\s*$/m)
      if (h) title = h[1]
    }
  } catch {
    return null
  }
  if (!title) title = humanize(fileName.replace(/\.md$/, ''))
  const slug = fileName.replace(/\.md$/, '')
  return { text: title, link: `${linkPrefix}/${slug}`, order, fileName, description, isFeature }
}

function stripQuotes(s) {
  return s.replace(/^['"]|['"]$/g, '')
}

/** Read a single frontmatter flag from a section's `index.md`. */
function readIndexFlag(subPath, key) {
  const idx = join(subPath, 'index.md')
  if (!existsSync(idx)) return null
  try {
    const fm = readFileSync(idx, 'utf-8').match(/^---\n([\s\S]*?)\n---/)
    if (!fm) return null
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^([a-zA-Z_]+):\s*(.*?)\s*$/)
      if (m && m[1] === key) return stripQuotes(m[2])
    }
  } catch {
    /* ignore */
  }
  return null
}

/** '02-getting-started' → 'Getting Started' */
export function humanize(name) {
  return name
    .replace(/^[0-9]+-/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
