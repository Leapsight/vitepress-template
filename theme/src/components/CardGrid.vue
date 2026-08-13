<!--
Responsive card grid (from bondy_lang's landing pages). Each card is a
title + short description tile with a brand-color accent bar. Flows
across viewport widths via `repeat(auto-fill, minmax(260px, 1fr))`.
-->
<template>
  <ul v-if="cards.length" class="ls-card-grid">
    <li v-for="(c, i) in cards" :key="c.link || c.title || i" class="ls-card-item">
      <a :href="applyBase(c.link)" class="card">
        <span class="card-accent" aria-hidden="true"></span>
        <span class="card-body">
          <span class="card-title">{{ c.title }}</span>
          <span v-if="c.description" class="card-desc">{{ c.description }}</span>
        </span>
        <span class="card-arrow" aria-hidden="true">→</span>
      </a>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { applyBase } from '../lib/apply-base'

export interface Card {
  title: string
  description?: string
  link: string
}

defineProps<{ cards: Card[] }>()
</script>

<style scoped>
.ls-card-grid {
  list-style: none !important;
  padding: 0 !important;
  margin: 1rem 0 2rem !important;
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.ls-card-item {
  margin: 0 !important;
  padding: 0;
}
.card {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0.75rem;
  height: 100%;
  padding: 1rem 1.1rem 1rem 1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: inherit;
  text-decoration: none !important;
  overflow: hidden;
  transition: border-color 120ms, transform 120ms, box-shadow 120ms;
}
.card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.card:hover .card-arrow,
.card:hover .card-title {
  color: var(--vp-c-brand-1);
}
.card-accent {
  flex: 0 0 auto;
  width: 3px;
  align-self: stretch;
  background: var(--vp-c-brand-1);
  border-radius: 1.5px;
}
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}
.card-title {
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}
.card-desc {
  color: var(--vp-c-text-2);
  font-size: 0.9em;
  line-height: 1.5;
}
.card-arrow {
  flex: 0 0 auto;
  color: var(--vp-c-text-3);
  font-weight: 600;
  align-self: center;
  transition: color 120ms;
}
</style>
