<!--
Responsive grid of <Feature> cards. Accepts the same item shape as the
`related:` frontmatter convention and the sidebar `isFeature` pattern.
-->
<script setup lang="ts">
import Feature from './Feature.vue'

export interface FeatureItem {
  icon?: string
  type?: string
  link: string
  linkText?: string
  text: string
  description?: string
}

defineProps<{
  features: FeatureItem[]
}>()
</script>

<template>
  <div v-if="features && features.length" class="Features">
    <div class="container">
      <div class="items">
        <div v-for="feature in features" :key="feature.link" class="item grid-3">
          <Feature
            :icon="feature.icon"
            :type="feature.type"
            :link="feature.link"
            :linkText="feature.linkText"
            :text="feature.text"
            :description="feature.description"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.Features {
  position: relative;
}

.container {
  margin: 0 auto;
  max-width: 1152px;
}

.items {
  display: flex;
  flex-wrap: wrap;
  margin: -8px;
}

.item {
  padding: 8px;
  width: 100%;
}

@media (min-width: 768px) {
  .item.grid-3 {
    width: calc(100% / 3);
  }
}
</style>
