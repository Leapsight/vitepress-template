// node --test theme/config/markdown.test.js
//
// Runs the config kit inside VitePress's real markdown renderer (the
// installed version), so it also checks the two VitePress behaviours
// registerCodeGroupSync depends on: the kit runs after the built-in
// code-group container exists, and the group's root markup is the one it
// marks. Not covered: anything in the browser.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMarkdownRenderer, disposeMdItInstance } from 'vitepress'
import { withThemeDefaults } from './index.js'

// VitePress keeps one renderer and hands it back whatever options a later
// call passes, so each renderer here is built after disposing the last one.
const fresh = (options) => {
  disposeMdItInstance()
  return createMarkdownRenderer(process.cwd(), options)
}
const renderer = (userMarkdown) => fresh(withThemeDefaults({ markdown: userMarkdown }).markdown)

const group = (info) =>
  [`::: code-group${info}`, '', '```js [JavaScript]', 'a()', '```', '', '```erlang [Erlang]', 'a().', '```', '', ':::', ''].join('\n')

test('a named code group carries its name, and keeps VitePress\'s tabs', async () => {
  const html = (await renderer()).render(group(' sdk'))
  assert.match(html, /^<div data-ls-sync="sdk" class="vp-code-group/)
  assert.equal(html.match(/data-ls-sync/g).length, 1)
  assert.match(html, /<label data-title="JavaScript"/)
  assert.match(html, /<label data-title="Erlang"/)
  assert.match(html, /<input type="radio"[^>]* checked><label data-title="JavaScript"/)
})

test('an unnamed code group is byte-for-byte what VitePress renders', async () => {
  // Tab ids are random per render, so compare with them masked.
  const mask = (s) => s.replace(/(group|tab)-[\w-]+/g, '$1-X')
  const expected = mask((await fresh({})).render(group('')))
  const html = (await renderer()).render(group(''))
  assert.equal(mask(html), expected)
  assert.doesNotMatch(html, /data-ls-sync/)
})

test('only the named group is marked when both are on a page', async () => {
  const html = (await renderer()).render(group('') + '\n' + group(' sdk'))
  assert.equal(html.match(/data-ls-sync="sdk"/g).length, 1)
  assert.equal(html.match(/class="vp-code-group/g).length, 2)
  assert.ok(html.indexOf('data-ls-sync') > html.indexOf('vp-code-group'))
})

test('a name that cannot be a URL parameter fails the build', async () => {
  const md = await renderer()
  for (const bad of [' SDK', ' my sdk', ' 1st', ' sdk"x']) {
    assert.throws(() => md.render(group(bad)), /the name must be/, bad)
  }
})

test('the site\'s own markdown.config still runs, after the kit', async () => {
  let sawRule = false
  const md = await renderer({
    config(m) {
      sawRule = typeof m.renderer.rules['container_code-group_open'] === 'function'
    }
  })
  assert.ok(sawRule)
  assert.match(md.render(group(' sdk')), /data-ls-sync="sdk"/)
})
