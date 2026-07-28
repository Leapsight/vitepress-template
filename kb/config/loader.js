// SPDX-License-Identifier: Apache-2.0
//
// Vocabulary-agnostic KB build-time data-loader factory. A site's
// `.vitepress/kb.data.ts` does:
//
//     import { createKbLoader } from '@leapsight/vitepress-template/kb/loader'
//     export default createKbLoader({ ...vocabularyConfig })
//
// It walks every content markdown file (via createContentLoader, includeSrc),
// turns each into a graph node, expands frontmatter to RDF triples with
// jsonld, harvests inline `{rel=…}` typed edges + `[[xref]]`s + plain links,
// and emits an importable `{ graph, triples, backlinks }` value.
//
// Integrity gates (when `enforce`): an unresolved internal `[[xref]]`, an
// unresolved internal typed-edge target, a dangling internal `@id`, an unknown
// CURIE prefix, or a SHACL violation aborts the build. Cross-site references —
// absolute IRIs, or CURIEs on a declared EXTERNAL prefix — are recorded as
// edges/triples but never gated (the other site isn't in this build).

import { createContentLoader } from 'vitepress'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, posix } from 'node:path'
import jsonld from 'jsonld'
import { loadOntology, buildOntology } from './ontology.js'
import {
  deriveId,
  humanize,
  slugifyTitle,
  stripFrontmatter,
  stripCode,
  parseLinks,
  parseWikilinks
} from '../lib/extract.js'

function isExternalTarget(target) {
  return /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//')
}
function normKey(route) {
  return route === '/' ? '/' : route.replace(/\/+$/, '')
}
function prefixOf(curie) {
  const i = curie.indexOf(':')
  return i === -1 ? '' : curie.slice(0, i)
}

/**
 * @param {{
 *   contextPath?: string,
 *   context?: object,
 *   shapesPath?: string,
 *   classify: (fm: object, url: string) => { type: string, generic: boolean },
 *   idPrefix?: string,
 *   internalPrefixes?: string[],
 *   externalPrefixes?: string[],
 *   objectProperties?: string[],
 *   referencesPredicate?: string,
 *   relatedPredicate?: string,
 *   labelTerm?: string,
 *   literalProperties?: Array<{ field: string, predicate: string }>,
 *   carry?: string[],
 *   enforce?: boolean,
 *   pattern?: string,
 *   ignore?: string[],
 *   artifactDir?: string
 * }} options
 */
