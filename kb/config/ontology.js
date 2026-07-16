// SPDX-License-Identifier: Apache-2.0
//
// JSON-LD context → CURIE ⇄ IRI helpers. Single source of truth for the
// prefix map so the loader, jsonld expansion and SHACL gate all agree on how
// prefixes resolve. Accepts either a context file path or an inline context
// object (so a preset can compose schema.org terms with per-site prefixes).

import { readFileSync } from 'node:fs'

function isAbsoluteIri(s) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(s) || s.startsWith('urn:')
}

/** Build the ontology helpers from an inline `@context` object. */
export function buildOntology(contextObj) {
  const context = contextObj ?? {}

  // Prefix map = the entries whose value is a bare namespace IRI string.
  const prefixes = {}
  for (const [k, v] of Object.entries(context)) {
    if (typeof v === 'string' && (v.endsWith('#') || v.endsWith('/'))) {
      prefixes[k] = v
    }
  }

  function expandCurie(curie) {
    if (!curie) return curie
    if (isAbsoluteIri(curie)) return curie
    const i = curie.indexOf(':')
    if (i === -1) return curie
    const prefix = curie.slice(0, i)
    const local = curie.slice(i + 1)
    const ns = prefixes[prefix]
    return ns ? ns + local : curie
  }

  return { context, prefixes, expandCurie }
}

/** Load an ontology from a `{ "@context": {...} }` JSON file. */
export function loadOntology(contextPath) {
  const parsed = JSON.parse(readFileSync(contextPath, 'utf-8'))
  return buildOntology(parsed['@context'] ?? {})
}
