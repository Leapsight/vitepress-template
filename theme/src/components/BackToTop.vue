<!--
Desktop floating "back to top" FAB — visible after the reader scrolls
past one screen, smooth-scrolls to top on click. Mobile readers get
VitePress's built-in "Return to top" link in the collapsed local-nav,
so this is desktop-only via `@media (min-width: 768px)`.

Visibility is toggled via a `.is-visible` class rather than v-show
because v-show injects an inline `style="display:none"` during SSR,
which then beats the desktop media-query rule even after hydration
clears the ref.
-->
<template>
  <button
    type="button"
    class="ls-back-to-top"
    :class="{ 'is-visible': visible }"
    :title="label"
    :aria-label="label"
    :tabindex="visible ? 0 : -1"
    :aria-hidden="visible ? 'false' : 'true'"
    @click="scrollToTop"
  >
    <span aria-hidden="true">↑</span>
  </button>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'

const label = 'Back to top'
const visible = ref(false)

const SHOW_THRESHOLD = 240

function onScroll() {
  const y = window.scrollY || document.documentElement.scrollTop || 0
  visible.value = y > SHOW_THRESHOLD
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.ls-back-to-top {
  display: none;
}

@media (min-width: 768px) {
  .ls-back-to-top {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    right: 1.5rem;
    bottom: 1.5rem;
    z-index: 50;
    width: 2.5rem;
    height: 2.5rem;
    border: 1px solid var(--vp-c-divider);
    border-radius: 9999px;
    background: var(--vp-c-bg-soft);
    color: var(--vp-c-text-1);
    font-size: 1.125rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    opacity: 0;
    pointer-events: none;
    transform: translateY(8px);
    transition: opacity 160ms ease, transform 160ms ease, background-color 120ms ease;
  }

  .ls-back-to-top.is-visible {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }

  .ls-back-to-top:hover {
    background: var(--vp-c-bg-mute);
  }

  .ls-back-to-top:focus-visible {
    outline: 2px solid var(--vp-c-brand-1);
    outline-offset: 2px;
  }
}
</style>
