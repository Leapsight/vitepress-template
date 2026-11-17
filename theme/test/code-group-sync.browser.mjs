// Browser test for named code groups (theme/src/lib/code-group-sync.ts).
// Runs against the built starter in headless Chrome, driven over the
// DevTools protocol (no dependencies).
//
//   npm run test:browser:theme     (builds the starter first)
//   CHROME=/path/to/chrome node theme/test/code-group-sync.browser.mjs
//   DEV=1 node theme/test/code-group-sync.browser.mjs     (against vitepress dev)
//
// Needs Chrome/Chromium; not part of any default test run. Each check tries
// the case that would break: a group that lacks the chosen tab, an unnamed
// group with the same labels, a second name, a keyboard choice, a page
// reached by in-app navigation, a browser that refuses storage.
// Not covered: browsers other than Chrome.

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const starter = join(root, 'starter')
const PORT = 4312
const CDP = 9432
const BASE = `http://localhost:${PORT}`
const CHROME =
  process.env.CHROME ??
  ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)
if (!CHROME) {
  console.error('code-group-sync test: no Chrome found; set CHROME=/path/to/chrome')
  process.exit(2)
}
if (!existsSync(join(starter, '.vitepress/dist/index.html'))) {
  console.error('code-group-sync test: build the starter first (npm run build)')
  process.exit(2)
}

