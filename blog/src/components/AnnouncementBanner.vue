<!--
SPDX-License-Identifier: Apache-2.0

Site-wide announcement bar. Any post can drive it from frontmatter:

  announce: true
  announceText: Bondy is becoming a language      # optional; else the title
  announceCta: Read the announcement              # optional; else "Read more"
  announceWeeks: 6                                 # optional; lifetime (default 4)
  announceUntil: 2026-11-01                        # optional; explicit end date

The newest post whose announcement window is still open is shown, with a link
to it and a dismiss button (remembered per-announcement in localStorage). The
window is evaluated on the CLIENT, so the bar disappears when it expires with
no rebuild. Renders nothing on the server (no flash of a stale/expired bar).
-->
<template>
  <aside v-if="active" class="announce-bar">
    <div class="announce-inner">
      <a class="announce-row" :href="withBase(active.url)">
        <div class="announce-idx">News</div>
        <div class="announce-main">
          <span v-if="active.section" class="announce-cat">{{ active.section }}</span>
          <h4 class="announce-title">{{ active.announceText || active.title }}</h4>
          <p v-if="active.excerpt" class="announce-excerpt">{{ active.excerpt }}</p>
        </div>
        <div class="announce-aside">{{ active.announceCta || 'Read more' }} →</div>
      </a>
      <button class="announce-x" type="button" aria-label="Dismiss announcement" @click="dismiss">×</button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { withBase } from 'vitepress'
import { usePosts } from '../composables'
import type { PostSummary } from '../types'

const posts = usePosts()
const active = ref<PostSummary | null>(null)

function keyFor(p: PostSummary): string {
  return 'ls-announce:' + p.url + '|' + (p.announceUntil ?? '')
}

onMounted(() => {
  const now = Date.now()
  const candidates = posts
    .filter((p) => p.announce && (!p.announceUntil || now < +new Date(p.announceUntil)))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const top = candidates[0]
  if (!top) return
  try {
    if (localStorage.getItem(keyFor(top)) === '1') return
  } catch {
    /* private mode / no storage — just show it */
  }
  active.value = top
})

function dismiss() {
  if (active.value) {
    try {
      localStorage.setItem(keyFor(active.value), '1')
    } catch {
      /* ignore */
    }
  }
  active.value = null
}
</script>
