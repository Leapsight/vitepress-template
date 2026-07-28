<!--
SPDX-License-Identifier: Apache-2.0

Post listing with optional filtering (tag / author / series / featured) and
client-side pagination. Reads the posts array provided by `withBlog`.
-->
<template>
  <div class="blog-post-list">
    <p v-if="!pageItems.length" class="blog-empty">No posts yet.</p>

    <article v-for="p in pageItems" :key="p.url" class="blog-post-card">
      <h3 class="blog-post-title">
        <a :href="withBase(p.url)">{{ p.title }}</a>
      </h3>
      <div class="blog-post-meta">
        <time v-if="p.dateFormatted">{{ p.dateFormatted }}</time>
        <span v-if="p.readingTime">· {{ p.readingTime }} min read</span>
        <span v-if="p.authors.length">· {{ p.authors.join(', ') }}</span>
      </div>
      <p v-if="showExcerpt && p.excerpt" class="blog-post-excerpt">{{ p.excerpt }}</p>
      <ul v-if="p.tags.length" class="blog-post-tags">
        <li v-for="t in p.tags" :key="t">
          <a :href="withBase(`/tags/${slug(t)}`)">#{{ t }}</a>
        </li>
      </ul>
    </article>

    <nav v-if="totalPages > 1" class="blog-pagination">
      <button type="button" :disabled="page === 1" @click="page--">← Newer</button>
      <span>Page {{ page }} / {{ totalPages }}</span>
      <button type="button" :disabled="page === totalPages" @click="page++">Older →</button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { usePosts } from '../composables'

const props = withDefaults(
  defineProps<{
    tag?: string
    author?: string
    series?: string
    featured?: boolean
    limit?: number
    pageSize?: number
    showExcerpt?: boolean
  }>(),
  { showExcerpt: true, pageSize: 10 }
)

const all = usePosts()

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const filtered = computed(() => {
  let list = all
  if (props.tag) list = list.filter((p) => p.tags.some((t) => slug(t) === slug(props.tag!)))
  if (props.author) list = list.filter((p) => p.authors.some((a) => slug(a) === slug(props.author!)))
  if (props.series) list = list.filter((p) => p.series && slug(p.series) === slug(props.series!))
  if (props.featured) list = list.filter((p) => p.featured)
  if (props.limit) list = list.slice(0, props.limit)
  return list
})

const page = ref(1)
watch(filtered, () => (page.value = 1))

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / props.pageSize)))
const pageItems = computed(() => {
  const start = (page.value - 1) * props.pageSize
  return filtered.value.slice(start, start + props.pageSize)
})
</script>

<style scoped>
.blog-post-list { margin: 1.5rem 0; }
.blog-empty { color: var(--vp-c-text-3); }
.blog-post-card {
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.blog-post-card:first-child { padding-top: 0; }
.blog-post-title { margin: 0 0 0.25rem; font-size: 1.3rem; line-height: 1.3; }
.blog-post-title a { text-decoration: none; }
.blog-post-meta { font-size: 0.85rem; color: var(--vp-c-text-3); display: flex; gap: 0.4rem; flex-wrap: wrap; }
.blog-post-excerpt { margin: 0.5rem 0 0.6rem; color: var(--vp-c-text-2); line-height: 1.6; }
.blog-post-tags { list-style: none; padding: 0; margin: 0.4rem 0 0; display: flex; flex-wrap: wrap; gap: 0.4rem 0.7rem; }
.blog-post-tags li { margin: 0; }
.blog-post-tags a { font-size: 0.8rem; color: var(--vp-c-text-3); text-decoration: none; }
.blog-post-tags a:hover { color: var(--vp-c-brand-1); }
.blog-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
.blog-pagination button {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.35rem 0.8rem;
  background: transparent;
  color: var(--vp-c-text-1);
  cursor: pointer;
}
.blog-pagination button:disabled { opacity: 0.4; cursor: default; }
.blog-pagination button:not(:disabled):hover { border-color: var(--vp-c-brand-1); }
</style>
