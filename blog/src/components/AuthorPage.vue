<!--
SPDX-License-Identifier: Apache-2.0
Author archive page body. Drop into a dynamic route:
<AuthorPage :author="$params.author" :name="$params.name" />
-->
<template>
  <div class="blog-authorpage">
    <h1>Posts by {{ name || author }}</h1>
    <p class="count">{{ count }} post{{ count === 1 ? '' : 's' }}</p>
    <!-- PostList titles are <h3>; this keeps the outline h1 → h2 → h3 for
         assistive tech without a visible heading or restyling PostList, whose
         titles would pick up the page's markdown h2 styles as <h2>. -->
    <h2 class="visually-hidden">All posts</h2>
    <PostList :author="author" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PostList from './PostList.vue'
import { usePosts } from '../composables'

const props = defineProps<{ author: string; name?: string }>()
const posts = usePosts()
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
const count = computed(() => posts.filter((p) => p.authors.some((a) => slug(a) === slug(props.author))).length)
</script>

<style scoped>
.count { color: var(--vp-c-text-3); margin-top: -0.5rem; }
.visually-hidden {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
</style>
