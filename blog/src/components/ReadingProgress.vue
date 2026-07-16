<!--
SPDX-License-Identifier: Apache-2.0
Thin scroll-progress bar fixed to the top of the viewport.
-->
<template>
  <div class="blog-progress" :style="{ transform: `scaleX(${progress})` }" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

const progress = ref(0)

function onScroll() {
  const doc = document.documentElement
  const max = doc.scrollHeight - doc.clientHeight
  progress.value = max > 0 ? Math.min(1, (doc.scrollTop || window.scrollY) / max) : 0
}

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  onScroll()
})
onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<style scoped>
.blog-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 60;
  background: var(--vp-c-brand-1);
  transform-origin: 0 50%;
  transform: scaleX(0);
  transition: transform 80ms linear;
}
</style>
