<!--
Shared layout: wraps VitePress's default layout and adds

  - a DRAFT watermark when frontmatter has `draft: true`
  - a "Related" feature grid before the footer when frontmatter has
    `related:` (array of { text, link, description?, icon?, ... })
  - the navbar version widget (when themeConfig.versions is set)
  - a floating back-to-top button

Sites that need more slots can wrap this Layout again in their own
theme file and pass slots through. Every slot reaches VitePress's layout.
The four this Layout fills itself (OWNED below) render its content first
and then the site's, so a site filling one of them adds to it rather than
replacing the watermark, the Related grid, the version widget or
BackToTop.
-->
<script setup lang="ts">
import { computed, useSlots } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Features from './components/Features.vue'
import NavbarVersion from './components/NavbarVersion.vue'
import BackToTop from './components/BackToTop.vue'

const { Layout } = DefaultTheme

// Forwarded by the loop below would mean defined twice, and the forwarded
// copy wins, so these are excluded from it and composed explicitly.
const OWNED = new Set(['nav-bar-content-after', 'doc-before', 'doc-footer-before', 'layout-bottom'])
const slots = useSlots()
const forwarded = computed(() => Object.keys(slots).filter((n) => !OWNED.has(n)))
</script>

<template>
  <Layout>
    <template v-for="name in forwarded" #[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>

    <template #nav-bar-content-after>
      <NavbarVersion />
      <slot name="nav-bar-content-after" />
    </template>

    <template #doc-before>
      <span v-if="$frontmatter.draft" class="ls-watermark">DRAFT</span>
      <slot name="doc-before" />
    </template>

    <template #doc-footer-before>
      <div v-if="$frontmatter.related" class="vp-doc">
        <!-- no id attribute so it doesn't show up in the outline -->
        <h2>Related</h2>
        <Features class="VPHomeFeatures" :features="$frontmatter.related" />
      </div>
      <slot name="doc-footer-before" />
    </template>

    <template #layout-bottom>
      <BackToTop />
      <slot name="layout-bottom" />
    </template>
  </Layout>
</template>

<style>
/* Lead paragraph: first paragraph after the H1 reads larger. */
.vp-doc h1 + p {
  line-height: 1.9rem;
  font-size: 1.235rem;
}
</style>
