<!--
SPDX-License-Identifier: Apache-2.0

"What connects to this page" panel. Merges the author's curated `related:`
frontmatter (outbound) with the KB graph's inbound edges (who links here).
The related predicate folds into a "Related" group; other inbound predicates
render under passive labels ("Referenced by", …) taken from KB UI config.

Renders nothing when a page has no connections, so it's safe to mount
globally via the KB layout wrapper. Pure data → SSR-renderable.
-->
<template>
  <aside v-if="groups.length" class="kb-backlinks">
    <div v-for="g in groups" :key="g.key" class="kb-backlinks-group">
      <span class="kb-backlinks-label">{{ g.label }}</span>
      <ul class="kb-backlinks-list">
        <li v-for="it in g.items" :key="it.key">
          <a
            :href="it.href"
            class="kb-backlink"
            :title="it.desc || undefined"
            :target="it.external ? '_blank' : undefined"
            :rel="it.external ? 'noopener noreferrer' : undefined"
          >
            <span class="kb-backlink-text">{{ it.title }}</span>
            <span v-if="it.type" class="kb-backlink-type">{{ localType(it.type) }}</span>
            <span v-else-if="it.external" class="kb-backlink-ext" aria-hidden="true">↗</span>
          </a>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute, withBase } from 'vitepress'
import { useKbData, useKbUi } from '../composables'
import { localType } from '../../lib/select.js'
import { humanize } from '../../lib/extract.js'
import type { KbNode } from '../types'

const route = useRoute()
const { site, frontmatter } = useData()
const data = useKbData()
const ui = useKbUi()

const relatedPredicate = ui.relatedPredicate ?? 'schema:relatedLink'
const inverseLabels = ui.inverseLabels ?? {}
const order = ui.order ?? []

const idMap = new Map<string, KbNode>()
const urlMap = new Map<string, KbNode>()
const titleMap = new Map<string, KbNode>()
for (const n of data.graph.nodes) {
  idMap.set(n.id, n)
  urlMap.set(normKey(n.url), n)
  if (!titleMap.has(titleKey(n.title))) titleMap.set(titleKey(n.title), n)
}

function normKey(p: string): string {
  if (!p) return '/'
  const r = p.replace(/\.html$/, '')
  return r === '/' ? '/' : r.replace(/\/+$/, '')
}
function titleKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function stripBase(p: string): string {
  const base = site.value.base
  if (base && base !== '/' && p.startsWith(base)) return '/' + p.slice(base.length)
  return p
}

function resolveRelated(link: string | undefined, currentPath: string): { url: string; external: boolean } | null {
  const v = (link ?? '').trim()
  if (!v) return null
  if (/^(?:https?:\/\/|mailto:)/.test(v)) return { url: v, external: true }
  if (v.startsWith('#')) return { url: v, external: true }
  if (v.startsWith('/')) return { url: v.replace(/\.md$/, ''), external: false }
  const dir = currentPath.replace(/\/[^/]*$/, '/')
  const stack: string[] = []
  for (const part of (dir + v).split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') { stack.pop(); continue }
    stack.push(part)
  }
  return { url: '/' + stack.join('/').replace(/\.md$/, ''), external: false }
}

function labelFor(predicate: string): string {
  if (inverseLabels[predicate]) return inverseLabels[predicate]
  const i = predicate.indexOf(':')
  return humanize(i === -1 ? predicate : predicate.slice(i + 1))
}
function orderOf(predicate: string): number {
  const i = order.indexOf(predicate)
  return i === -1 ? order.length : i
}

const currentId = computed(() => urlMap.get(normKey(stripBase(route.path)))?.id ?? null)

interface Item { key: string; href: string; title: string; type?: string; external?: boolean; desc?: string }
interface Group { key: string; label: string; items: Item[] }
interface RelatedFm { title?: unknown; link?: unknown; description?: unknown }

const groups = computed<Group[]>(() => {
  const id = currentId.value
  const currentPath = normKey(stripBase(route.path))
  const inbound = id ? (data.backlinks[id] ?? []) : []
  const seen = new Set<string>()
  const out: Group[] = []

  // "Related": curated related: frontmatter + inbound related edges.
  const related: Item[] = []
  const fmRelated = frontmatter.value?.related
  if (Array.isArray(fmRelated)) {
    for (const raw of fmRelated as RelatedFm[]) {
      const title = typeof raw?.title === 'string' ? raw.title : ''
      const desc = typeof raw?.description === 'string' ? raw.description : undefined
      const link = typeof raw?.link === 'string' ? raw.link : undefined
      let resolved = resolveRelated(link, currentPath)
      if (!resolved && title && titleMap.has(titleKey(title))) {
        resolved = { url: titleMap.get(titleKey(title))!.url, external: false }
      }
      if (!resolved) continue
      const key = resolved.external ? resolved.url : normKey(resolved.url.split('#')[0])
      if (seen.has(key)) continue
      seen.add(key)
      const node = resolved.external ? undefined : urlMap.get(key)
      related.push({
        key,
        href: resolved.external ? resolved.url : withBase(resolved.url),
        title: title || node?.title || humanize(key.split('/').pop() ?? ''),
        type: node?.type,
        external: resolved.external,
        desc
      })
    }
  }

  const inboundRelated = inbound
    .filter((e) => e.predicate === relatedPredicate && e.from !== id)
    .map((e) => idMap.get(e.from))
    .filter((n): n is KbNode => Boolean(n))
    .sort((a, b) => a.title.localeCompare(b.title))
  for (const node of inboundRelated) {
    const key = normKey(node.url)
    if (seen.has(key)) continue
    seen.add(key)
    related.push({ key, href: withBase(node.url), title: node.title, type: node.type })
  }

  if (related.length) out.push({ key: 'related', label: 'Related', items: related })

  // Remaining inbound predicates.
  const byPredicate = new Map<string, KbNode[]>()
  for (const e of inbound) {
    if (e.predicate === relatedPredicate || e.from === id) continue
    const node = idMap.get(e.from)
    if (!node) continue
    const arr = byPredicate.get(e.predicate) ?? []
    arr.push(node)
    byPredicate.set(e.predicate, arr)
  }
  for (const predicate of [...byPredicate.keys()].sort((a, b) => orderOf(a) - orderOf(b))) {
    const items = byPredicate
      .get(predicate)!
      .sort((a, b) => a.title.localeCompare(b.title))
      .filter((n) => {
        const key = normKey(n.url)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((n) => ({ key: normKey(n.url), href: withBase(n.url), title: n.title, type: n.type }))
    if (items.length) out.push({ key: predicate, label: labelFor(predicate), items })
  }

  return out
})
</script>

<style scoped>
.kb-backlinks {
  margin: 32px 0 0;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}
.kb-backlinks-group { margin: 0 0 14px; }
.kb-backlinks-group:last-child { margin-bottom: 0; }
.kb-backlinks-label {
  display: block;
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
}
.kb-backlinks-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
}
.kb-backlink {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 13px;
  line-height: 1.3;
  text-decoration: none !important;
  background: transparent;
  transition: border-color 0.25s;
}
.kb-backlink:hover { border-color: var(--vp-c-brand-1); }
.kb-backlink-text { color: var(--vp-c-brand-1); }
.kb-backlink-type { font-size: 11px; color: var(--vp-c-text-3); text-transform: lowercase; }
.kb-backlink-ext { font-size: 11px; color: var(--vp-c-text-3); }
</style>