const PAGE = '/guide/basics/code-groups'
const OTHER = '/guide/basics/components'
const KEY = 'ls-code-group.lang'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'code-group-chrome-'))
// DEV=1 runs the same checks against `vitepress dev`, which serves pages
// without pre-rendered HTML: the before-scripts part does not apply there.
const DEV = process.env.DEV === '1'
const server = spawn('npx', ['vitepress', DEV ? 'dev' : 'preview', '--port', String(PORT)], { cwd: starter, stdio: 'ignore' })
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
const same = (name, actual, expected) => check(name, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`)

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
  const consoleErrors = []
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data)
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) {
      consoleErrors.push(d.params.args.map((a) => a.value ?? a.description ?? '').join(' '))
    }
    if (d.method === 'Runtime.exceptionThrown') consoleErrors.push((d.params.exceptionDetails.exception?.description ?? 'exception') + ' @ ' + JSON.stringify((d.params.exceptionDetails.stackTrace?.callFrames ?? []).slice(0, 3).map((f) => f.url.split('/').pop() + ':' + f.lineNumber + ' ' + f.functionName)))
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
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false })
  const load = async (path) => {
    await send('Page.navigate', { url: BASE + path })
    // Hydrated: the layout's back-to-top button only exists once Vue has mounted.
    for (let i = 0; i < 40; i++) {
      await sleep(250)
      if (await js(`document.readyState === 'complete' && !!document.querySelector('.vp-code-group') && !!document.querySelector('#app')?.__vue_app__`)) break
    }
    await sleep(300)
  }

  // After an in-app navigation: wait for the page, not for a fixed time
  // (`vitepress dev` compiles a page when it is first asked for).
  const arrive = async (path) => {
    for (let i = 0; i < 60; i++) {
      await sleep(250)
      if (await js(`location.pathname === ${JSON.stringify(path)} && !!document.querySelector('.vp-doc .vp-code-group')`)) break
    }
    await sleep(300)
  }

  // What each code group in the page shows, in document order: its name
  // ('' when unnamed), the checked tab's label, and the visible block's
  // language. `ok` is false if the group is not on exactly one tab and
  // block, or the two are at different indexes.
  const groups = () =>
    js(`[...document.querySelectorAll('.vp-doc .vp-code-group')].map((g) => {
      const inputs = [...g.querySelectorAll(':scope > .tabs > input')]
      const labels = [...g.querySelectorAll(':scope > .tabs > label')]
      const blocks = [...g.querySelector(':scope > .blocks').children]
      const checked = inputs.map((x, i) => (x.checked ? i : -1)).filter((i) => i >= 0)
      const active = blocks.map((b, i) => (b.classList.contains('active') ? i : -1)).filter((i) => i >= 0)
      const shown = blocks.map((b, i) => (getComputedStyle(b).display !== 'none' ? i : -1)).filter((i) => i >= 0)
      const one = checked.length === 1 && active.length === 1 && shown.length === 1 && checked[0] === active[0] && active[0] === shown[0]
      return (g.getAttribute('data-ls-sync') ?? '') + ':' + (one ? labels[checked[0]].dataset.title : 'BROKEN ' + JSON.stringify({ checked, active, shown }))
    })`)
  // A real mouse click on the tab with this label in the n-th group.
  const pick = async (n, title) => {
    const p = await js(`(() => { const l = [...document.querySelectorAll('.vp-doc .vp-code-group')][${n}].querySelector('label[data-title="${title}"]'); l.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = l.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })()`)
    for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 })
    await sleep(150)
  }
  const stored = (key = KEY) => js(`localStorage.getItem(${JSON.stringify(key)})`)
  // Only this feature's keys: VitePress keeps its own (the appearance switch).
  const storedCount = () => js(`Object.keys(localStorage).filter((k) => k.startsWith('ls-code-group.')).length`)

  // Page order: lang, lang(+Rust), lang(JavaScript only), unnamed, tool.
  const FIRST = ['lang:JavaScript', 'lang:JavaScript', 'lang:JavaScript', ':JavaScript', 'tool:npm']

  // ── first visit ──
  await load(PAGE)
  same('first visit: every group on its first tab', await groups(), FIRST)
  same('first visit: nothing stored', await storedCount(), 0)

  // ── choosing a tab ──
  await pick(0, 'Erlang')
  same('pick Erlang: same-name groups follow; no-Erlang, unnamed and other-name groups do not', await groups(), ['lang:Erlang', 'lang:Erlang', 'lang:JavaScript', ':JavaScript', 'tool:npm'])
  same('pick Erlang: stored under the name', [await stored(), await storedCount()], ['erlang', 1])

  await pick(3, 'Erlang')
  await pick(3, 'JavaScript')
  same('picking in an unnamed group moves and stores nothing', [await groups(), await stored(), await storedCount()], [['lang:Erlang', 'lang:Erlang', 'lang:JavaScript', ':JavaScript', 'tool:npm'], 'erlang', 1])

  await pick(4, 'pnpm')
  same('a second name is its own choice', [await groups(), await stored(), await stored('ls-code-group.tool')], [['lang:Erlang', 'lang:Erlang', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'], 'erlang', 'pnpm'])

  await pick(1, 'Rust')
  same('pick a tab the first group lacks: it keeps what it shows', await groups(), ['lang:Erlang', 'lang:Rust', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'])
  await load(PAGE)
  same('reload with that choice: groups without it are on their first tab', await groups(), ['lang:JavaScript', 'lang:Rust', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'])

  // ── keyboard ──
  await js(`document.querySelectorAll('.vp-doc .vp-code-group')[1].querySelector('input:checked').focus()`)
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', windowsVirtualKeyCode: 37 })
  await sleep(150)
  same('arrow key from Rust to Erlang moves the other groups too', [await groups(), await stored()], [['lang:Erlang', 'lang:Erlang', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'], 'erlang'])

  // ── the choice outlives the page ──
  await load(PAGE)
  same('full reload: the stored choice is shown', await groups(), ['lang:Erlang', 'lang:Erlang', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'])
  await js(`document.querySelector('.vp-doc a[href*="components"]').click()`)
  await arrive(OTHER)
  same('in-app navigation: the next page shows the choice', [await js('location.pathname'), await groups()], [OTHER, ['lang:Erlang']])
  await pick(0, 'JavaScript')
  await js('history.back()')
  await arrive(PAGE)
  same('back: the page left earlier shows the choice made since', [await js('location.pathname'), await groups()], [PAGE, ['lang:JavaScript', 'lang:JavaScript', 'lang:JavaScript', ':JavaScript', 'tool:pnpm']])
  await load(OTHER)
  same('direct load of another page shows the choice', await groups(), ['lang:JavaScript'])

  // ── the clicked tab stays under the pointer ──
  // The first group's Erlang block is many lines taller than its JavaScript
  // one, and sits above the second group. Both cases: the first group fully
  // above the viewport, and partly in it.
  for (const [where, block] of [['above the viewport', 'start'], ['partly in view', 'center']]) {
    await js(`localStorage.setItem(${JSON.stringify(KEY)}, 'javascript')`)
    await load(PAGE)
    const moved = await js(`(async () => {
      const gs = document.querySelectorAll('.vp-doc .vp-code-group')
      const grew = gs[0].getBoundingClientRect().height
      const label = gs[1].querySelector('label[data-title="Erlang"]')
      label.scrollIntoView({ block: '${block}', behavior: 'instant' })
      const before = label.getBoundingClientRect().top
      label.click()
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      return { by: Math.round(label.getBoundingClientRect().top - before), grew: Math.round(gs[0].getBoundingClientRect().height - grew), firstTop: Math.round(gs[0].getBoundingClientRect().top) }
    })()`)
    check(`clicked tab does not move when a taller block opens above it (${where})`, moved.grew > 100 && moved.by === 0, JSON.stringify(moved))
  }

  // ── a choice carried by the link ──
  const address = () => js('location.pathname + location.search + location.hash')
  await js(`localStorage.setItem(${JSON.stringify(KEY)}, 'erlang')`)
  await load(PAGE + '?lang=RUST')
  same('link choice comes first, per group; a group without it shows the stored one; nothing is stored', [await groups(), await stored()], [['lang:Erlang', 'lang:Rust', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'], 'erlang'])
  await load(PAGE + '?lang=cobol')
  same('a link value no group has falls through to the stored choice', await groups(), ['lang:Erlang', 'lang:Erlang', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'])
  await load(PAGE + '?x=1&lang=javascript&tool=npm#how-it-behaves')
  same('two names in one link, against two stored choices', await groups(), ['lang:JavaScript', 'lang:JavaScript', 'lang:JavaScript', ':JavaScript', 'tool:npm'])
  await pick(1, 'Rust')
  same('picking on a linked page rewrites that parameter only, and stores the pick', [await address(), await stored(), await stored('ls-code-group.tool')], [PAGE + '?x=1&lang=rust&tool=npm#how-it-behaves', 'rust', 'pnpm'])
  await pick(3, 'Erlang')
  same('picking in an unnamed group leaves the address alone', await address(), PAGE + '?x=1&lang=rust&tool=npm#how-it-behaves')
  await js(`document.querySelector('.vp-doc a[href*="components"]').click()`)
  await arrive(OTHER)
  same('in-app navigation drops the link choice; the stored one shows', [await js('location.pathname + location.search'), await groups()], [OTHER, ['lang:JavaScript']])
  await load(PAGE)
  await pick(0, 'Erlang')
  same('a page opened without the parameter never gains one', await address(), PAGE)

  // ── before the page's scripts run ──
  // With every script file blocked Vue never starts, so only the inline
  // <head> script can have set the tabs: this is the state of the first
  // paint. (Not covered: that it is set while the HTML is still arriving,
  // which depends on mutation records being delivered before rendering.)
  const loadWithoutScripts = async (path) => {
    await send('Network.setBlockedURLs', { urls: ['*.js'] })
    await send('Page.navigate', { url: BASE + path })
    for (let i = 0; i < 40; i++) {
      await sleep(250)
      if (await js(`document.readyState === 'complete' && !!document.querySelector('.vp-code-group')`)) break
    }
    const state = { groups: await groups(), started: await js(`!!document.querySelector('#app')?.__vue_app__`) }
    await send('Network.setBlockedURLs', { urls: [] })
    return state
  }
  await load(PAGE)
  await pick(0, 'Erlang')
  await pick(4, 'pnpm')
  if (!DEV) same('before scripts run: the stored choice is already shown', await loadWithoutScripts(PAGE), { groups: ['lang:Erlang', 'lang:Erlang', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'], started: false })
  if (!DEV) same('before scripts run: the link choice is already shown, then the stored one', await loadWithoutScripts(PAGE + '?lang=rust'), { groups: ['lang:Erlang', 'lang:Rust', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'], started: false })
  await js(`localStorage.removeItem(${JSON.stringify(KEY)}); localStorage.removeItem('ls-code-group.tool')`)
  if (!DEV) same('before scripts run: no choice, every group on its first tab', await loadWithoutScripts(PAGE), { groups: FIRST, started: false })
  await js(`localStorage.setItem(${JSON.stringify(KEY)}, 'erlang'); localStorage.setItem('ls-code-group.tool', 'pnpm')`)
  consoleErrors.length = 0
  await load(PAGE)
  same('Vue starts on the page the head script changed without complaint, and keeps it', [await groups(), consoleErrors], [['lang:Erlang', 'lang:Erlang', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'], []])
  await pick(1, 'JavaScript')
  same('and picking still works there', await groups(), ['lang:JavaScript', 'lang:JavaScript', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'])

  // ── a stored value no group has ──
  await js(`localStorage.setItem(${JSON.stringify(KEY)}, 'cobol')`)
  await load(PAGE)
  same('a stored value no group has leaves every group on its first tab', await groups(), ['lang:JavaScript', 'lang:JavaScript', 'lang:JavaScript', ':JavaScript', 'tool:pnpm'])

  same('no console errors or warnings up to here', consoleErrors, [])

  // ── storage refused ──
  // VitePress's own inline appearance script throws here (it reads
  // localStorage unguarded), so the console is not checked in this part.
  const { result: denied } = await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError') } })`
  })
  await load(PAGE)
  same('storage refused: page renders, groups on their first tab', await groups(), FIRST)
  await pick(0, 'Erlang')
  same('storage refused: groups on the page still follow', await groups(), ['lang:Erlang', 'lang:Erlang', 'lang:JavaScript', ':JavaScript', 'tool:npm'])
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: denied.identifier })

  ws.close()
} catch (e) {
  failed++
  console.log('FAIL (exception)', e.message)
} finally {
  await cleanup()
}
console.log(failed ? `${failed} failed` : 'all passed')
process.exit(failed ? 1 : 0)
