// SPDX-License-Identifier: Apache-2.0
//
// Concept preview: a card with a concept's title and excerpt, shown without
// leaving the page, for any link in page content (`.vp-doc`, or a
// <Concept> badge) whose target is a graph node of a preview type
// (default `schema:DefinedTerm`, i.e. glossary terms). When the site passes
// `bodies` (kb/config/bodies.js), the card's Expand opens a side panel with
// the concept page's full text, which can be pinned open beside the article.
//
// Plain DOM, installed once from `withKb`'s enhanceApp, so it works under any
// layout, including sites that replace the default Layout (and so never
// render its slots). One card element lives in the top layer
// (`popover="manual"`), which no ancestor's overflow or z-index can clip.
//
//   hover (mouse)    card after a short delay; leaving link and card closes it
//   click / Enter    card stays until Esc, the close button or a click outside;
//                    modified clicks (⌘/Ctrl/Shift/Alt, middle) still navigate
//   ≤ 768px wide     the card is a bottom sheet instead of anchored to the link
//   Expand           side panel on the right, over the page (≤ 768px: a sheet
//                    from the bottom, nearly full height); closes on Esc,
//                    its close button or a click (tap) outside
//   Pin (≥ 1200px)   the panel stays open, the page makes room for it
//                    (html.kb-panel-pinned); remembered in localStorage
//
// Inline links it can preview get `data-kb-term` (styled in kb.css), set on
// install and again whenever page content changes (a MutationObserver: the
// router swaps content in place), so a plain markdown link to a glossary
// page is all an author writes.
//
// Positioning is JavaScript, not CSS anchor positioning: `position-anchor`
// needs Chrome/Firefox 151 and Safari 27 (MDN browser-compat-data 8.1.3,
// 2026-09-24), too recent to rely on.

import { inBrowser, withBase } from 'vitepress'
import type { KbNode, ConceptPreviewOptions } from './types'
import { normKey } from './url'

// VitePress's router takes every same-origin link click in a capture listener
// on window (vitepress/dist/client/app/router.js, createRouter) and ignores a
// click already defaultPrevented. Listeners on one target and phase run in
// registration order, so ours must be registered first: at module load, since
// the theme is imported (app/index.js:1) before createApp() creates the router
// (app/index.js:56). installConceptPreview fills in the handler later.
let onLinkClick: ((e: MouseEvent) => void) | null = null
if (inBrowser) window.addEventListener('click', (e) => onLinkClick?.(e), { capture: true })

const HOVER_OPEN_MS = 350
const HOVER_CLOSE_MS = 250
const GAP = 8
const EDGE = 16
const PIN_KEY = 'kb-panel-pinned'

/**
 * @param cleanUrls the site's `cleanUrls` (EnhanceAppContext.siteData): bodies
 *   are rendered at build time with `.html` links, which a clean-URL site
 *   does not use.
 */
