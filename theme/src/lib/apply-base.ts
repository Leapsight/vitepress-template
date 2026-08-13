import { withBase } from 'vitepress'

/**
 * Prefix a root-absolute URL with the VitePress `base`.
 *
 * A site deployed under a sub-path (`base: '/docs/router/'`) serves its
 * assets and pages from that prefix, but an author writes `/assets/x.svg`
 * or `/concepts/realms` — root-absolute, base-unaware. Those resolve to the
 * origin root and 404 unless they go through `withBase()`.
 *
 * External URLs, protocol-relative URLs, mailto: and bare hash anchors pass
 * through unchanged: prefixing them would corrupt them.
 *
 * Relative paths also pass through — they resolve against the current
 * document, which is already inside the base.
 *
 * NOTE: this is deliberately NOT used by NavbarVersion, where each version
 * is a separate deployment with its own base and prefixing a sibling
 * version's path would 404. See the comment there.
 */
export function applyBase(link: string): string {
  if (!link) return link
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(link)) return link
  if (link.startsWith('/')) return withBase(link)
  return link
}

export default applyBase
