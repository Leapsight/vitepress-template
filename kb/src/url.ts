// SPDX-License-Identifier: Apache-2.0

import { withBase } from 'vitepress'

/** A route as the graph stores it: base, `.html`, query, hash and trailing
 *  slash removed, so a link and a node url compare equal. */
export function normKey(p: string): string {
  if (!p) return ''
  let r = p.replace(/[?#].*$/, '').replace(/\.html$/, '')
  const base = withBase('/')
  if (base !== '/' && r.startsWith(base)) r = '/' + r.slice(base.length)
  return r === '/' ? '/' : r.replace(/\/+$/, '')
}
