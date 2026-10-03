<!--
One level of the page outline, nested for deeper headings. Following a link
also moves focus to its heading (without scrolling, which the hash does), so
keyboard and screen-reader users continue reading from there — the same
thing VitePress's own outline does.
-->
<script setup lang="ts">
import type { OutlineItem } from '../composables/outline'

defineProps<{
  headers: OutlineItem[]
  active?: string | null
  root?: boolean
}>()

function focusHeading(link: string) {
  document.getElementById(decodeURIComponent(link.slice(1)))?.focus({ preventScroll: true })
}
</script>

<template>
  <ul class="ls-outline-items" :class="root ? 'root' : 'nested'">
    <li v-for="h in headers" :key="h.link">
      <a
        class="ls-outline-link"
        :class="{ active: h.link === active }"
        :href="h.link"
        :title="h.title"
        :aria-current="h.link === active ? 'location' : undefined"
        @click="focusHeading(h.link)"
      >{{ h.title }}</a>
      <OutlineItems v-if="h.children.length" :headers="h.children" :active="active" />
    </li>
  </ul>
</template>

<style scoped>
.ls-outline-items {
  list-style: none;
  margin: 0;
  padding: 0;
}
.nested {
  padding-left: 13px;
}
.ls-outline-link {
  display: block;
  line-height: 32px;
  font-size: 14px;
  font-weight: 400;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: none;
  transition: color 0.5s;
}
.ls-outline-link:hover,
.ls-outline-link.active {
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}
</style>