export function installConceptPreview(nodes: KbNode[], options: ConceptPreviewOptions = {}, cleanUrls = false): void {
  const types = new Set(options.types ?? ['schema:DefinedTerm'])
  const byUrl = new Map<string, KbNode>()
  for (const n of nodes) if (types.has(n.type)) byUrl.set(normKey(n.url), n)
  if (!byUrl.size) return

  const sheetQuery = matchMedia('(max-width: 768px)')
  const hoverQuery = matchMedia('(hover: hover) and (pointer: fine)')

  const card = document.createElement('div')
  card.className = 'kb-preview'
  card.setAttribute('popover', 'manual')
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-labelledby', 'kb-preview-title')
  card.tabIndex = -1
  card.innerHTML =
    '<button type="button" class="kb-preview-close" aria-label="Close">×</button>' +
    `<div class="kb-preview-kind">${escapeHtml(options.kind ?? 'Concept')}</div>` +
    '<div class="kb-preview-title" id="kb-preview-title"></div>' +
    '<p class="kb-preview-excerpt"></p>' +
    '<div class="kb-preview-actions">' +
    (options.bodies ? '<button type="button" class="kb-preview-expand">Expand</button>' : '') +
    '<a class="kb-preview-open">Open page <span aria-hidden="true">→</span></a>' +
    '</div>'
  document.body.appendChild(card)
  const titleEl = card.querySelector<HTMLElement>('.kb-preview-title')!
  const excerptEl = card.querySelector<HTMLElement>('.kb-preview-excerpt')!
  const openEl = card.querySelector<HTMLAnchorElement>('.kb-preview-open')!
  const panel = options.bodies ? createPanel(options.bodies, escapeHtml(options.kind ?? 'Concept'), cleanUrls) : null

  let trigger: HTMLAnchorElement | null = null
  let cardNode: KbNode | null = null
  let sticky = false
  let pointerY: number | null = null
  let openTimer = 0
  let closeTimer = 0

  function nodeFor(a: HTMLAnchorElement): KbNode | undefined {
    // The glossary index lists every term with its excerpt: there a link means go.
    if (a.closest('.kb-preview, .kb-panel-head, .kb-glossary')) return undefined
    if (!a.closest('.vp-doc') && !a.classList.contains('concept-note')) return undefined
    const href = a.getAttribute('href')
    if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('#')) return undefined
    return byUrl.get(normKey(new URL(href, location.href).pathname))
  }

  function open(a: HTMLAnchorElement, node: KbNode, isSticky: boolean) {
    clearTimeout(openTimer)
    clearTimeout(closeTimer)
    trigger = a
    cardNode = node
    sticky = isSticky
    titleEl.textContent = node.title
    const excerpt = typeof node.meta?.excerpt === 'string' ? node.meta.excerpt : ''
    excerptEl.textContent = excerpt
    excerptEl.hidden = !excerpt
    openEl.href = withBase(node.url)
    card.classList.toggle('is-sheet', sheetQuery.matches)
    if (!card.matches(':popover-open')) card.showPopover()
    place()
    if (sticky) card.focus({ preventScroll: true })
  }

  function close(restoreFocus = false) {
    clearTimeout(openTimer)
    clearTimeout(closeTimer)
    if (card.matches(':popover-open')) card.hidePopover()
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true })
    trigger = null
    cardNode = null
    sticky = false
  }

  function place() {
    if (!trigger) return
    if (!trigger.isConnected) return close()
    if (card.classList.contains('is-sheet')) {
      card.style.top = card.style.left = ''
      return
    }
    const rects = [...trigger.getClientRects()]
    const r =
      (pointerY != null && rects.find((x) => pointerY! >= x.top && pointerY! <= x.bottom)) ||
      rects[0] ||
      trigger.getBoundingClientRect()
    const w = card.offsetWidth
    const h = card.offsetHeight
    // Below if it fits; else above if it fits; else the side with more room,
    // kept inside the viewport (the card scrolls past its max-height).
    const below = innerHeight - EDGE - (r.bottom + GAP)
    const above = r.top - GAP - EDGE
    let top = r.bottom + GAP
    if (h > below && (h <= above || above > below)) top = r.top - GAP - h
    top = Math.min(Math.max(top, EDGE), Math.max(EDGE, innerHeight - EDGE - h))
    const left = Math.min(Math.max(r.left, EDGE), innerWidth - w - EDGE)
    card.style.top = `${Math.round(top)}px`
    card.style.left = `${Math.round(Math.max(left, EDGE))}px`
  }

  let marking = 0
  function markTerms() {
    marking = 0
    for (const a of document.querySelectorAll<HTMLAnchorElement>('.vp-doc a[href]:not([data-kb-term]):not(.concept-note)'))
      if (nodeFor(a)) a.setAttribute('data-kb-term', '')
  }
  markTerms()
  new MutationObserver(() => {
    marking ||= requestAnimationFrame(markTerms)
  }).observe(document.body, { childList: true, subtree: true })

  onLinkClick = (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
    if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    const node = nodeFor(a)
    if (!node) return
    e.preventDefault()
    if (sticky && trigger === a) return close()
    pointerY = e.detail ? e.clientY : null
    open(a, node, true)
  }

  card.addEventListener('click', (e) => {
    const t = e.target as Element
    if (t.closest('.kb-preview-close')) close(true)
    else if (t.closest('.kb-preview-open')) close()
    else if (t.closest('.kb-preview-expand') && panel && cardNode) {
      const [node, from] = [cardNode, trigger]
      close()
      panel.open(node, from)
    }
  })

  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node
    if (panel?.isOpen() && !panel.pinned() && !panel.el.contains(t) && !card.contains(t)) panel.close()
    if (!trigger) return
    // A tap on the sheet's ::backdrop is dispatched to the card itself.
    const r = card.getBoundingClientRect()
    const onBackdrop = t === card && (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right)
    if (onBackdrop || (!card.contains(t) && !trigger.contains(t))) close()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (trigger) close(sticky)
    else if (panel?.isOpen() && (!panel.pinned() || panel.el.contains(document.activeElement))) panel.close()
  })

  document.addEventListener('pointerover', (e) => {
    if (!hoverQuery.matches || e.pointerType !== 'mouse') return
    const t = e.target as Element
    if (card.contains(t) || (trigger && trigger.contains(t))) {
      clearTimeout(closeTimer)
      return
    }
    const a = t.closest?.('a[href]') as HTMLAnchorElement | null
    const node = a && nodeFor(a)
    if (!a || !node || sticky) return
    clearTimeout(openTimer)
    openTimer = window.setTimeout(() => {
      pointerY = e.clientY
      open(a, node, false)
    }, HOVER_OPEN_MS)
  })

  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return
    const t = e.target as Element
    const to = e.relatedTarget as Node | null
    const a = t.closest?.('a[href]')
    if (a && !(to && a.contains(to))) clearTimeout(openTimer)
    if (!trigger || sticky) return
    if (to && (card.contains(to) || trigger.contains(to))) return
    if (card.contains(t) || trigger.contains(t)) {
      clearTimeout(closeTimer)
      closeTimer = window.setTimeout(() => close(), HOVER_CLOSE_MS)
    }
  })

  addEventListener('popstate', () => close())

  const reflow = () => requestAnimationFrame(place)
  addEventListener('scroll', reflow, { passive: true })
  addEventListener('resize', () => {
    card.classList.toggle('is-sheet', sheetQuery.matches)
    reflow()
  })
}

