<!--
SPDX-License-Identifier: Apache-2.0
Intra-series banner: announces that the current post belongs to a series and
lists every part in order (by `seriesOrder`, else date), marking the current
one. A post joins a series with `series: "<name>"` in its frontmatter (and an
optional `seriesOrder: <n>`). Renders nothing unless the series has 2+ parts.

Parts that are not published yet (drafts, in a production build) still count
toward "part X of Y" and appear in the list as forthcoming, without a title
or link — a draft's title is not final.
-->
<template>
  <nav v-if="post && post.seriesTotal && post.seriesTotal > 1" class="blog-series" aria-label="Series navigation">
    <p class="series-intro">
      This article is <strong>part {{ post.seriesPart }} of {{ post.seriesTotal }}</strong>
      in the series <span class="series-name">{{ post.series }}</span>.
    </p>
    <ol class="series-list">
      <li v-for="e in parts" :key="e.part" :class="{ current: e.current, forthcoming: !e.post }">
        <a v-if="e.post && !e.current" :href="withBase(e.post.url)">{{ e.post.title }}</a>
        <template v-else-if="e.post">{{ e.post.title }} <span class="series-here">— you’re reading this</span></template>
        <template v-else>Forthcoming</template>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { usePosts, useCurrentPost } from '../composables'
import type { PostSummary } from '../types'

const posts = usePosts()
const post = useCurrentPost()

/** One entry per position 1..seriesTotal; `post` is null for an unpublished part. */
const parts = computed(() => {
  const cur = post.value
  if (!cur?.series || !cur.seriesTotal) return []
  const byPart = new Map<number, PostSummary>()
  for (const p of posts) if (p.series === cur.series && p.seriesPart) byPart.set(p.seriesPart, p)
  return Array.from({ length: cur.seriesTotal }, (_, i) => ({
    part: i + 1,
    post: byPart.get(i + 1) ?? null,
    current: i + 1 === cur.seriesPart
  }))
})
</script>

<style scoped>
.blog-series {
  margin: 0 0 2rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  /* A UI banner — keep the base sans font even inside a serif article. */
  font-family: var(--vp-font-family-base);
}
.series-intro { margin: 0 0 0.6rem; font-size: 0.95rem; line-height: 1.5; color: var(--vp-c-text-2); }
.series-name { font-weight: 700; color: var(--vp-c-text-1); }
.series-list { margin: 0; padding-left: 1.3rem; font-size: 0.95rem; }
.series-list li { margin: 0.2rem 0; }
.series-list li.current { color: var(--vp-c-brand-1); font-weight: 600; }
.series-list li.current .series-here { color: var(--vp-c-text-3); font-weight: 400; font-style: italic; }
.series-list a { color: var(--vp-c-text-1); text-decoration: none; }
.series-list a:hover { color: var(--vp-c-brand-1); }
.series-list li.forthcoming { color: var(--vp-c-text-3); font-style: italic; }
</style>
