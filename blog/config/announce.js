// SPDX-License-Identifier: Apache-2.0
//
// Pre-paint decision for <AnnouncementBanner>. The banner server-renders
// every candidate hidden; this puts a small inline script in each page's
// <head> that, before first paint, picks the newest candidate not yet expired,
// skips it if the reader dismissed it, and reveals it with a style rule. The
// bar therefore never appears (or disappears) after the page has painted, so
// it causes no layout shift. The script also sets `html.has-announce`, for
// layouts that must make room for the bar (e.g. under a fixed nav).
//
// Wire into a site's `transformPageData` next to the SEO transform:
//
//     import { announceTransformPageData } from '@leapsight/vitepress-template/blog/config'
//     const announce = announceTransformPageData({ pattern: 'posts/*.md' })
//     transformPageData: async (pageData, ctx) => { await announce(pageData); ... }
//
// It runs in both `vitepress dev` and build (VitePress's `transformHead`
// is build-only), reading posts through the same loader as posts.data.

import { createPostsLoader } from './posts.js'

/** Inline script: `c` is [{ k: storage key, u: expiry ms | 0 }], newest first. */
function script(candidates) {
  const data = JSON.stringify(candidates).replace(/</g, '\\u003c')
  return (
    `(function(){var c=${data},n=Date.now();` +
    `for(var i=0;i<c.length;i++){if(c[i].u&&n>=c[i].u)continue;` +
    `try{if(localStorage.getItem(c[i].k)==='1')return}catch(e){}` +
    `var s=document.createElement('style');` +
    `s.textContent='.announce-bar[data-announce-key='+JSON.stringify(c[i].k)+']{display:block}';` +
    `document.head.appendChild(s);document.documentElement.classList.add('has-announce');return}})()`
  )
}

/**
 * @param {{ pattern?: string, ignore?: string[] }} [options] — as createPostsLoader
 * @returns {(pageData: object) => Promise<void>}
 */
export function announceTransformPageData(options = {}) {
  // Created on first use: createContentLoader reads the VitePress config
  // from a global that is not set yet when the site config module loads.
  let loader
  return async function transformPageData(pageData) {
    loader ??= createPostsLoader(options)
    const posts = await loader.load()
    const candidates = posts
      .filter((p) => p.announce)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
      .map((p) => ({ k: p.announceKey, u: p.announceUntil ? Date.parse(p.announceUntil) : 0 }))
    if (!candidates.length) return
    pageData.frontmatter ??= {}
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(['script', {}, script(candidates)])
  }
}
