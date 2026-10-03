<!--
The "On this page" bar for a layout that renders markdown outside
VitePress's doc layout, below 1280px — PageOutline's counterpart, as
VitePress's local nav is its aside's. Behaves as VitePress's does on a page
without a sidebar: a bar that sticks under the top bar, whose button opens
the outline with a "Return to top" link; it closes on Escape, an outside
click, a followed link or a page change. With no headings it offers only
"Return to top", once the page has scrolled.

Place it at the top of the scrolling region (it is sticky within its
parent). Tune it with custom properties:

  --ls-local-nav-top        where it sticks (default: --vp-nav-height)
  --ls-local-nav-max-width  its content's width (default: none)
  --ls-local-nav-pad        its content's side padding (default: 24px)
  --ls-local-nav-bg         its background (default: --vp-local-nav-bg-color)

  <PageLocalNav container=".vp-doc" />
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onContentUpdated, useData } from 'vitepress'
import OutlineItems from './OutlineItems.vue'
import { usePageOutline, useActiveHeading, useOutlineTitle } from '../composables/outline'

const props = withDefaults(defineProps<{ container?: string }>(), { container: '.vp-doc' })

const { theme, frontmatter } = useData()
const headers = usePageOutline(props.container)
const { active } = useActiveHeading(headers)
const title = useOutlineTitle()
const topLabel = computed(() => theme.value.returnToTopLabel || 'Return to top')
const empty = computed(() => headers.value.length === 0)

const open = ref(false)
const root = ref<HTMLElement>()
const items = ref<HTMLElement>()
const vh = ref(0)

// With no headings the bar only offers "Return to top", which means nothing
// at the top of the page, so it appears once the page has scrolled.
const scrolled = ref(false)
const onScroll = () => (scrolled.value = window.scrollY > 0)
const shown = computed(() => frontmatter.value.aside !== false && (!empty.value || scrolled.value))

function onDocClick(e: Event) {
  if (!root.value?.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) open.value = false
}
watch(open, (v) => {
  if (v) document.addEventListener('click', onDocClick)
  else document.removeEventListener('click', onDocClick)
})
onContentUpdated(() => (open.value = false))
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('click', onDocClick)
})

function toggle() {
  open.value = !open.value
  // The panel may run to the bottom of the viewport, measured from wherever
  // the bar sits now.
  vh.value = window.innerHeight - (root.value?.getBoundingClientRect().bottom ?? 0)
}
function onItemsClick(e: Event) {
  if ((e.target as HTMLElement).classList.contains('ls-outline-link')) {
    if (items.value) items.value.style.transition = 'none'
    nextTick(() => (open.value = false))
  }
}
function toTop() {
  open.value = false
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
}
</script>

<template>
  <div v-if="shown" ref="root" class="ls-local-nav" :class="{ empty }">
    <div class="inner">
      <button v-if="!empty" type="button" class="toggle" :class="{ open }" :aria-expanded="open" @click="toggle">
        <span>{{ title }}</span>
        <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </button>
      <button v-else type="button" class="toggle" @click="toTop">{{ topLabel }}</button>
      <Transition name="ls-flyout">
        <div v-if="open" ref="items" class="items" :style="{ '--ls-vh': vh + 'px' }" @click="onItemsClick">
          <div class="head"><a class="top-link" href="#" @click.prevent="toTop">{{ topLabel }}</a></div>
          <div class="outline"><OutlineItems :headers="headers" :active="active" root /></div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.ls-local-nav {
  position: sticky;
  top: var(--ls-local-nav-top, var(--vp-nav-height, 64px));
  z-index: 20;
  width: 100%;
  border-bottom: 1px solid var(--vp-c-gutter);
  background-color: var(--ls-local-nav-bg, var(--vp-local-nav-bg-color, var(--vp-c-bg)));
}
.ls-local-nav.empty {
  position: fixed;
  left: 0;
  right: 0;
}
@media (min-width: 1280px) {
  .ls-local-nav {
    display: none;
  }
}
.inner {
  position: relative;
  max-width: var(--ls-local-nav-max-width, none);
  margin: 0 auto;
  padding: 12px var(--ls-local-nav-pad, 24px) 11px;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 24px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: color 0.5s;
}
.toggle:hover,
.toggle.open {
  color: var(--vp-c-text-1);
  transition: color 0.25s;
}
.chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.25s;
}
.toggle.open .chevron {
  transform: rotate(90deg);
}
@media (min-width: 960px) {
  .toggle {
    font-size: 14px;
  }
  .chevron {
    width: 16px;
    height: 16px;
  }
}
.items {
  position: absolute;
  top: 40px;
  left: 16px;
  right: 16px;
  display: grid;
  gap: 1px;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  background-color: var(--vp-c-gutter);
  max-height: calc(var(--ls-vh, 100vh) - 16px);
  overflow: hidden auto;
  box-shadow: var(--vp-shadow-3);
}
@media (min-width: 960px) {
  .items {
    right: auto;
    left: var(--ls-local-nav-pad, 24px);
    width: 320px;
  }
}
.head,
.outline {
  background-color: var(--vp-c-bg-soft);
}
.top-link {
  display: block;
  padding: 0 16px;
  line-height: 48px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.outline {
  padding: 8px 0;
}
.outline :deep(.root) {
  padding: 0 16px;
}
.ls-flyout-enter-active {
  transition: all 0.2s ease-out;
}
.ls-flyout-leave-active {
  transition: all 0.15s ease-in;
}
.ls-flyout-enter-from,
.ls-flyout-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
</style>
