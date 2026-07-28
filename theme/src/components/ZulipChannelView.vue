<!--
SPDX-License-Identifier: Apache-2.0

Renders one Zulip channel from its metadata — driven entirely by the `channel`
object (typically a VitePress dynamic-route `params`). Reusable: the back-link
target and the Zulip workspace base are props, and status badges use the
theme's semantic color tokens so light/dark both work.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'

interface Channel {
  channel_id?: number | string
  name: string
  description?: string
  /** Zulip's server-rendered (sanitized) description HTML; supports markdown. */
  description_html?: string
  color?: string
  /** Zulip channel-folder (group) this channel belongs to. */
  folder?: string
  is_private?: boolean
  is_web_public?: boolean
  topics?: string[]
  url?: string
}

const props = withDefaults(
  defineProps<{
    channel: Channel
    backLink?: string
    backLabel?: string
  }>(),
  { backLink: '/community/', backLabel: '← All community channels' }
)

const accent = computed(() => props.channel.color || 'var(--vp-c-brand-1)')

// Deep-link back to this channel's group heading on the overview page.
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const folderLink = computed(() =>
  props.channel.folder
    ? `${withBase(props.backLink)}#${slug(props.channel.folder)}`
    : withBase(props.backLink)
)
</script>

<template>
  <div class="zcv">
    <a :href="withBase(backLink)" class="zcv-back">{{ backLabel }}</a>

    <header class="zcv-head" :style="{ borderColor: accent }">
      <h1 class="zcv-title">
        <span class="zcv-dot" :style="{ backgroundColor: accent }" aria-hidden="true"></span>
        #&nbsp;{{ channel.name }}
      </h1>
      <p v-if="channel.folder" class="zcv-folder">
        in <a :href="folderLink" :style="{ color: accent }">{{ channel.folder }}</a>
      </p>
      <div class="zcv-badges">
        <span v-if="channel.is_private" class="zcv-badge is-private">🔒 Private</span>
        <span v-else class="zcv-badge is-public">🌍 Open stream</span>
        <span v-if="channel.is_web_public" class="zcv-badge is-web">👀 Public web archive</span>
      </div>
    </header>

    <!-- Zulip sanitizes rendered_description server-side; source is our own
         trusted workspace admins, so v-html is safe here. -->
    <div v-if="channel.description_html" class="zcv-lead" v-html="channel.description_html"></div>
    <p v-else-if="channel.description" class="zcv-lead">{{ channel.description }}</p>
    <p v-else class="zcv-lead zcv-lead-empty">This channel has no description yet.</p>

    <a v-if="channel.url" :href="channel.url" target="_blank" rel="noreferrer" class="zcv-open">
      Open #{{ channel.name }} in Zulip →
    </a>

    <div v-if="channel.is_private" class="custom-block warning">
      <p class="custom-block-title">🔒 Access is restricted</p>
      <p>
        This channel isn't publicly listed. Ask in an open channel (or email the maintainers) to
        request access<span v-if="channel.channel_id">, referencing channel <code>#{{ channel.channel_id }}</code></span>.
      </p>
    </div>

    <h2 class="zcv-subhead">Topics ({{ channel.topics?.length || 0 }})</h2>
    <div class="zcv-topics">
      <div v-for="topic in channel.topics" :key="topic" class="zcv-topic">
        <span class="zcv-topic-icon" aria-hidden="true">💬</span>
        <span class="zcv-topic-label">{{ topic }}</span>
      </div>
      <p v-if="!channel.topics || channel.topics.length === 0" class="zcv-empty">
        No topics are being tracked in this channel yet.
      </p>
    </div>
  </div>
</template>

<style scoped>
.zcv {
  margin-top: 0.5rem;
}
.zcv-back {
  display: inline-block;
  margin-bottom: 1.75rem;
  font-size: 0.9rem;
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.zcv-back:hover {
  text-decoration: underline;
}
.zcv-head {
  border-left: 4px solid var(--vp-c-brand-1);
  padding-left: 1.25rem;
  margin-bottom: 1.75rem;
}
.zcv-title {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin: 0 0 0.6rem !important;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--vp-c-text-1);
  border: 0;
  padding: 0;
}
.zcv-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex: none;
}
.zcv-folder {
  margin: 0 0 0.7rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
}
.zcv-folder a {
  font-weight: 600;
  text-decoration: none;
}
.zcv-folder a:hover {
  text-decoration: underline;
}
.zcv-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.zcv-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}
.zcv-badge.is-public {
  color: var(--vp-c-green-1);
  background: var(--vp-c-green-soft);
}
.zcv-badge.is-private {
  color: var(--vp-c-red-1);
  background: var(--vp-c-red-soft);
}
.zcv-badge.is-web {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.zcv-lead {
  font-size: 1.15rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  margin: 0 0 1.25rem;
}
.zcv-lead-empty {
  font-style: italic;
  color: var(--vp-c-text-3);
}
/* Zulip-rendered markdown: descriptions may hold paragraphs, links, lists, code. */
.zcv-lead :deep(p) {
  margin: 0 0 0.9rem;
}
.zcv-lead :deep(p:last-child) {
  margin-bottom: 0;
}
.zcv-lead :deep(a) {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.zcv-lead :deep(a:hover) {
  text-decoration: underline;
}
.zcv-lead :deep(ul),
.zcv-lead :deep(ol) {
  margin: 0.6rem 0 0.9rem;
  padding-left: 1.4rem;
}
.zcv-lead :deep(li) {
  margin: 0.25rem 0;
}
.zcv-lead :deep(code) {
  font-size: 0.9em;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: var(--vp-c-bg-soft);
}
.zcv-open {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.75rem;
  padding: 0.55rem 1.15rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.zcv-open:hover {
  color: var(--vp-c-bg);
  background: var(--vp-c-brand-1);
}
.zcv-subhead {
  margin-top: 2rem;
  padding-bottom: 0.5rem;
  font-size: 1.3rem;
  border-top: 0;
}
.zcv-topics {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 0.7rem;
  margin-top: 1rem;
}
.zcv-topic {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.7rem 0.9rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  transition: border-color 0.18s;
}
.zcv-topic:hover {
  border-color: var(--vp-c-brand-1);
}
.zcv-topic-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.zcv-empty {
  grid-column: 1 / -1;
  margin: 0;
  font-style: italic;
  color: var(--vp-c-text-3);
}
</style>
