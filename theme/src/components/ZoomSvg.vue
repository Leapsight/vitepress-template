<!--
  Inline SVG with viewBox-driven zoom and pan.

  Use this instead of <ZoomImg> for vector diagrams. ZoomImg is built on
  medium-zoom, which zooms with `transform: scale()` plus
  `will-change: transform`; that pins the <img> to a compositor layer the
  browser rasterises ONCE at its small in-page size and then upscales, so an
  SVG zoomed that way is blurry no matter how good the source is. Every
  CSS-transform lightbox has the same flaw.

  This component instead fetches the file, inlines it as DOM, and zooms by
  rewriting the <svg> element's own viewBox. That happens inside the SVG
  rendering model — rasterisation occurs AFTER the transform — so the result
  is sharp at any zoom level by construction rather than by browser luck.

  Progressive enhancement: an <img> renders on the server and before hydration,
  and is replaced by the interactive inline SVG once the file loads. If the
  fetch fails the <img> simply stays, so the diagram is never missing.

  The source SVG must carry a viewBox (it is the zoom mechanism). Without one
  the component degrades to the static <img>.
-->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Path to the .svg, e.g. "/assets/diagram.svg". */
    src: string
    /** Accessible description of the diagram. */
    alt?: string
    /** Furthest you can zoom in, as a multiple of the fitted view. */
    maxZoom?: number
  }>(),
  { alt: '', maxZoom: 12 }
)

type Box = { x: number; y: number; w: number; h: number }

const host = ref<HTMLDivElement | null>(null)
const ready = ref(false)
const failed = ref(false)
const zoom = ref(1)

