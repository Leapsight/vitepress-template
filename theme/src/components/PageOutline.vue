<!--
The "On this page" aside for a layout that renders markdown outside
VitePress's doc layout (a blog article, say). It shows from 1280px up, where
VitePress shows its own aside; below that, PageLocalNav carries the outline.

Place it in a column beside the content. It sticks below the top bar at
`--ls-outline-top` (default: 32px under `--vp-nav-height`) and scrolls on
its own when the outline is taller than the viewport.

  <PageOutline container=".vp-doc" />

Renders nothing when the page has no headings in the configured levels, or
when its frontmatter sets `aside: false`.
-->
<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useData } from 'vitepress'
import OutlineItems from './OutlineItems.vue'
import { usePageOutline, useActiveHeading, useOutlineTitle } from '../composables/outline'

const props = withDefaults(defineProps<{ container?: string }>(), { container: '.vp-doc' })

const { frontmatter } = useData()
const headers = usePageOutline(props.container)
const { active } = useActiveHeading(headers)
const title = useOutlineTitle()
const shown = computed(() => headers.value.length > 0 && frontmatter.value.aside !== false)

// The marker sits beside the active link; its offset is read from the link
// itself, so it follows any line height a site sets.
const list = ref<HTMLElement>()
const markerTop = ref<number | null>(null)
watch(
  [active, headers],
  async () => {
    await nextTick()
    const link = active.value ? list.value?.querySelector<HTMLElement>(`a[href="${CSS.escape(active.value)}"]`) : null
    markerTop.value = link ? link.offsetTop : null
  },
  { flush: 'post' }
)
</script>

<template>
  <nav v-if="shown" class="ls-page-outline" aria-labelledby="ls-page-outline-title">
    <div ref="list" class="content">
      <div
        class="marker"
        aria-hidden="true"
        :style="markerTop == null ? { opacity: 0 } : { opacity: 1, top: markerTop + 7 + 'px' }"
      />
      <div id="ls-page-outline-title" class="title" role="heading" aria-level="2">{{ title }}</div>
      <OutlineItems :headers="headers" :active="active" root />
    </div>
  </nav>
</template>

<style scoped>
.ls-page-outline {
  display: none;
}
@media (min-width: 1280px) {
  .ls-page-outline {
    display: block;
    position: sticky;
    top: var(--ls-outline-top, calc(var(--vp-nav-height, 64px) + 32px));
    max-height: calc(100vh - var(--ls-outline-top, calc(var(--vp-nav-height, 64px) + 32px)) - 32px);
    overflow-y: auto;
    scrollbar-width: none;
  }
  .ls-page-outline::-webkit-scrollbar {
    display: none;
  }
}
.content {
  position: relative;
  border-left: 1px solid var(--vp-c-divider);
  padding-left: 16px;
  font-size: 13px;
  font-weight: 500;
}
.marker {
  position: absolute;
  top: 32px;
  left: -1px;
  width: 2px;
  height: 18px;
  border-radius: 2px;
  background-color: var(--vp-c-brand-1);
  transition:
    top 0.25s cubic-bezier(0, 1, 0.5, 1),
    background-color 0.5s,
    opacity 0.25s;
}
.title {
  line-height: 32px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
</style>
