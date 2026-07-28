// SPDX-License-Identifier: Apache-2.0
//
// schema.org KB preset. Turns the vocabulary-agnostic @leapsight/vitepress-template/kb
// loader into a blog knowledge graph: BlogPosting / Person / CollectionPage
// nodes, schema.org object-properties as typed edges, and a SHACL gate.

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export { blogKbUi } from './kb-ui.js'

const HERE = dirname(fileURLToPath(import.meta.url))
export const BLOG_SHAPES_PATH = resolve(HERE, '../ontology/blog.shapes.ttl')

/** schema.org object-properties harvested from frontmatter as typed edges. */
export const BLOG_OBJECT_PROPERTIES = [
  'schema:about',
  'schema:mentions',
  'schema:isPartOf',
  'schema:author',
  'schema:relatedLink'
]

/**
 * Build the JSON-LD context: schema.org + this site's node namespace + any
 * external site namespaces (for cross-site @id references).
 */
export function blogContext({ idPrefix, siteNamespace, namespaces = {} }) {
  return {
    schema: 'https://schema.org/',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    sh: 'http://www.w3.org/ns/shacl#',
    [idPrefix]: siteNamespace,
    ...namespaces,
    title: 'schema:name',
    'schema:articleSection': { '@id': 'schema:articleSection' },
    'schema:about': { '@id': 'schema:about', '@type': '@id' },
    'schema:mentions': { '@id': 'schema:mentions', '@type': '@id' },
    'schema:isPartOf': { '@id': 'schema:isPartOf', '@type': '@id' },
    'schema:author': { '@id': 'schema:author', '@type': '@id' },
    'schema:relatedLink': { '@id': 'schema:relatedLink', '@type': '@id' }
  }
}

/** Default page classifier for a blog: posts + authors + glossary terms are
 *  typed, rest generic. Glossary term pages under `glossaryPathPrefix` become
 *  `schema:DefinedTerm` nodes so <Concept>/<Glossary> can resolve them. */
export function makeClassify({
  postPathPrefix = '/posts/',
  authorPathPrefix = '/authors/',
  glossaryPathPrefix = '/glossary/'
} = {}) {
  return function classify(fm, url) {
    const explicit = fm['@type']
    if (typeof explicit === 'string' && explicit) return { type: explicit, generic: false }

    const isIndex = url.endsWith('/') || /\/index$/.test(url)
    if (url.startsWith(postPathPrefix) && !isIndex) return { type: 'schema:BlogPosting', generic: false }
    if (url.startsWith(authorPathPrefix) && !isIndex) return { type: 'schema:Person', generic: false }
    if (glossaryPathPrefix && url.startsWith(glossaryPathPrefix) && !isIndex)
      return { type: 'schema:DefinedTerm', generic: false }

    // Tag/archive/landing/glossary-index pages: link + backlink targets, not gated.
    if (
      url.startsWith('/tags/') ||
      url.startsWith(postPathPrefix) ||
      url.startsWith(authorPathPrefix) ||
      (glossaryPathPrefix && url.startsWith(glossaryPathPrefix))
    )
      return { type: 'schema:CollectionPage', generic: true }
    return { type: 'schema:WebPage', generic: true }
  }
}

/**
 * Produce the full `createKbLoader` options object for a blog.
 *
 * @param {{
 *   siteNamespace: string,      // IRI base for this site's @ids, e.g. 'https://blog.example.com/kb/'
 *   idPrefix?: string,          // CURIE prefix for this site's nodes (default 'post')
 *   namespaces?: Record<string,string>,  // external prefix→IRI (cross-site refs)
 *   enforce?: boolean,          // SHACL + xref hard-fail (default true)
 *   artifactDir?: string,       // write graph.json / triples.nq here
 *   postPathPrefix?: string,
 *   authorPathPrefix?: string,
 *   pattern?: string,
 *   ignore?: string[]
 * }} options
 */
export function blogKbConfig(options) {
  const {
    siteNamespace,
    idPrefix = 'post',
    namespaces = {},
    enforce = true,
    artifactDir,
    postPathPrefix = '/posts/',
    authorPathPrefix = '/authors/',
    glossaryPathPrefix = '/glossary/',
    pattern,
    ignore
  } = options

  if (!siteNamespace) throw new Error('[blog] blogKbConfig: `siteNamespace` (IRI base) is required')

  return {
    context: blogContext({ idPrefix, siteNamespace, namespaces }),
    shapesPath: enforce ? BLOG_SHAPES_PATH : undefined,
    classify: makeClassify({ postPathPrefix, authorPathPrefix, glossaryPathPrefix }),
    idPrefix,
    internalPrefixes: [idPrefix],
    externalPrefixes: Object.keys(namespaces),
    objectProperties: BLOG_OBJECT_PROPERTIES,
    referencesPredicate: 'schema:mentions',
    relatedPredicate: 'schema:relatedLink',
    labelTerm: 'title',
    literalProperties: [{ field: 'section', predicate: 'schema:articleSection' }],
    carry: ['date', 'tags', 'author', 'excerpt', 'cover', 'series'],
    enforce,
    artifactDir,
    ...(pattern ? { pattern } : {}),
    ...(ignore ? { ignore } : {})
  }
}