/** The side panel. Not a popover: the card (top layer) must be able to open
 *  over it, for concept links inside the panel's text. */
function createPanel(loadBodies: () => Promise<Record<string, string>>, kind: string, cleanUrls: boolean) {
  const pinQuery = matchMedia('(min-width: 1200px)')
  const el = document.createElement('aside')
  el.className = 'kb-panel'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-labelledby', 'kb-panel-title')
  el.innerHTML =
    '<div class="kb-panel-head">' +
    `<div class="kb-panel-kind">${kind}</div>` +
    '<div class="kb-panel-tools">' +
    '<button type="button" class="kb-panel-pin" aria-pressed="false">Pin</button>' +
    '<a class="kb-panel-open">Open page <span aria-hidden="true">→</span></a>' +
    '<button type="button" class="kb-panel-close" aria-label="Close panel">×</button>' +
    '</div>' +
    '<h2 class="kb-panel-title" id="kb-panel-title" tabindex="-1"></h2>' +
    '</div>' +
    '<div class="kb-panel-body vp-doc"></div>'
  document.body.appendChild(el)
  const titleEl = el.querySelector<HTMLElement>('.kb-panel-title')!
  const bodyEl = el.querySelector<HTMLElement>('.kb-panel-body')!
  const openEl = el.querySelector<HTMLAnchorElement>('.kb-panel-open')!
  const pinEl = el.querySelector<HTMLButtonElement>('.kb-panel-pin')!

  let bodies: Promise<Record<string, string>> | null = null
  let isOpen = false
  let returnTo: HTMLElement | null = null
  let pinned = false
  try {
    pinned = localStorage.getItem(PIN_KEY) === '1'
  } catch {}

  function apply() {
    pinEl.setAttribute('aria-pressed', String(pinned))
    pinEl.textContent = pinned ? 'Unpin' : 'Pin'
    document.documentElement.classList.toggle('kb-panel-pinned', isOpen && pinned && pinQuery.matches)
    el.classList.toggle('is-pinned', pinned && pinQuery.matches)
  }

  async function open(node: KbNode, from: HTMLElement | null) {
    isOpen = true
    returnTo = from
    titleEl.textContent = node.title
    openEl.href = withBase(node.url)
    const excerpt = typeof node.meta?.excerpt === 'string' ? node.meta.excerpt : ''
    bodyEl.innerHTML = '<p class="kb-panel-loading">Loading…</p>'
    el.classList.add('is-open')
    apply()
    titleEl.focus({ preventScroll: true })
    bodyEl.scrollTop = 0
    const key = normKey(node.url)
    let html: string | undefined
    try {
      html = (await (bodies ??= loadBodies()))[key]
    } catch {
      bodies = null
    }
    if (titleEl.textContent !== node.title) return // replaced while loading
    if (html) {
      bodyEl.innerHTML = html
      resolveLinks(bodyEl, node.url, cleanUrls)
    } else {
      bodyEl.innerHTML = excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ''
    }
  }

  function close() {
    if (!isOpen) return
    isOpen = false
    el.classList.remove('is-open')
    apply()
    if (returnTo?.isConnected) returnTo.focus({ preventScroll: true })
    returnTo = null
  }

  el.addEventListener('click', (e) => {
    const t = e.target as Element
    if (t.closest('.kb-panel-close')) close()
    else if (t.closest('.kb-panel-pin')) {
      pinned = !pinned
      try {
        localStorage.setItem(PIN_KEY, pinned ? '1' : '0')
      } catch {}
      apply()
    } else if (t.closest('.kb-panel-open') && !pinned) close()
  })
  pinQuery.addEventListener('change', apply)

  return { el, open, close, isOpen: () => isOpen, pinned: () => pinned && pinQuery.matches }
}

/** Relative links in a concept body are relative to the concept page, not to
 *  the page the panel is shown on; on a clean-URL site they lose `.html`. */
function resolveLinks(root: HTMLElement, pageUrl: string, cleanUrls: boolean) {
  const base = new URL(withBase(pageUrl), location.origin)
  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = a.getAttribute('href')!
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue
    const u = new URL(href, base)
    const path = cleanUrls ? u.pathname.replace(/\.html$/, '') : u.pathname
    a.setAttribute('href', path + u.search + u.hash)
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}
