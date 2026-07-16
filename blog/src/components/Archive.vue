<!--
SPDX-License-Identifier: Apache-2.0
Full post archive, grouped by year (most recent first).
-->
<template>
  <div class="blog-archive">
    <section v-for="group in groups" :key="group.year" class="archive-year">
      <h2 :id="String(group.year)">{{ group.year }}</h2>
      <ul>
        <li v-for="p in group.posts" :key="p.url">
          <a :href="withBase(p.url)">{{ p.title }}</a>
          <span v-if="p.dateFormatted" class="date">{{ p.dateFormatted }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { usePosts } from '../composables'

const posts = usePosts()
const groups = computed(() => {
  const byYear = new Map<string, typeof posts>()
  for (const p of posts) {
    const year = p.date ? new Date(p.date).getFullYear().toString() : 'Undated'
    ;(byYear.get(year) ?? byYear.set(year, []).get(year)!).push(p)
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, list]) => ({ year, posts: list }))
})
</script>

<style scoped>
.archive-year ul { list-style: none; padding: 0; margin: 0 0 1.5rem; }
.archive-year li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.archive-year li a { text-decoration: none; }
.date { color: var(--vp-c-text-3); font-size: 0.85rem; white-space: nowrap; }
</style>
