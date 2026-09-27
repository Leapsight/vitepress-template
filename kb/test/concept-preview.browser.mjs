// Browser test for the concept preview (kb/src/preview.ts): card, side
// panel, pin, phone sheet, term marking. Runs against the built blog-starter
// in headless Chrome, driven over the DevTools protocol (no dependencies).
//
//   npm run test:browser        (builds blog-starter first)
//   CHROME=/path/to/chrome node kb/test/concept-preview.browser.mjs
//
// Needs Chrome/Chromium; not part of any default test run. Each check tries
// the case that would break: a click the VitePress router would otherwise
// take, a hover that only passes over, a card near the viewport edge, a
// relative link inside a panel shown on another page.

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const starter = join(root, 'blog-starter')
const PORT = 4311
const CDP = 9431
const BASE = `http://localhost:${PORT}`
const CHROME =
  process.env.CHROME ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)
if (!CHROME) {
  console.error('concept-preview test: no Chrome found; set CHROME=/path/to/chrome')
  process.exit(2)
}
if (!existsSync(join(starter, '.vitepress/dist/index.html'))) {
  console.error('concept-preview test: build blog-starter first (npm run build:blog)')
  process.exit(2)
}

const POST = '/posts/hello-knowledge-graph'
const LINKS_TO_POST = '/posts/typed-edges'
const TERM = '.vp-doc a[data-kb-term][href*="knowledge-graph"]'
const TITLE = 'Knowledge Graph'
const EXCERPT = 'A set of typed nodes'
const BODY = 'there is no second copy to maintain'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'kb-preview-chrome-'))
const server = spawn('npx', ['vitepress', 'preview', '--port', String(PORT)], { cwd: starter, stdio: 'ignore' })
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
// Chrome keeps writing its profile until it has exited.
const cleanup = async () => {
  server.kill()
  const exited = new Promise((r) => chrome.once('exit', r))
  chrome.kill()
  await Promise.race([exited, sleep(5000)])
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}

