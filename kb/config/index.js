// SPDX-License-Identifier: Apache-2.0
//
// Node-side barrel for the KB config kit.

import { loadOntology, buildOntology } from './ontology.js'
import { typedEdges } from './markdown.js'

export { createKbLoader } from './loader.js'
export { loadOntology, buildOntology } from './ontology.js'
export { validateTriples } from './shacl.js'
export { typedEdges, registerKbMarkdown } from './markdown.js'
export { injectJsonLd } from './jsonld.js'

/**
 * Fold KB defaults into a VitePress config: register the typed-edge markdown
 * rule against the given ontology context. Compose under `withThemeDefaults`
 * (call this on the object you pass to `defineConfig`).
 *
 * @param {import('vitepress').UserConfig} userConfig
 * @param {{ contextPath?: string, context?: object }} kb
 * @returns {import('vitepress').UserConfig}
 */
export function withKbDefaults(userConfig = {}, kb) {
  const ontology = kb.context ? buildOntology(kb.context) : loadOntology(kb.contextPath)
  const userMarkdown = userConfig.markdown ?? {}

  return {
    ...userConfig,
    markdown: {
      ...userMarkdown,
      config(md) {
        userMarkdown.config?.(md)
        // Registered after the site's own config so link tokens already exist.
        md.use(typedEdges, { expandCurie: ontology.expandCurie })
      }
    }
  }
}
