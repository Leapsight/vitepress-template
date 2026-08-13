<!-- Image with click-to-zoom (medium-zoom). -->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import mediumZoom from 'medium-zoom'
import { applyBase } from '../lib/apply-base'

defineProps<{
  src: string
  alt?: string
  width?: string
}>()

const imgRef = ref<HTMLImageElement | null>(null)

onMounted(() => {
  if (imgRef.value) {
    mediumZoom(imgRef.value, { background: 'var(--vp-c-bg)' })
  }
})
</script>

<template>
  <img class="zoom-img" ref="imgRef" :src="applyBase(src)" :alt="alt" :width="width" />
</template>

<style>
.zoom-img {
  height: auto;
  margin-top: 50px;
  margin-bottom: 50px;
}
.medium-zoom-overlay {
  z-index: 20;
}
.medium-zoom-image {
  z-index: 21;
}
</style>
