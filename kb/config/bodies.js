// SPDX-License-Identifier: Apache-2.0
//
// Rendered bodies of concept pages, for the concept panel (kb/src/preview.ts).
// A site adds `.vitepress/kb-bodies.data.ts`:
//
//     import { createKbBodiesLoader } from '@leapsight/vitepress-template/kb/loader'
//     declare const data: Record<string, string>
//     export { data }
//     export default createKbBodiesLoader({ pattern: 'glossary/*.md' })
//
// and passes `bodies: () => import('../kb-bodies.data').then((m) => m.data)`
// in the `preview` options of `withKb`. Imported dynamically, the data lands
// in its own chunk, fetched the first time a panel opens rather than with
// every page.
//
// Keys are page urls without base, `.html` or trailing slash (as normKey in
// kb/src/url.ts); values are the markdown rendered to HTML, less a leading
// <h1> (the panel shows the title) and the heading anchors (they point into
// the page, not into the panel). Vue components in a body are not rendered
// (the HTML is static), so concept pages should be plain markdown. Index
// pages are skipped.

import { createContentLoader } from 'vitepress'

/** @param {{ pattern?: string | string[], ignore?: string[] }} [options] */
export function createKbBodiesLoader({ pattern = 'glossary/*.md', ignore = [] } = {}) {
  return createContentLoader(pattern, {
    render: true,
    globOptions: { ignore },
    transform(pages) {
      /** @type {Record<string, string>} */
      const bodies = {}
      for (const p of pages) {
        const url = p.url.replace(/\.html$/, '').replace(/\/+$/, '') || '/'
        if (/(^|\/)index$/.test(url) || p.url.endsWith('/')) continue
        bodies[url] = (p.html ?? '')
          .replace(/^\s*<h1[\s>][\s\S]*?<\/h1>/, '')
          .replace(/<a class="header-anchor"[^>]*>[\s\S]*?<\/a>/g, '')
          .trim()
      }
      return bodies
    }
  })
}
