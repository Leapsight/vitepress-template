<!--
Inline site metadata value (replaces bondy_docs' BondyVersion and its
provide/inject plumbing). Reads `themeConfig.metadata`:

  themeConfig: {
    metadata: { productVersion: '1.0.0-rc.4', apiLevel: '3' }
  }

Usage in markdown: <SiteMeta k="productVersion" />
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  /** Key into themeConfig.metadata. */
  k: string
  /** Render as plain text instead of <code>. */
  plain?: boolean
}>()

const { theme } = useData()
const value = computed(() => theme.value.metadata?.[props.k] ?? '')
</script>

<template>
  <span v-if="plain">{{ value }}</span>
  <code v-else>{{ value }}</code>
</template>
