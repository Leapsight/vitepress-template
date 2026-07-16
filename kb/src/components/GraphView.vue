<!--
SPDX-License-Identifier: Apache-2.0

Interactive force-directed view of the KB graph (graphology + sigma), loaded
client-side only. Nodes are colored by `@type` (via KB UI config); clicking a
node navigates to its page. Use in markdown: <GraphView :height="520" />

Requires the optional `graphology`, `graphology-layout-forceatlas2` and
`sigma` peers; renders a graceful placeholder if they're absent.
-->
<template>
  <ClientOnly>
    <div class="kb-graph" :style="{ height: typeof height === 'number' ? height + 'px' : height }">
      <div ref="container" class="kb-graph-canvas"></div>
      <p v-if="error" class="kb-graph-error">{{ error }}</p>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter, withBase } from 'vitepress'
import { useKbData, useKbUi } from '../composables'
import { localType } from '../../lib/select.js'

const props = withDefaults(
  defineProps<{
    height?: number | string
    /** Include generic (untyped) nodes. Default false. */
    includeGeneric?: boolean
    /** Only show nodes of these `@type` local names (e.g. ['BlogPosting']). */
    types?: string[]
  }>(),
  { height: 520, includeGeneric: false, types: undefined }
)

const data = useKbData()
const ui = useKbUi()
const router = useRouter()

const container = ref<HTMLElement | null>(null)
const error = ref('')
let cleanup: (() => void) | null = null

const DEFAULT_COLORS = ['#3e5c76', '#0891b2', '#b8860b', '#2a7020', '#8a4fbe', '#c04030']

onMounted(async () => {
  if (!container.value) return
  try {
    const [{ default: Graph }, { default: forceAtlas2 }, { default: Sigma }] = await Promise.all([
      import('graphology'),
      import('graphology-layout-forceatlas2'),
      import('sigma')
    ])

    const typeColors = ui.typeColors ?? {}
    const colorFor = (() => {
      const seen = new Map<string, string>()
      let i = 0
      return (type: string) => {
        const key = localType(type)
        if (typeColors[key]) return typeColors[key]
        if (!seen.has(key)) seen.set(key, DEFAULT_COLORS[i++ % DEFAULT_COLORS.length])
        return seen.get(key)!
      }
    })()

    const nodes = data.graph.nodes.filter((n) => {
      if (!props.includeGeneric && n.generic) return false
      if (props.types && !props.types.map((t) => t.toLowerCase()).includes(localType(n.type).toLowerCase()))
        return false
      return true
    })
    const keep = new Set(nodes.map((n) => n.id))

    const g = new Graph()
    for (const n of nodes) {
      g.addNode(n.id, {
        label: n.title,
        size: 6,
        color: colorFor(n.type),
        x: Math.cos(g.order),
        y: Math.sin(g.order),
        url: n.url
      })
    }
    for (const e of data.graph.edges) {
      if (!keep.has(e.from) || !keep.has(e.to)) continue
      if (g.hasEdge(e.from, e.to)) continue
      try {
        g.addEdge(e.from, e.to, { size: 0.6, color: 'rgba(140,140,140,0.35)' })
      } catch {
        /* ignore parallel/self edges */
      }
    }

    if (!g.order) {
      error.value = 'No graph nodes to display.'
      return
    }

    forceAtlas2.assign(g, { iterations: 200, settings: forceAtlas2.inferSettings(g) })
    const renderer = new Sigma(g, container.value, { renderLabels: true })

    renderer.on('clickNode', ({ node }: { node: string }) => {
      const url = g.getNodeAttribute(node, 'url') as string
      if (url) router.go(withBase(url))
    })

    cleanup = () => renderer.kill()
  } catch (err) {
    error.value = 'Graph view needs the optional graphology + sigma packages.'
    // eslint-disable-next-line no-console
    console.warn('[KB] GraphView:', (err as Error).message)
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<style scoped>
.kb-graph {
  position: relative;
  width: 100%;
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}
.kb-graph-canvas {
  position: absolute;
  inset: 0;
}
.kb-graph-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 1rem;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}
</style>
