<!--
SPDX-License-Identifier: Apache-2.0
Tag cloud with post counts, linking to each tag archive page.
-->
<template>
  <ul class="blog-tagcloud">
    <li v-for="t in tags" :key="t.slug">
      <a :href="withBase(`/tags/${t.slug}`)">
        <span class="tag-name">#{{ t.name }}</span>
        <span class="tag-count">{{ t.count }}</span>
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { usePosts } from '../composables'

const posts = usePosts()
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const tags = computed(() => {
  const counts = new Map<string, { name: string; slug: string; count: number }>()
  for (const p of posts) {
    for (const t of p.tags) {
      const s = slug(t)
      const entry = counts.get(s) ?? { name: t, slug: s, count: 0 }
      entry.count++
      counts.set(s, entry)
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})
</script>

<style scoped>
.blog-tagcloud { list-style: none; padding: 0; margin: 1rem 0; display: flex; flex-wrap: wrap; gap: 0.5rem 0.6rem; }
.blog-tagcloud a {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  font-size: 0.85rem;
  text-decoration: none;
  color: var(--vp-c-text-2);
}
.blog-tagcloud a:hover { border-color: var(--vp-c-brand-1); color: var(--vp-c-brand-1); }
.tag-count { font-size: 0.75em; color: var(--vp-c-text-3); }
</style>
