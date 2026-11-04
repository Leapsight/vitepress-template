<!--
Navbar version widget. Reads `themeConfig.versions` from the site
config:

  themeConfig: {
    versions: [
      { version: '1.2.0', label: '1.2.0', current: true },
      { version: '1.1.0', label: '1.1.0', link: '/v1.1.0/' }
    ],
    // Optional. The version this build documents; the trigger shows it and
    // the menu marks it. Defaults to the entry marked `current`.
    version: '1.1.0',
    // Optional. A JSON array of the same entries, fetched on mount to
    // replace `versions`, so an archived build lists versions released
    // after it. Use a site-root path, served by the live deployment.
    versionsUrl: '/versions.json'
  }

Rendering modes:
  - One version  → static brand-tinted badge (`v1.2.0`).
  - Several      → dropdown with the current version marked. Each entry
                   links to `link` if given, else `/` for the current
                   version and `/v<x>/` for the rest.

Targets are absolute from the site root and are deliberately not passed
through withBase(): every version is a separate deployment with its own
base, so an archived build would otherwise prefix its siblings' paths
with its own and 404.

Each link carries `target="_self"` so the browser does a full page load.
Without it the VitePress router intercepts the click (same origin, HTML
path) and resolves the target against the current build's routes, which
do not include a sibling version, so it renders the 404 page. The router
skips any link that has a `target` attribute (vitepress 1.6.4,
dist/client/app/router.js, click handler).

Mounted automatically via the theme Layout's `nav-bar-content-after`
slot; renders nothing when `versions` is absent or empty.
-->
<template>
  <div v-if="hasAny" class="ls-nav-version" :class="{ 'is-open': isOpen }">
    <button
      v-if="multiple"
      ref="trigger"
      type="button"
      class="trigger"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :title="`Version ${active.label}`"
      @click="toggle"
    >
      <span class="prefix">v</span>
      <span class="value">{{ active.label }}</span>
      <span class="chevron" aria-hidden="true">▾</span>
    </button>
    <span v-else class="static" :title="`Version ${active.label}`">
      <span class="prefix">v</span>
      <span class="value">{{ active.label }}</span>
    </span>

    <ul v-if="multiple && isOpen" ref="menu" class="menu" role="listbox" aria-label="Version">
      <li v-for="v in versions" :key="v.version">
        <a
          class="menu-item"
          :class="{ 'is-active': v.version === active.version }"
          role="option"
          :aria-selected="v.version === active.version"
          :href="versionHref(v)"
          target="_self"
          @click="close"
        >
          <span class="menu-label">v{{ v.label }}</span>
          <span v-if="v.current" class="menu-current">current</span>
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useData } from 'vitepress'

export interface VersionEntry {
  version: string
  label: string
  current?: boolean
  /** Optional explicit target; defaults to `/` when current, `/v<version>/` otherwise. */
  link?: string
}

const { theme } = useData()

// The list built into this site is only what was known at build time. An
// archived version never learns of a later one, so when `versionsUrl` is set
// the list is replaced on mount by the one fetched from that URL (a JSON
// array of VersionEntry). Point it at a site-root path: the root is the live
// deployment, so every archived build then shows the current list. The
// built-in list stays when the fetch fails.
const fetched = ref<VersionEntry[] | null>(null)
const versions = computed<VersionEntry[]>(() => fetched.value ?? theme.value.versions ?? [])

// `current` is the latest version and carries the "current" badge.
// `active` is the version this build documents: `themeConfig.version`, or
// the latest version when it is not set. The trigger shows `active`.
const current = computed<VersionEntry>(
  () => versions.value.find((v) => v.current) ?? versions.value[0] ?? { version: '0.0.0', label: '0.0.0' }
)
const active = computed<VersionEntry>(() => {
  const own = theme.value.version as string | undefined
  if (!own) return current.value
  return (
    versions.value.find((v) => v.version === own) ??
    (theme.value.versions ?? []).find((v: VersionEntry) => v.version === own) ??
    { version: own, label: own }
  )
})
const hasAny = computed(() => versions.value.length > 0)
const multiple = computed(() => versions.value.length > 1)

// Version links are absolute from the site root and must NOT go through
// withBase(). Each version is its own deployment with its own base: an
// archived build has base `/v<its version>/`, so withBase() would turn a
// sibling's `/v<other>/` into `/v<its version>/v<other>/` and 404. The
// current version is served at the root, not at `/v<version>/`.
function versionHref(v: VersionEntry): string {
  return v.link ?? (v.current ? '/' : `/v${v.version}/`)
}

const isOpen = ref(false)
const trigger = ref<HTMLElement | null>(null)
const menu = ref<HTMLElement | null>(null)

function toggle() {
  isOpen.value = !isOpen.value
}
function close() {
  isOpen.value = false
}
function onDocClick(e: MouseEvent) {
  if (!isOpen.value) return
  const t = e.target as Node | null
  if (trigger.value?.contains(t)) return
  if (menu.value?.contains(t)) return
  close()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
  const url = theme.value.versionsUrl as string | undefined
  if (!url) return
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    const list = res.ok ? await res.json() : null
    if (Array.isArray(list) && list.length) fetched.value = list
  } catch {
    // Keep the built-in list.
  }
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.ls-nav-version {
  position: relative;
  margin-right: 0.5rem;
  font-size: 13px;
}
.trigger,
.static {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2rem;
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-2);
  background: transparent;
  font-size: inherit;
  line-height: 1.5;
}
.trigger {
  cursor: pointer;
}
.trigger:hover {
  color: var(--vp-c-text-1);
  border-color: var(--vp-c-text-3);
}
.is-open .trigger {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
.prefix {
  font-size: 0.85em;
  color: var(--vp-c-text-3);
}
.value {
  font-weight: 600;
  font-family: var(--vp-font-family-mono);
  font-size: 0.95em;
}
.chevron {
  font-size: 0.7em;
  margin-left: 0.15rem;
  transition: transform 120ms ease-in-out;
}
.is-open .chevron {
  transform: rotate(180deg);
}

.menu {
  position: absolute;
  top: calc(100% + 0.3rem);
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.3rem 0;
  min-width: 160px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 100;
}
.menu li {
  margin: 0;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.35rem 0.8rem;
  color: var(--vp-c-text-1);
  text-decoration: none;
}
.menu-item:hover {
  background: var(--vp-c-bg-soft);
}
.menu-item.is-active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.menu-label {
  flex: 1;
  font-family: var(--vp-font-family-mono);
}
.menu-current {
  font-size: 0.7em;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
