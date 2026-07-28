<!--
SPDX-License-Identifier: Apache-2.0

A grid of Zulip channel cards, each linking to that channel's page. Pass the
channel list (from a data loader) and the base path the channel pages live
under; each card links to `${base}${channel.slug}`.

Channels are grouped by their Zulip "folder" (e.g. Language, Protocols): each
folder becomes a section header with its own grid, ordered by the folder's Zulip
order. If no channel carries a folder, it falls back to a single flat grid.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'

interface Channel {
  slug: string
  name: string
  description?: string
  /** Short plain-text teaser (from the sync); falls back to description. */
  summary?: string
  color?: string
  /** Zulip channel-folder name; blank if the channel isn't in a folder. */
  folder?: string
  /** Zulip folder order, for sorting groups. */
  folder_order?: number
  is_private?: boolean
  topics?: string[]
}

const props = withDefaults(
  defineProps<{
    channels: Channel[]
    base?: string
  }>(),
  { base: '/community/channels/' }
)

const UNGROUPED = 'Other'

// Anchor id for a folder, so channel pages can deep-link to their group.
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Group channels by folder, ordered by the folder's Zulip `order`.
const groups = computed(() => {
  const byFolder = new Map<string, { name: string; order: number; channels: Channel[] }>()
  for (const c of props.channels) {
    const name = c.folder || UNGROUPED
    if (!byFolder.has(name)) {
      byFolder.set(name, {
        name,
        order: c.folder_order ?? Number.MAX_SAFE_INTEGER,
        channels: []
      })
    }
    byFolder.get(name)!.channels.push(c)
  }
  return [...byFolder.values()].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name)
  )
})

// Only show headers when there's real grouping to show.
const showHeaders = computed(
  () => groups.value.length > 1 || (groups.value[0] && groups.value[0].name !== UNGROUPED)
)
</script>

<template>
  <div class="zch">
    <section v-for="g in groups" :key="g.name" class="zch-group">
      <h2 v-if="showHeaders" :id="slug(g.name)" class="zch-group-title">{{ g.name }}</h2>
      <div class="zch-grid">
        <a
          v-for="c in g.channels"
          :key="c.slug"
          class="zch-card"
          :href="withBase(base + c.slug)"
        >
          <span class="zch-dot" :style="{ background: c.color || 'var(--vp-c-brand-1)' }" aria-hidden="true"></span>
          <span class="zch-name"># {{ c.name }}</span>
          <span v-if="c.summary || c.description" class="zch-desc">{{ c.summary || c.description }}</span>
          <span class="zch-meta">
            {{ c.topics?.length || 0 }} {{ (c.topics?.length || 0) === 1 ? 'topic' : 'topics' }} ·
            {{ c.is_private ? '🔒 Private' : 'Public' }}
          </span>
        </a>
      </div>
    </section>
  </div>
</template>

<style scoped>
.zch {
  margin: 1.5rem 0;
}
.zch-group + .zch-group {
  margin-top: 2.75rem;
}
.zch-group-title {
  margin: 0 0 1rem;
  padding: 0 0 0.5rem;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
  color: var(--vp-c-text-1);
  border: 0;
  border-bottom: 1px solid var(--vp-c-divider);
}
.zch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.zch-card {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas: 'dot name' '. desc' '. meta';
  align-items: center;
  gap: 0.15rem 0.6rem;
  padding: 1rem 1.1rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  text-decoration: none;
  transition: border-color 0.18s, background 0.18s;
}
.zch-card:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-mute);
}
.zch-dot {
  grid-area: dot;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.zch-name {
  grid-area: name;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.zch-desc {
  grid-area: desc;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--vp-c-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.zch-meta {
  grid-area: meta;
  margin-top: 0.35rem;
  font-family: var(--vp-font-family-mono, ui-monospace, monospace);
  font-size: 0.7rem;
  letter-spacing: 0.03em;
  color: var(--vp-c-text-3);
}
</style>
