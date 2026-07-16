// SPDX-License-Identifier: Apache-2.0
//
// Client-side types mirroring the loader output. Components only READ these.

export interface KbNode {
  /** Compact `@id` (CURIE), e.g. `post:2026/hello-graph`. */
  id: string
  /** Expanded IRI. */
  iri: string
  /** Published route, e.g. `/posts/hello-graph`. */
  url: string
  /** Human-readable label. */
  title: string
  /** Compact `@type` (CURIE), e.g. `schema:BlogPosting`. */
  type: string
  section?: string
  group?: string
  /** `true` for derived/untyped nodes (link/backlink targets, not gated). */
  generic: boolean
  /** Optional carried frontmatter (date, tags, …) for graph/tooltip display. */
  meta?: Record<string, unknown>
}

export interface KbEdge {
  from: string
  to: string
  predicate: string
  attrs?: Record<string, string>
}

export interface InboundEdge {
  from: string
  predicate: string
}

export interface KbGraph {
  nodes: KbNode[]
  edges: KbEdge[]
}

export interface KbData {
  graph: KbGraph
  triples: Array<{ subject: string; predicate: string; object: string; objectIsLiteral?: boolean }>
  backlinks: Record<string, InboundEdge[]>
}

/** Optional labels/order for inbound predicates, and per-type colors. */
export interface KbUiConfig {
  /** predicate CURIE → passive label shown on backlinks ("Referenced by"). */
  inverseLabels?: Record<string, string>
  /** display order for inbound predicate groups. */
  order?: string[]
  /** predicate CURIE folded into the curated "Related" group. */
  relatedPredicate?: string
  /** `@type` local-name → CSS color, for the graph view. */
  typeColors?: Record<string, string>
}

export const KB_DATA_KEY = Symbol('kb-data')
export const KB_UI_KEY = Symbol('kb-ui')

export const EMPTY_KB: KbData = { graph: { nodes: [], edges: [] }, triples: [], backlinks: {} }
