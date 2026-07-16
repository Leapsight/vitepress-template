// SPDX-License-Identifier: Apache-2.0
//
// Render-time half of the typed-edge syntax. Authors write a typed edge as a
// normal markdown link followed by a `{rel=…}` attribute block:
//
//     See the [store design](/concepts/store){rel="schema:about"}.
//
// The KB loader harvests the same block from raw source into a graph edge.
// This markdown-it rule is the cosmetic counterpart: it consumes the block
// and stamps the <a> with `data-rel` / `data-rel-iri` + a `kb-typed-edge`
// class, so the braces never render as literal text.

import { parseAttrBlock } from '../lib/extract.js'

const LEADING_ATTR_RE = /^[ \t]*\{([^}]*)\}/

/**
 * @param {import('markdown-it')} md
 * @param {{ expandCurie?: (curie: string) => string }} [options]
 */
export function typedEdges(md, options = {}) {
  const expand = options.expandCurie ?? ((c) => c)

  md.core.ruler.after('inline', 'kb-typed-edges', (state) => {
    for (const block of state.tokens) {
      if (block.type !== 'inline' || !block.children) continue
      const children = block.children

      for (let i = 0; i < children.length; i++) {
        if (children[i].type !== 'link_close') continue

        const text = children[i + 1]
        if (!text || text.type !== 'text') continue
        const m = text.content.match(LEADING_ATTR_RE)
        if (!m) continue

        const attrs = parseAttrBlock(m[1])
        if (!attrs.rel) continue

        let openIdx = -1
        for (let j = i - 1; j >= 0; j--) {
          if (children[j].type === 'link_open') {
            openIdx = j
            break
          }
          if (children[j].type === 'link_close') break
        }
        if (openIdx === -1) continue

        const open = children[openIdx]
        open.attrJoin('class', 'kb-typed-edge')
        open.attrSet('data-rel', attrs.rel)
        const iri = expand(attrs.rel)
        if (iri && iri !== attrs.rel) open.attrSet('data-rel-iri', iri)
        for (const [k, v] of Object.entries(attrs)) {
          if (k === 'rel') continue
          open.attrSet(`data-${k}`, v)
        }

        text.content = text.content.slice(m[0].length)
      }
    }
  })
}

/**
 * Register the typed-edge markdown rule against a loaded ontology.
 * @param {import('markdown-it')} md
 * @param {{ expandCurie: (c: string) => string }} ontology
 */
export function registerKbMarkdown(md, ontology) {
  md.use(typedEdges, { expandCurie: ontology.expandCurie })
}
