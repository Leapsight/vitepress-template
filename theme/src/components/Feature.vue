<!-- Single feature card. Usually rendered via <Features>. -->
<script setup lang="ts">
defineProps<{
  icon?: string
  type?: string
  text: string
  link: string
  linkText?: string
  description?: string
}>()
</script>

<template>
  <a :href="link" class="feature-link">
    <article class="Feature">
      <div v-if="icon" class="icon">{{ icon }}</div>
      <span v-if="type" class="type">{{ type }}</span>
      <h3 class="title">{{ text }}</h3>
      <p class="details" v-if="description">{{ description }}</p>
      <p v-if="linkText" class="link-text">{{ linkText }}&nbsp;&rarr;</p>
    </article>
  </a>
</template>

<style scoped>
.feature-link {
  color: inherit;
  text-decoration: none;
}

.Feature {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 0px 24px 24px 24px;
  height: 100%;
}

article:hover {
  border: 1px solid var(--vp-c-brand-1);
}

article:hover > .title,
article:hover > .type {
  color: var(--vp-c-brand-1);
}

h3 {
  margin-top: 16px;
}

.icon {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  border-radius: 6px;
  background-color: var(--vp-c-bg-soft);
  width: 48px;
  height: 48px;
  font-size: 24px;
}

.dark .icon {
  background-color: var(--vp-c-bg);
}

.type {
  display: block;
  position: relative;
  top: 20px;
  text-transform: uppercase;
  font-size: 10px;
  color: var(--vp-c-text-2);
}

.title {
  line-height: 24px;
  font-size: 16px;
  font-weight: 600;
}

.details {
  padding-top: 8px;
  line-height: 24px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.link-text {
  font-size: 14px;
}
</style>