export function createKbLoader(options) {
  const {
    contextPath,
    context,
    shapesPath,
    classify,
    idPrefix = 'doc',
    internalPrefixes = [idPrefix],
    externalPrefixes = [],
    objectProperties = [],
    referencesPredicate,
    relatedPredicate,
    labelTerm = 'title',
    literalProperties = [],
    carry = [],
    enforce = true,
    pattern = '**/*.md',
    ignore = ['**/node_modules/**', '**/.vitepress/**'],
    artifactDir
  } = options

  if (!contextPath && !context)
    throw new Error('[KB] createKbLoader: `contextPath` or `context` is required')
  if (typeof classify !== 'function') throw new Error('[KB] createKbLoader: `classify` is required')

  const objectPropSet = new Set(objectProperties)
  const internalSet = new Set(internalPrefixes)
  const externalSet = new Set(externalPrefixes)

  return createContentLoader(pattern, {
    includeSrc: true,
    globOptions: { ignore },
    async transform(rawPages) {
      const ontology = context ? buildOntology(context) : loadOntology(contextPath)

      // Classify an unresolved reference target CURIE/IRI.
      // → 'external' (recorded, not gated) | 'broken' (gated).
      function classifyTargetCurie(curie) {
        if (isExternalTarget(curie) && curie.includes('://')) return 'external'
        const p = prefixOf(curie)
        if (externalSet.has(p)) return 'external'
        return 'broken' // internal-but-missing, or unknown prefix → gated
      }

      // ---- Pass 1: nodes + resolution indexes ----------------------------
      const pages = []
      const routeToId = new Map()
      const idSet = new Set()
      const filenameToIds = new Map()
      const titleToId = new Map()
      const aliasToIds = new Map() // frontmatter `kbAlias` → @id[]

      for (const p of rawPages) {
        const url = p.url
        if (!url || url === '/404' || url === '/404.html') continue
        // Dynamic-route template stubs (`/tags/[tag]`) are not real pages.
        if (url.includes('[') || url.includes(']')) continue

        const fm = p.frontmatter ?? {}
        if (fm.draft === true && process.env.NODE_ENV === 'production') continue

        const id = typeof fm['@id'] === 'string' && fm['@id'] ? fm['@id'] : deriveId(url, idPrefix)
        const { type, generic } = classify(fm, url)
        const basename = normKey(url).split('/').pop() || 'index'
        const title =
          typeof fm.title === 'string' && fm.title.trim() ? fm.title.trim() : humanize(basename)

        const meta = {}
        for (const key of carry) {
          if (fm[key] !== undefined) meta[key] = fm[key]
        }

        const node = {
          id,
          iri: ontology.expandCurie(id),
          url,
          title,
          type,
          generic,
          section: typeof fm.section === 'string' ? fm.section : undefined,
          group: typeof fm.group === 'string' ? fm.group : undefined,
          ...(Object.keys(meta).length ? { meta } : {})
        }

        pages.push({ url, src: p.src ?? '', frontmatter: fm, node })
        routeToId.set(normKey(url), id)
        idSet.add(id)
        const fnArr = filenameToIds.get(basename) ?? []
        fnArr.push(id)
        filenameToIds.set(basename, fnArr)
        if (!titleToId.has(slugifyTitle(title))) titleToId.set(slugifyTitle(title), id)
        const alias = fm.kbAlias
        if (typeof alias === 'string' && alias) {
          const arr = aliasToIds.get(alias) ?? []
          arr.push(id)
          aliasToIds.set(alias, arr)
        }
      }

      // ---- Resolvers -----------------------------------------------------
      function resolveLinkToId(fromUrl, target) {
        let t = target.split('#')[0].split('?')[0].trim()
        if (!t || t === '#' || isExternalTarget(t)) return null
        let route = t.startsWith('/') ? t : posix.join(posix.dirname(fromUrl), t)
        route = route.replace(/\.(md|html)$/i, '').replace(/\/index$/, '')
        return routeToId.get(normKey(route)) ?? null
      }

      function resolveWikilinkToId(target) {
        const byAlias = aliasToIds.get(target)
        if (byAlias && byAlias.length) return { id: byAlias[0], ambiguous: byAlias.length > 1 }
        const byFile = filenameToIds.get(target)
        if (byFile && byFile.length === 1) return { id: byFile[0], ambiguous: false }
        if (byFile && byFile.length > 1) return { id: byFile[0], ambiguous: true }
        const byTitle = titleToId.get(slugifyTitle(target))
        if (byTitle) return { id: byTitle, ambiguous: false }
        const byRoute = routeToId.get(normKey(target.startsWith('/') ? target : '/' + target))
        return { id: byRoute ?? null, ambiguous: false }
      }

      // ---- Pass 2: edges, triples, gate ----------------------------------
      const edges = []
      const tripleKeys = new Set()
      const triples = []
      const problems = []
      const warnings = []

      function addTriple(subject, predicate, object, objectIsLiteral) {
        const key = `${subject}|${predicate}|${object}|${objectIsLiteral ? 'L' : 'I'}`
        if (tripleKeys.has(key)) return
        tripleKeys.add(key)
        triples.push({ subject, predicate, object, objectIsLiteral })
      }
      function addEdge(from, to, predicate, attrs) {
        edges.push({ from, to, predicate, ...(attrs && Object.keys(attrs).length ? { attrs } : {}) })
        addTriple(ontology.expandCurie(from), ontology.expandCurie(predicate), ontology.expandCurie(to), false)
      }

      const NQ_RE = /^(<[^>]*>|_:[^\s]+)\s+(<[^>]*>)\s+(.+?)\s*\.\s*$/
      function ingestNquads(nq) {
        for (const line of nq.split('\n')) {
          const m = line.match(NQ_RE)
          if (!m) continue
          const subject = m[1].replace(/^<|>$/g, '')
          const predicate = m[2].replace(/^<|>$/g, '')
          const rawObj = m[3]
          if (rawObj.startsWith('<')) {
            addTriple(subject, predicate, rawObj.replace(/^<|>$/g, ''), false)
          } else {
            const lit = rawObj.match(/^"([\s\S]*)"(?:\^\^<[^>]*>|@[\w-]+)?$/)
            addTriple(subject, predicate, lit ? lit[1] : rawObj, true)
          }
        }
      }

      for (const page of pages) {
        const { url, node, frontmatter: fm } = page
        const id = node.id
        const fatal = enforce && !node.generic
        const reportBroken = (kind, ref) => {
          if (fatal) problems.push({ url, kind, ref })
          else warnings.push(`[KB] non-fatal (${node.type}) ${url} — ${kind}: ${ref}`)
        }

        // (a) Frontmatter → JSON-LD node → RDF triples + object-property edges.
        const ldNode = {
          '@context': ontology.context,
          '@id': id,
          '@type': node.type,
          [labelTerm]: node.title
        }
        for (const { field, predicate } of literalProperties) {
          const v = fm[field]
          if (typeof v === 'string' && v) ldNode[predicate] = v
        }

        for (const key of Object.keys(fm)) {
          if (!objectPropSet.has(key)) continue
          const val = fm[key]
          const list = Array.isArray(val) ? val : [val]
          const targetCuries = []
          for (const tv of list) {
            const curie =
              typeof tv === 'string'
                ? tv
                : tv && typeof tv === 'object' && typeof tv['@id'] === 'string'
                  ? tv['@id']
                  : undefined
            if (!curie) continue
            if (idSet.has(curie)) {
              targetCuries.push(curie)
              addEdge(id, curie, key)
            } else if (classifyTargetCurie(curie) === 'external') {
              targetCuries.push(curie)
              addEdge(id, curie, key)
            } else {
              reportBroken(`frontmatter ${key} → @id reference not a known node`, curie)
            }
          }
          if (targetCuries.length) {
            ldNode[key] =
              targetCuries.length === 1 ? { '@id': targetCuries[0] } : targetCuries.map((c) => ({ '@id': c }))
          }
        }

        try {
          const nq = await jsonld.toRDF(ldNode, { format: 'application/n-quads' })
          ingestNquads(nq)
        } catch (err) {
          warnings.push(`[KB] jsonld expansion failed for ${url}: ${err.message}`)
        }

        // (b) Body links / wikilinks / inline typed edges.
        const body = stripCode(stripFrontmatter(page.src))

        for (const link of parseLinks(body)) {
          const rel = link.attrs.rel
          const toId = resolveLinkToId(url, link.target)
          if (rel) {
            const prefix = prefixOf(rel)
            if (!prefix || !ontology.prefixes[prefix]) {
              reportBroken(`typed edge rel="${rel}" → unknown CURIE prefix`, rel)
              continue
            }
            const { rel: _rel, ...rest } = link.attrs
            if (toId) {
              addEdge(id, toId, rel, rest)
            } else if (isExternalTarget(link.target) && link.target.includes('://')) {
              // Cross-site typed edge: record to the absolute IRI, not gated.
              addEdge(id, link.target, rel, rest)
            } else {
              reportBroken(`typed edge rel="${rel}" → target not a known node`, link.target)
            }
          } else if (referencesPredicate && toId && toId !== id) {
            addEdge(id, toId, referencesPredicate)
          }
        }

        for (const target of parseWikilinks(body)) {
          const { id: toId, ambiguous } = resolveWikilinkToId(target)
          if (!toId) {
            reportBroken('[[xref]] target not found', target)
            continue
          }
          if (ambiguous) warnings.push(`[KB] ambiguous [[${target}]] in ${url} — resolved to first match`)
          if (referencesPredicate && toId !== id) addEdge(id, toId, referencesPredicate)
        }

        // (c) `related:` frontmatter → relatedPredicate (non-fatal).
        const related = fm.related
        if (relatedPredicate && Array.isArray(related)) {
          for (const r of related) {
            const linkVal = r && typeof r === 'object' ? r.link : undefined
            if (typeof linkVal !== 'string') continue
            const toId = resolveLinkToId(url, linkVal)
            if (toId && toId !== id) addEdge(id, toId, relatedPredicate)
            else if (!toId && isExternalTarget(linkVal) && linkVal.includes('://')) {
              addEdge(id, linkVal, relatedPredicate)
            } else if (!toId) {
              warnings.push(`[KB] unresolved related link in ${url}: ${linkVal}`)
            }
          }
        }
      }

      // ---- Gate report ---------------------------------------------------
      for (const w of warnings) console.warn(w)

      if (problems.length) {
        const lines = problems.map((p) => `  • ${p.url}\n      ${p.kind}: ${p.ref}`).join('\n')
        throw new Error(
          `[KB] Broken cross-references — build aborted (${problems.length}):\n${lines}\n` +
            `Fix the reference, or remove it. (KB integrity is enforced, not advisory.)`
        )
      }

      // ---- SHACL gate ----------------------------------------------------
      if (shapesPath) {
        const { validateTriples } = await import('./shacl.js')
        const shacl = await validateTriples(triples, shapesPath)
        if (!shacl.conforms) {
          throw new Error(
            `[KB] SHACL violations — build aborted (${shacl.count}):\n${shacl.report}\n` +
              `Fix the frontmatter/edge, or adjust the shapes. (KB integrity is enforced, not advisory.)`
          )
        }
      }

      // ---- Backlinks -----------------------------------------------------
      const backlinks = {}
      for (const e of edges) {
        ;(backlinks[e.to] ??= []).push({ from: e.from, predicate: e.predicate })
      }

      const result = { graph: { nodes: pages.map((p) => p.node), edges }, triples, backlinks }

      // ---- Emit artifacts (best-effort) ----------------------------------
      if (artifactDir) {
        try {
          mkdirSync(artifactDir, { recursive: true })
          writeFileSync(resolve(artifactDir, 'graph.json'), JSON.stringify(result.graph), 'utf-8')
          writeFileSync(
            resolve(artifactDir, 'triples.nq'),
            triples
              .map((t) =>
                t.objectIsLiteral
                  ? `<${t.subject}> <${t.predicate}> "${String(t.object).replace(/"/g, '\\"')}" .`
                  : `<${t.subject}> <${t.predicate}> <${t.object}> .`
              )
              .join('\n'),
            'utf-8'
          )
        } catch {
          /* artifacts are a convenience; never fail the build over them */
        }
      }

      return result
    }
  })
}
