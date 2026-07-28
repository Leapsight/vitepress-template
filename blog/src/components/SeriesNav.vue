<!--
SPDX-License-Identifier: Apache-2.0
Intra-series banner: announces that the current post belongs to a series and
lists every part in order (by `seriesOrder`, else date), marking the current
one. A post joins a series with `series: "<name>"` in its frontmatter (and an
optional `seriesOrder: <n>`). Renders nothing unless the series has 2+ parts.
-->
<template>
  <nav v-if="parts.length > 1" class="blog-series" aria-label="Series navigation">
    <p class="series-intro">
      This article is <strong>part {{ currentIndex + 1 }} of {{ parts.length }}</strong>
      in the series <span class="series-name">{{ post!.series }}</span>.
    </p>
    <ol class="series-list">
      <li v-for="(p, i) in parts" :key="p.url" :class="{ current: i === currentIndex }">
        <a v-if="i !== currentIndex" :href="withBase(p.url)">{{ p.title }}</a>
        <template v-else>{{ p.title }} <span class="series-here">— you’re reading this</span></template>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { usePosts, useCurrentPost } from '../composables'

const posts = usePosts()
const post = useCurrentPost()

const parts = computed(() => {
  const s = post.value?.series
  if (!s) return []
  return posts
    .filter((p) => p.series === s)
    .sort((a, b) => {
      if (a.seriesOrder != null && b.seriesOrder != null) return a.seriesOrder - b.seriesOrder
      return (a.date ?? '').localeCompare(b.date ?? '')
    })
})
const currentIndex = computed(() => parts.value.findIndex((p) => p.url === post.value?.url))
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
</style>
