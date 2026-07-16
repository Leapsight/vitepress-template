<!--
Small floated pill label (bondy_docs called this Badge; renamed so it
does not shadow VitePress's built-in <Badge>). The background follows
the brand token unless a color is given.
-->
<script setup lang="ts">
defineProps<{
  text: string
  color?: string
}>()
</script>

<template>
  <span class="ls-pill" :style="color ? { backgroundColor: color } : undefined">{{ text }}</span>
</template>

<style scoped>
.ls-pill {
  float: right;
  background-color: var(--vp-c-brand-1);
  color: var(--vp-c-white, #ffffff);
  height: 30px;
  font-size: 13px;
  padding: 8px;
  text-align: center;
  line-height: 15px;
  border-radius: 5px;
}
</style>
