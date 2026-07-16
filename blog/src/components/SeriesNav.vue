<!--
SPDX-License-Identifier: Apache-2.0
Intra-series navigation: lists the parts of the current post's series
(ordered by `seriesOrder`, then date) and marks the current part.
-->
<template>
  <nav v-if="parts.length > 1" class="blog-series" aria-label="Series navigation">
    <div class="series-head">
      <span class="series-label">Series</span>
      <span class="series-name">{{ post!.series }}</span>
      <span class="series-progress">Part {{ currentIndex + 1 }} of {{ parts.length }}</span>
    </div>
    <ol class="series-list">
      <li v-for="(p, i) in parts" :key="p.url" :class="{ current: i === currentIndex }">
        <a v-if="i !== currentIndex" :href="withBase(p.url)">{{ p.title }}</a>
        <span v-else>{{ p.title }}</span>
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
  margin: 1.5rem 0;
  padding: 1rem 1.2rem;
  border: 1px solid var(--vp-c-divider);
  border-left: 3px solid var(--vp-c-brand-1);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.series-head { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.series-label { text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.06em; color: var(--vp-c-text-3); }
.series-name { font-weight: 700; }
.series-progress { margin-left: auto; font-size: 0.8rem; color: var(--vp-c-text-3); }
.series-list { margin: 0; padding-left: 1.2rem; }
.series-list li.current { color: var(--vp-c-brand-1); font-weight: 600; }
.series-list a { text-decoration: none; }
</style>