let failed = 0
const check = (name, ok, info = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && info ? '  ' + info : ''}`)
}

try {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(BASE)
      break
    } catch {
      await sleep(250)
    }
  }
  let targets
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json()
      break
    } catch {
      await sleep(250)
    }
  }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data)
    if (pending.has(d.id)) {
      pending.get(d.id)(d)
      pending.delete(d.id)
    }
  })
  const send = (method, params = {}) =>
    new Promise((r) => {
      pending.set(++id, r)
      ws.send(JSON.stringify({ id, method, params }))
    })
  const js = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? JSON.stringify(r.result.exceptionDetails))
    return r.result.result.value
  }
  const mouse = (type, x, y, extra = {}) =>
    send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1, ...extra })
  const click = async (x, y) => {
    await mouse('mousePressed', x, y)
    await mouse('mouseReleased', x, y)
  }
  const tap = async (x, y) => {
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const esc = () => send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })
  // The first line box, not the bounding box: a link that wraps has its
  // bounding-box centre between its fragments, on the paragraph.
  const at = (sel, scroll = false) =>
    js(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); ${scroll ? "e.scrollIntoView({ block: 'center', behavior: 'instant' });" : ''} const r = e.getClientRects()[0]; return { x: r.left + r.width / 2, y: r.top + r.height / 2, top: r.top } })()`)
  const clickSel = async (sel) => {
    const p = await at(sel)
    await click(p.x, p.y)
  }
  const tapSel = async (sel) => {
    const p = await at(sel)
    await tap(p.x, p.y)
  }
  const card = () =>
    js(`(() => { const c = document.querySelector('.kb-preview'); const r = c.getBoundingClientRect();
      return { open: c.matches(':popover-open'), sheet: c.classList.contains('is-sheet'), title: c.querySelector('.kb-preview-title').textContent,
        excerpt: c.querySelector('.kb-preview-excerpt').textContent, href: c.querySelector('.kb-preview-open').getAttribute('href'),
        top: r.top, left: r.left, right: r.right, bottom: r.bottom, vw: innerWidth, vh: innerHeight, path: location.pathname,
        focusIn: c.contains(document.activeElement) } })()`)
  const panel = () =>
    js(`(() => { const p = document.querySelector('.kb-panel'); const r = p.getBoundingClientRect(); const doc = document.querySelector('.vp-doc').getBoundingClientRect(); const term = document.querySelector(${JSON.stringify(TERM)})?.getBoundingClientRect();
      return { open: p.classList.contains('is-open'), visible: getComputedStyle(p).visibility, title: p.querySelector('.kb-panel-title').textContent,
        body: p.querySelector('.kb-panel-body').textContent, bodyLinks: [...p.querySelectorAll('.kb-panel-body a[href]')].map((a) => a.getAttribute('href')),
        l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight,
        pinnedClass: document.documentElement.classList.contains('kb-panel-pinned'), pinShown: getComputedStyle(p.querySelector('.kb-panel-pin')).display !== 'none',
        pressed: p.querySelector('.kb-panel-pin').getAttribute('aria-pressed'), docRight: doc.right, termRight: term?.right,
        focusTitle: document.activeElement === p.querySelector('.kb-panel-title'), path: location.pathname,
        bodiesFetched: performance.getEntriesByType('resource').some((e) => /kb-bodies\\.data/.test(e.name)) } })()`)

  async function load(path, w, h, mobile = false) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile })
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile })
    await send('Emulation.setEmulatedMedia', { features: mobile ? [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] : [] })
    await send('Page.navigate', { url: BASE + path })
    await sleep(2000)
  }
  await send('Page.enable')

  // ── term marking ──
  await load(POST, 1440, 900)
  await js(`localStorage.removeItem('kb-panel-pinned')`)
  const marks = await js(`(() => { const t = [...document.querySelectorAll('.vp-doc a[data-kb-term]')].map((a) => a.getAttribute('href')); const a = document.querySelector('.vp-doc a[data-kb-term]'); return { t, style: a && getComputedStyle(a).textDecorationStyle } })()`)
  check('only concept links are marked as terms, dotted', marks.t.length === 1 && /knowledge-graph/.test(marks.t[0]) && marks.style === 'dotted', JSON.stringify(marks))

  // ── desktop card: click ──
  let p = await at(TERM, true)
  await click(p.x, p.y)
  await sleep(150)
  let s = await card()
  check('click opens the card, the page stays', s.open && s.path === POST, s.path)
  check('card shows title and excerpt', s.title === TITLE && s.excerpt.startsWith(EXCERPT), s.title)
  check('Open page points at the term', /\/glossary\/knowledge-graph$/.test(s.href), s.href)
  check('card inside the viewport', s.left >= 16 && s.right <= s.vw - 16 && s.top >= 0 && s.bottom <= s.vh, JSON.stringify(s))
  check('focus moves into the card, anchored (not a sheet)', s.focusIn && !s.sheet)
  await esc()
  await sleep(100)
  check('Esc closes it', !(await card()).open)
  check('focus returns to the term', await js(`document.activeElement?.matches(${JSON.stringify(TERM)})`))
  await click(p.x, p.y)
  await sleep(100)
  await click(p.x, p.y)
  await sleep(100)
  check('a second click on the term closes it', !(await card()).open)
  await click(p.x, p.y)
  await sleep(100)
  await click(20, p.y + 200)
  await sleep(100)
  check('a click outside closes it', !(await card()).open)
  const mod = await js(`(() => { const a = document.querySelector(${JSON.stringify(TERM)}); a.addEventListener('click', (e) => e.preventDefault(), { once: true }); a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true })); return document.querySelector('.kb-preview').matches(':popover-open') })()`)
  check('⌘-click does not open the card', !mod)
  const ext = await js(`(() => { const a = document.querySelector('.vp-doc a[href^="http"]'); let prevented; a.addEventListener('click', (e) => { prevented = e.defaultPrevented; e.preventDefault() }, { once: true }); a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })); return { prevented, open: document.querySelector('.kb-preview').matches(':popover-open') } })()`)
  check('an external link is left alone', !ext.prevented && !ext.open, JSON.stringify(ext))

  // ── hover ──
  await mouse('mouseMoved', 5, 5)
  await sleep(100)
  await mouse('mouseMoved', p.x, p.y)
  await sleep(150)
  check('hover: not open before the delay', !(await card()).open)
  await sleep(400)
  s = await card()
  check('hover: open after the delay', s.open)
  await mouse('mouseMoved', (s.left + s.right) / 2, (s.top + s.bottom) / 2)
  await sleep(400)
  check('hover: moving into the card keeps it open', (await card()).open)
  await mouse('mouseMoved', 5, 5)
  await sleep(400)
  check('hover: leaving closes it', !(await card()).open)
  await mouse('mouseMoved', p.x, p.y)
  await sleep(100)
  await mouse('mouseMoved', 5, 5)
  await sleep(500)
  check('hover: a brief pass does not open it', !(await card()).open)

  // ── an internal non-term link still navigates through the router ──
  const other = await at('.vp-doc a[href="/graph"]', true)
  await click(other.x, other.y)
  await sleep(800)
  check('an internal non-term link navigates', (await js('location.pathname')) === '/graph')

  // ── "Open page" navigates and closes ──
  await load(POST, 1440, 900)
  p = await at(TERM, true)
  await click(p.x, p.y)
  await sleep(150)
  await clickSel('.kb-preview-open')
  await sleep(800)
  s = await card()
  check('Open page navigates to the term, card closed', /\/glossary\/knowledge-graph$/.test(s.path) && !s.open, s.path)

  // ── near the bottom: card flips above (a short viewport puts the term
  // near its bottom edge, whatever the page length) ──
  await load(POST, 1000, 700)
  p = await at(TERM, true)
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: Math.round(p.top) + 60, deviceScaleFactor: 1, mobile: false })
  await sleep(200)
  p = await at(TERM)
  await click(p.x, p.y)
  await sleep(150)
  s = await card()
  check('near the bottom the card goes above the link, inside the viewport', s.open && s.top < p.top && s.top >= 16 && s.bottom <= s.vh - 16, JSON.stringify([s.top, s.bottom, p.top, s.vh]))
  await esc()

  // ── panel ──
  await load(POST, 1440, 900)
  check('bodies not fetched before Expand', !(await panel()).bodiesFetched)
  p = await at(TERM, true)
  await click(p.x, p.y)
  await sleep(150)
  await clickSel('.kb-preview-expand')
  await sleep(600)
  let ps = await panel()
  check('Expand opens the panel, closes the card', ps.open && ps.visible === 'visible' && !(await card()).open)
  check('panel shows the full body, loaded on demand', ps.title === TITLE && ps.body.includes(BODY) && ps.bodiesFetched, ps.body.slice(0, 80))
  check('relative links in the body resolve against the term page, clean', JSON.stringify(ps.bodyLinks) === '["/glossary/typed-edge"]', JSON.stringify(ps.bodyLinks))
  check('the body drops the page h1 (the panel has the title)', !(await js(`!!document.querySelector('.kb-panel-body h1')`)))
  check('page unchanged, focus on the panel title, no reflow', ps.path === POST && ps.focusTitle && !ps.pinnedClass)
  await esc()
  await sleep(300)
  ps = await panel()
  check('Esc closes the panel, focus back on the term', !ps.open && ps.visible === 'hidden' && (await js(`document.activeElement?.matches(${JSON.stringify(TERM)})`)))
  await click(p.x, p.y)
  await sleep(150)
  await clickSel('.kb-preview-expand')
  await sleep(400)
  await click(20, 600)
  await sleep(300)
  check('a click outside closes the unpinned panel', !(await panel()).open)

  // a term inside the panel opens its own card; Expand replaces the panel
  await click(p.x, p.y)
  await sleep(150)
  await clickSel('.kb-preview-expand')
  await sleep(400)
  await clickSel('.kb-panel-body a[data-kb-term]')
  await sleep(150)
  s = await card()
  check('a term inside the panel opens its card', s.open && s.title === 'Typed Edge', s.title)
  await clickSel('.kb-preview-expand')
  await sleep(400)
  check('its Expand replaces the panel content', (await panel()).title === 'Typed Edge')
  await clickSel('.kb-panel-close')
  await sleep(300)

  // pin
  await click(p.x, p.y)
  await sleep(150)
  await clickSel('.kb-preview-expand')
  await sleep(400)
  await clickSel('.kb-panel-pin')
  await sleep(400)
  ps = await panel()
  check('Pin: the page makes room beside the panel', ps.pinnedClass && ps.pressed === 'true' && ps.docRight <= ps.l && ps.termRight <= ps.l, JSON.stringify([ps.docRight, ps.termRight, ps.l]))
  await click(20, 600)
  await sleep(300)
  check('pinned panel survives a click on the page', (await panel()).open)
  await load(POST, 1440, 900)
  p = await at(TERM, true)
  await click(p.x, p.y)
  await sleep(150)
  await clickSel('.kb-preview-expand')
  await sleep(400)
  ps = await panel()
  check('pin is remembered after reload', ps.open && ps.pinnedClass && ps.pressed === 'true')
  await clickSel('.kb-panel-pin')
  await sleep(300)
  ps = await panel()
  check('Unpin removes the reflow', ps.open && !ps.pinnedClass && ps.pressed === 'false')
  await clickSel('.kb-panel-close')
  await sleep(300)
  check('close button closes the panel', !(await panel()).open)

  // 1000px: overlay only, even with a remembered pin
  await js(`localStorage.setItem('kb-panel-pinned', '1')`)
  await load(POST, 1000, 800)
  p = await at(TERM, true)
  await click(p.x, p.y)
  await sleep(150)
  await clickSel('.kb-preview-expand')
  await sleep(400)
  ps = await panel()
  check('1000px: panel without Pin or reflow', ps.open && !ps.pinShown && !ps.pinnedClass)
  await esc()
  await js(`localStorage.removeItem('kb-panel-pinned')`)

  // ── phone ──
  await load(POST, 390, 844, true)
  p = await at(TERM, true)
  await tap(p.x, p.y)
  await sleep(200)
  s = await card()
  check('phone: tap opens a bottom sheet, page stays', s.open && s.sheet && s.path === POST)
  check('phone: sheet spans the bottom', s.left === 0 && Math.round(s.right) === s.vw && Math.round(s.bottom) === s.vh, JSON.stringify(s))
  await tap(195, 20)
  await sleep(150)
  check('phone: tap above the sheet closes it', !(await card()).open)
  await tap(p.x, p.y)
  await sleep(200)
  await tapSel('.kb-preview-close')
  await sleep(150)
  check('phone: close button closes the sheet', !(await card()).open)
  await tap(p.x, p.y)
  await sleep(200)
  await tapSel('.kb-preview-expand')
  await sleep(600)
  ps = await panel()
  check('phone: Expand opens a near-full-height sheet', ps.open && ps.l === 0 && Math.round(ps.r) === ps.vw && Math.round(ps.b) === ps.vh && ps.t > 0 && ps.t <= 64, JSON.stringify(ps))
  check('phone: full body, no Pin', ps.body.includes(BODY) && !ps.pinShown)
  await tap(195, 20)
  await sleep(400)
  check('phone: tap above the sheet closes the panel', !(await panel()).open)

  // ── tablet portrait ──
  await load(POST, 820, 1180, true)
  p = await at(TERM, true)
  await tap(p.x, p.y)
  await sleep(200)
  check('tablet: anchored card', (await card()).open && !(await card()).sheet)
  await tapSel('.kb-preview-expand')
  await sleep(500)
  ps = await panel()
  check('tablet: side panel on the right, no Pin', ps.open && Math.round(ps.r) === ps.vw && ps.l > 0 && !ps.pinShown, JSON.stringify(ps))

  // ── client-side navigation marks the new page's terms ──
  await load(LINKS_TO_POST, 1440, 900)
  await js(`(async () => { document.querySelector('.vp-doc a[href*="hello-knowledge-graph"]').click(); await new Promise((r) => setTimeout(r, 1500)) })()`)
  const after = await js(`({ path: location.pathname, marked: document.querySelectorAll(${JSON.stringify(TERM)}).length })`)
  check('after in-app navigation the term is marked', after.path === POST && after.marked === 1, JSON.stringify(after))

  // ── glossary index: links there navigate ──
  await load('/glossary/', 1440, 900)
  const gl = await js(`({ marked: document.querySelectorAll('.kb-glossary a[data-kb-term]').length, links: document.querySelectorAll('.kb-glossary a[href]').length })`)
  check('glossary index links are not previews', gl.links > 0 && gl.marked === 0, JSON.stringify(gl))
  await js(`document.querySelector('.kb-glossary a[href*="knowledge-graph"]').click()`)
  await sleep(1000)
  check('glossary index link navigates', /knowledge-graph$/.test(await js('location.pathname')))

  ws.close()
} catch (e) {
  failed++
  console.log('FAIL (exception)', e.message)
} finally {
  await cleanup()
}
console.log(failed ? `${failed} failed` : 'all passed')
process.exit(failed ? 1 : 0)
