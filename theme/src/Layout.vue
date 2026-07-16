<!--
Shared layout: wraps VitePress's default layout and adds

  - a DRAFT watermark when frontmatter has `draft: true`
  - a "Related" feature grid before the footer when frontmatter has
    `related:` (array of { text, link, description?, icon?, ... })
  - the navbar version widget (when themeConfig.versions is set)
  - a floating back-to-top button

Sites that need more slots can wrap this Layout again in their own
theme file and pass slots through.
-->
<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import Features from './components/Features.vue'
import NavbarVersion from './components/NavbarVersion.vue'
import BackToTop from './components/BackToTop.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData" />
    </template>

    <template #nav-bar-content-after>
      <NavbarVersion />
    </template>

    <template #doc-before>
      <span v-if="$frontmatter.draft" class="ls-watermark">DRAFT</span>
    </template>

    <template #doc-footer-before>
      <div v-if="$frontmatter.related" class="vp-doc">
        <!-- no id attribute so it doesn't show up in the outline -->
        <h2>Related</h2>
        <Features class="VPHomeFeatures" :features="$frontmatter.related" />
      </div>
    </template>

    <template #layout-bottom>
      <BackToTop />
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
