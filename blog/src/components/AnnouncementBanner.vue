<!--
SPDX-License-Identifier: Apache-2.0

Site-wide announcement bar. Any post can drive it from frontmatter:

  announce: true
  announceText: Bondy is becoming a language      # optional; else the title
  announceCta: Read the announcement              # optional; else "Read more"
  announceWeeks: 6                                 # optional; lifetime (default 4)
  announceUntil: 2026-11-01                        # optional; explicit end date

The newest post whose announcement window is still open is shown, with a link
to it and a dismiss button (remembered per-announcement in localStorage).

Every candidate (flagged, unexpired at build) is server-rendered `hidden`. The
choice of which one to show — expiry against the reader's clock, dismissal —
is made before first paint by the inline <head> script that
`announceTransformPageData` (blog/config/announce.js) adds; it reveals the
chosen bar with a style rule. So the bar is in place in the first frame and
never shifts the page, yet still expires with no rebuild. Without that
transform wired in, no bar is shown.
-->
<template>
  <template v-for="p in candidates" :key="p.url">
    <aside v-if="p.announceKey !== dismissed" class="announce-bar" :data-announce-key="p.announceKey" hidden>
      <div class="announce-inner">
        <a class="announce-row" :href="withBase(p.url)">
          <div class="announce-idx">News</div>
          <div class="announce-main">
            <span v-if="p.section" class="announce-cat">{{ p.section }}</span>
            <h4 class="announce-title">{{ p.announceText || p.title }}</h4>
            <p v-if="p.excerpt" class="announce-excerpt">{{ p.excerpt }}</p>
          </div>
          <div class="announce-aside">{{ p.announceCta || 'Read more' }} →</div>
        </a>
        <button class="announce-x" type="button" aria-label="Dismiss announcement" @click="dismiss(p)">×</button>
      </div>
    </aside>
  </template>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { withBase } from 'vitepress'
import { usePosts } from '../composables'
import type { PostSummary } from '../types'

const candidates = usePosts()
  .filter((p) => p.announce)
  .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
const dismissed = ref<string | null>(null)

function dismiss(p: PostSummary) {
  try {
    localStorage.setItem(p.announceKey!, '1')
  } catch {
    /* private mode / no storage — dismissed for this page view only */
  }
  dismissed.value = p.announceKey
  document.documentElement.classList.remove('has-announce')
}
</script>
