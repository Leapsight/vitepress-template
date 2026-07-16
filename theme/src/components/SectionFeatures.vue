<!--
Auto-generated section landing grid (the "sidebar drives the landing
page" pattern from bondy_docs). Sidebar items may carry two extra keys:

  { text, link, isFeature: true, description: '...' }

A section index page then just does:

  <SectionFeatures path="/guide/" />

and renders one card per sidebar item flagged `isFeature`, with no
duplicated data.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import Features from './Features.vue'
import type { FeatureItem } from './Features.vue'

const props = defineProps<{
  /** Sidebar key to read, e.g. '/guide/'. */
  path: string
}>()

const { theme } = useData()

interface SidebarEntry {
  text?: string
  link?: string
  description?: string
  isFeature?: boolean
  items?: SidebarEntry[]
}

function collect(entries: SidebarEntry[] | undefined, acc: FeatureItem[]): FeatureItem[] {
  if (!entries) return acc
  for (const entry of entries) {
    if (entry.isFeature && entry.link && entry.text) {
      acc.push({
        text: entry.text,
        link: entry.link,
        description: entry.description
      })
    }
    if (entry.items) collect(entry.items, acc)
  }
  return acc
}

const features = computed<FeatureItem[]>(() => {
  const sidebar = theme.value.sidebar
  if (!sidebar) return []
  const section = Array.isArray(sidebar) ? sidebar : sidebar[props.path]
  return collect(section, [])
})
</script>

<template>
  <Features :features="features" />
</template>