let svg: SVGSVGElement | null = null
let home: Box | null = null
let view: Box | null = null
let dragging = false
let moved = false
let lastX = 0
let lastY = 0

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function apply() {
  if (!svg || !view || !home) return
  // Keep the visible window inside the diagram, so panning can never lose it.
  view.x = clamp(view.x, home.x, home.x + home.w - view.w)
  view.y = clamp(view.y, home.y, home.y + home.h - view.h)
  svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`)
  zoom.value = home.w / view.w
}

/** Zoom by `factor` about a client-space point, keeping that point still. */
function zoomAt(clientX: number, clientY: number, factor: number) {
  if (!svg || !view || !home) return
  const r = svg.getBoundingClientRect()
  if (!r.width || !r.height) return

  const px = clamp((clientX - r.left) / r.width, 0, 1)
  const py = clamp((clientY - r.top) / r.height, 0, 1)
  const ux = view.x + px * view.w
  const uy = view.y + py * view.h

  const minW = home.w / props.maxZoom
  const w = clamp(view.w / factor, minW, home.w)
  const h = w * (home.h / home.w)

  view = { x: ux - px * w, y: uy - py * h, w, h }
  apply()
}

function zoomBy(factor: number) {
  if (!svg) return
  const r = svg.getBoundingClientRect()
  zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor)
}

function reset() {
  if (!home) return
  view = { ...home }
  apply()
}

function onWheel(e: WheelEvent) {
  // Plain wheel must keep scrolling the page — hijacking it is hostile.
  // Zoom is on the modifier, which is also what browsers use for page zoom.
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15)
}

function onPointerDown(e: PointerEvent) {
  if (!svg || !view || !home || view.w >= home.w) return
  dragging = true
  moved = false
  lastX = e.clientX
  lastY = e.clientY
  ;(e.target as Element).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging || !svg || !view) return
  const r = svg.getBoundingClientRect()
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true
  lastX = e.clientX
  lastY = e.clientY
  view.x -= (dx * view.w) / r.width
  view.y -= (dy * view.h) / r.height
  apply()
}

function onPointerUp() {
  dragging = false
}

function onDblClick(e: MouseEvent) {
  if (!view || !home) return
  if (view.w < home.w) reset()
  else zoomAt(e.clientX, e.clientY, 3)
}

function onKey(e: KeyboardEvent) {
  if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(1.3) }
  else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / 1.3) }
  else if (e.key === '0') { e.preventDefault(); reset() }
}

function toggleFullscreen() {
  const el = host.value
  if (!el) return
  if (document.fullscreenElement) document.exitFullscreen()
  else el.requestFullscreen?.()
}

onMounted(async () => {
  try {
    const res = await fetch(props.src)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const text = await res.text()

    const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
    const parsed = doc.documentElement
    if (parsed.nodeName === 'parsererror' || parsed.nodeName !== 'svg') {
      throw new Error('not an SVG document')
    }
    // The file is a site asset, but this component is shared — drop anything
    // executable rather than trusting every future caller.
    parsed.querySelectorAll('script').forEach((n) => n.remove())

    const vb = parsed.getAttribute('viewBox')
    if (!vb) throw new Error('SVG has no viewBox, cannot zoom')
    const [x, y, w, h] = vb.trim().split(/[\s,]+/).map(Number)
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) {
      throw new Error('SVG has an unusable viewBox')
    }

    // Let CSS drive the box; the intrinsic attributes would fight it.
    parsed.removeAttribute('width')
    parsed.removeAttribute('height')
    parsed.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    parsed.setAttribute('role', 'img')
    if (props.alt) parsed.setAttribute('aria-label', props.alt)

    svg = document.importNode(parsed, true) as unknown as SVGSVGElement
    home = { x, y, w, h }
    view = { ...home }

    const slot = host.value?.querySelector('.zoom-svg__canvas')
    if (!slot) throw new Error('mount point missing')
    slot.replaceChildren(svg)
    apply()
    ready.value = true
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  dragging = false
})
</script>

<template>
  <figure class="zoom-svg" ref="host">
    <div
      class="zoom-svg__frame"
      :class="{ 'is-ready': ready, 'is-pannable': zoom > 1 }"
      tabindex="0"
      :aria-label="alt || undefined"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
      @dblclick="onDblClick"
      @keydown="onKey"
    >
      <!-- Server-rendered and pre-hydration; replaced by the inline SVG. -->
      <img v-if="!ready" class="zoom-svg__fallback" :src="src" :alt="alt" />
      <div class="zoom-svg__canvas" />

      <div v-if="ready" class="zoom-svg__controls" role="group" aria-label="Diagram zoom">
        <button type="button" title="Zoom out (−)" @click="zoomBy(1 / 1.3)">−</button>
        <button type="button" title="Zoom in (+)" @click="zoomBy(1.3)">+</button>
        <button type="button" title="Reset (0)" @click="reset">⤢</button>
        <button type="button" title="Fullscreen" @click="toggleFullscreen">⛶</button>
        <a :href="src" target="_blank" rel="noopener" title="Open the .svg in a new tab">↗</a>
      </div>

      <span v-if="ready" class="zoom-svg__zoom" aria-hidden="true">{{ zoom.toFixed(1) }}×</span>
    </div>

    <figcaption v-if="$slots.default"><slot /></figcaption>
    <figcaption v-else-if="ready" class="zoom-svg__hint">
      Scroll-zoom with <kbd>Ctrl</kbd>/<kbd>⌘</kbd>, drag to pan, double-click to zoom in or reset.
    </figcaption>
  </figure>
</template>

<style>
.zoom-svg {
  margin: 2rem 0 2.25rem;
}

.zoom-svg__frame {
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.zoom-svg__frame:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.zoom-svg__frame.is-ready {
  cursor: zoom-in;
}

.zoom-svg__frame.is-pannable {
  cursor: grab;
}

.zoom-svg__frame.is-pannable:active {
  cursor: grabbing;
}

.zoom-svg__fallback,
.zoom-svg__canvas > svg {
  display: block;
  width: 100%;
  height: auto;
}

/* Fullscreen gets the whole viewport, so let the diagram use its height. */
.zoom-svg:fullscreen {
  margin: 0;
  background: #fff;
  display: flex;
  align-items: center;
}

.zoom-svg:fullscreen .zoom-svg__frame {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 0;
}

.zoom-svg:fullscreen .zoom-svg__canvas,
.zoom-svg:fullscreen .zoom-svg__canvas > svg {
  height: 100%;
}

.zoom-svg__controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.zoom-svg__frame:hover .zoom-svg__controls,
.zoom-svg__frame:focus-within .zoom-svg__controls {
  opacity: 1;
}

.zoom-svg__controls button,
.zoom-svg__controls a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  line-height: 1;
  color: var(--vp-c-text-1);
  text-decoration: none;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  cursor: pointer;
}

.zoom-svg__controls button:hover,
.zoom-svg__controls a:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.zoom-svg__zoom {
  position: absolute;
  bottom: 8px;
  right: 10px;
  padding: 1px 6px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
}

.zoom-svg figcaption {
  margin-top: 0.6rem;
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-3);
}

.zoom-svg__hint kbd {
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
}
</style>
