// The page outline ("On this page") for layouts that render markdown outside
// VitePress's own doc layout, such as a blog article.
//
// VitePress's outline cannot be reused there: its header collection is
// hard-wired to `.VPDoc :where(h1,…,h6)` and its components are internal.
// This follows the same rules — `outline` from frontmatter, then
// `themeConfig.outline` (a level, a [high, low] range, 'deep' or false;
// default 2), its `label`, and `outlineTitle` — but reads the headings from
// a container the layout names.
import { onContentUpdated, getScrollOffset, useData } from 'vitepress'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

export interface OutlineItem {
  title: string
  link: string
  level: number
  children: OutlineItem[]
}

type OutlineRange = number | [number, number] | 'deep' | false
type OutlineConfig = OutlineRange | { level?: OutlineRange; label?: string }

const IGNORE = /\b(?:VPBadge|header-anchor|footnote-ref|ignore-header)\b/

/** The outline's heading text, as VitePress resolves it. */
export function useOutlineTitle() {
  const { theme } = useData()
  return computed(() => {
    const o = theme.value.outline
    return (
      (o && typeof o === 'object' && !Array.isArray(o) && o.label) ||
      theme.value.outlineTitle ||
      'On this page'
    )
  })
}

function headingText(h: Element): string {
  let text = ''
  for (const node of h.childNodes) {
    if (node.nodeType === 1) {
      if (IGNORE.test((node as Element).className)) continue
      text += node.textContent
    } else if (node.nodeType === 3) {
      text += node.textContent
    }
  }
  return text.trim()
}

function levels(config: OutlineConfig | undefined): [number, number] | null {
  const range = config && typeof config === 'object' && !Array.isArray(config) ? config.level : config
  if (range === false) return null
  const r = range ?? 2
  if (typeof r === 'number') return [r, r]
  if (r === 'deep') return [2, 6]
  return r
}

/** Headings under `root` within the configured levels, nested by level. */
export function collectOutline(root: ParentNode, config: OutlineConfig | undefined): OutlineItem[] {
  const range = levels(config)
  if (!range) return []
  const [high, low] = range
  const out: OutlineItem[] = []
  const stack: OutlineItem[] = []
  for (const el of root.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    const level = Number(el.tagName[1])
    if (!el.id || !el.hasChildNodes() || level < high || level > low) continue
    const item: OutlineItem = { title: headingText(el), link: '#' + el.id, level, children: [] }
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop()
    ;(stack.length ? stack[stack.length - 1].children : out).push(item)
    stack.push(item)
  }
  return out
}

/**
 * The outline of the markdown rendered inside `container` (a selector).
 * Collected on mount as well as on VitePress's content updates: a component
 * set up after <Content> registers its update callback too late for the
 * first render, so mount is what covers a layout that places it there.
 */
export function usePageOutline(container: string) {
  const { frontmatter, theme } = useData()
  const headers = shallowRef<OutlineItem[]>([])
  const refresh = () => {
    const root = document.querySelector(container)
    headers.value = root ? collectOutline(root, frontmatter.value.outline ?? theme.value.outline) : []
  }
  onMounted(refresh)
  onContentUpdated(refresh)
  return headers
}

function flatten(items: OutlineItem[]): OutlineItem[] {
  return items.flatMap((i) => [i, ...flatten(i.children)])
}

/**
 * The link of the section being read: the last heading whose top has passed
 * the scroll offset VitePress applies to anchor jumps (`getScrollOffset`),
 * none at the very top of the page, and the last one at the very bottom —
 * the same rule as VitePress's own outline.
 */
export function useActiveHeading(headers: { value: OutlineItem[] }) {
  const active = ref<string | null>(null)
  let frame = 0
  function update() {
    frame = 0
    const items = flatten(headers.value)
      .map((h) => ({ link: h.link, el: document.getElementById(decodeURIComponent(h.link.slice(1))) }))
      .filter((h): h is { link: string; el: HTMLElement } => !!h.el)
      .map((h) => ({ link: h.link, top: h.el.getBoundingClientRect().top + window.scrollY }))
      .sort((a, b) => a.top - b.top)
    const y = window.scrollY
    if (!items.length || y < 1) {
      active.value = null
      return
    }
    if (Math.abs(y + window.innerHeight - document.body.offsetHeight) < 1) {
      active.value = items[items.length - 1].link
      return
    }
    let link: string | null = null
    for (const h of items) {
      if (h.top > y + getScrollOffset() + 4) break
      link = h.link
    }
    active.value = link
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }
  onMounted(() => {
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
  })
  onContentUpdated(schedule)
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', schedule)
    window.removeEventListener('resize', schedule)
    if (frame) cancelAnimationFrame(frame)
  })
  return { active, update: schedule }
}
