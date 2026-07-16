<!--
SPDX-License-Identifier: Apache-2.0

"Related posts" ranked by shared tags AND knowledge-graph proximity: a post
directly connected to the current one in the KB graph (via typed edges,
mentions or `about`) is boosted above mere tag overlap. This is the payoff of
the graph — recommendations stronger than tag matching alone. Degrades to
pure shared-tag ranking when the KB graph isn't wired.
-->
<template>
  <aside v-if="related.length" class="blog-related">
    <h2 class="blog-related-title">Related posts</h2>
    <ul>
      <li v-for="p in related" :key="p.url">
        <a :href="withBase(p.url)">{{ p.title }}</a>
        <span v-if="p.dateFormatted" class="date">{{ p.dateFormatted }}</span>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useData, useRoute } from 'vitepress'
import { usePosts, useCurrentPost } from '../composables'
import { useKbData } from '@leapsight/vitepress-kb'

const props = withDefaults(defineProps<{ limit?: number }>(), { limit: 4 })

const posts = usePosts()
const current = useCurrentPost()
const kb = useKbData()
const route = useRoute()
const { site } = useData()

function normKey(p: string): string {
  if (!p) return '/'
  const r = p.replace(/\.html$/, '')
  return r === '/' ? '/' : r.replace(/\/+$/, '')
}
function stripBase(p: string): string {
  const base = site.value.base
  if (base && base !== '/' && p.startsWith(base)) return '/' + p.slice(base.length)
  return p
}

// Build a URL→neighbourURLs adjacency from the KB graph (undirected).
const neighbours = computed(() => {
  const idToUrl = new Map(kb.graph.nodes.map((n) => [n.id, n.url]))
  const adj = new Map<string, Set<string>>()
  for (const e of kb.graph.edges) {
    const from = idToUrl.get(e.from)
    const to = idToUrl.get(e.to)
    if (!from || !to) continue
    ;(adj.get(normKey(from)) ?? adj.set(normKey(from), new Set()).get(normKey(from))!).add(normKey(to))
    ;(adj.get(normKey(to)) ?? adj.set(normKey(to), new Set()).get(normKey(to))!).add(normKey(from))
  }
  return adj
})

const related = computed(() => {
  const post = current.value
  if (!post) return []
  const here = normKey(stripBase(route.path))
  const adj = neighbours.value.get(here) ?? new Set<string>()
  const myTags = new Set(post.tags.map((t) => t.toLowerCase()))

  return posts
    .filter((p) => p.url !== post.url)
    .map((p) => {
      const shared = p.tags.filter((t) => myTags.has(t.toLowerCase())).length
      const connected = adj.has(normKey(p.url)) ? 3 : 0
      const sameSeries = p.series && p.series === post.series ? 2 : 0
      return { p, score: shared * 2 + connected + sameSeries }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.date ?? '').localeCompare(a.p.date ?? ''))
    .slice(0, props.limit)
    .map((x) => x.p)
})
</script>

<style scoped>
.blog-related {
  margin: 2rem 0 0;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
}
.blog-related-title { font-size: 1rem; margin: 0 0 0.5rem; }
.blog-related ul { list-style: none; padding: 0; margin: 0; }
.blog-related li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.3rem 0; }
.blog-related a { text-decoration: none; }
.date { color: var(--vp-c-text-3); font-size: 0.85rem; white-space: nowrap; }
</style>
