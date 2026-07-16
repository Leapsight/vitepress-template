<!--
SPDX-License-Identifier: Apache-2.0
Author archive page body. Drop into a dynamic route:
<AuthorPage :author="$params.author" :name="$params.name" />
-->
<template>
  <div class="blog-authorpage">
    <h1>Posts by {{ name || author }}</h1>
    <p class="count">{{ count }} post{{ count === 1 ? '' : 's' }}</p>
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
</style>
