// SPDX-License-Identifier: Apache-2.0
//
// Pure node-selection helpers shared by KB view components. Filtering +
// sorting over KbNode[] with no dependency on loaded data or Vue.

import { localName } from './extract.js'

/** The local name of a `@type` CURIE — `schema:BlogPosting` → `BlogPosting`. */
export const localType = localName

function matchesType(nodeType, want, idPrefix) {
  if (!want) return true
  const w = want.toLowerCase()
  return (
    nodeType.toLowerCase() === w ||
    localName(nodeType).toLowerCase() === w ||
    (idPrefix ? nodeType.toLowerCase() === `${idPrefix}:${w}` : false)
  )
}

function sortValue(node, key) {
  if (key === 'type') return localName(node.type)
  return node[key] ?? ''
}

/**
 * Filter + sort + cap a node list.
 * @param {Array} nodes
 * @param {{type?, section?, generic?, sort?, desc?, limit?, typePrefix?}} opts
 */
export function selectNodes(nodes, opts = {}) {
  const { type, section, generic = false, sort = 'title', desc = false, limit, typePrefix } = opts

  const filtered = nodes.filter(
    (n) =>
      (generic || !n.generic) &&
      matchesType(n.type, type, typePrefix) &&
      (!section || n.section === section)
  )

  const dir = desc ? -1 : 1
  filtered.sort(
    (a, b) =>
      dir * (String(sortValue(a, sort)).localeCompare(String(sortValue(b, sort))) || a.title.localeCompare(b.title))
  )

  return limit && limit > 0 ? filtered.slice(0, limit) : filtered
}
