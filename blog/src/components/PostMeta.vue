<!--
SPDX-License-Identifier: Apache-2.0

Byline for a post page: date · reading time · authors · tags. Looks the
current post up in the posts index by route, so it needs no props.
-->
<template>
  <div v-if="post" class="blog-meta">
    <time v-if="post.dateFormatted">{{ post.dateFormatted }}</time>
    <span v-if="post.readingTime">· {{ post.readingTime }} min read</span>
    <span v-if="post.authors.length">· by {{ post.authors.join(', ') }}</span>
    <span v-if="post.series" class="blog-meta-series">· series: {{ post.series }}</span>
    <ul v-if="post.tags.length" class="blog-meta-tags">
      <li v-for="t in post.tags" :key="t">
        <a :href="withBase(`/tags/${slug(t)}`)">#{{ t }}</a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress'
import { useCurrentPost } from '../composables'

const post = useCurrentPost()
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
</script>

<style scoped>
.blog-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: -0.5rem 0 1.5rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
}
.blog-meta-tags { display: inline-flex; gap: 0.5rem; list-style: none; padding: 0; margin: 0; }
.blog-meta-tags a { color: var(--vp-c-text-3); text-decoration: none; }
.blog-meta-tags a:hover { color: var(--vp-c-brand-1); }
</style>
