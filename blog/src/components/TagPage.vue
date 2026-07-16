<!--
SPDX-License-Identifier: Apache-2.0
Tag archive page body. Drop into a dynamic route: <TagPage :tag="$params.tag" />
-->
<template>
  <div class="blog-tagpage">
    <h1>Posts tagged <span class="tag">#{{ display }}</span></h1>
    <p class="count">{{ count }} post{{ count === 1 ? '' : 's' }}</p>
    <PostList :tag="tag" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PostList from './PostList.vue'
import { usePosts } from '../composables'

const props = defineProps<{ tag: string }>()
const posts = usePosts()
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
const matching = computed(() => posts.filter((p) => p.tags.some((t) => slug(t) === slug(props.tag))))
const count = computed(() => matching.value.length)
const display = computed(() => matching.value[0]?.tags.find((t) => slug(t) === slug(props.tag)) ?? props.tag)
</script>

<style scoped>
.tag { color: var(--vp-c-brand-1); }
.count { color: var(--vp-c-text-3); margin-top: -0.5rem; }
</style>
