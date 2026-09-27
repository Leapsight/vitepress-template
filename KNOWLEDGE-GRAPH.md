# Knowledge graph (`@leapsight/vitepress-template/kb`)

A build-time RDF knowledge graph over your markdown. Every page becomes a
node; links between pages become **typed, machine-readable edges**. The same
build-time index feeds:

- **schema.org JSON-LD** (`about` / `mentions` / `isPartOf` with stable `@id`s) —
  for search engines and AI answering;
- **backlinks** ("Mentioned in", "Subject of", …) on every page;
- an interactive **graph view**;
- **graph-proximity related posts** (stronger than tag overlap).

It is vocabulary-agnostic: the blog ships a schema.org preset, but the same
machinery serves a docs ontology or your own.

## How it works

`createKbLoader` is a VitePress data loader that runs at build time. In two
passes it: (1) turns each page into a node with a stable `@id`; (2) harvests
edges four ways, expands everything to RDF triples with `jsonld`, and runs two
**build gates**. It emits `{ graph, triples, backlinks }`, which the theme
provides to the components. Debug artifacts (`graph.json`, `triples.nq`) are
written to `artifactDir` if set.

## Node identity

Each page gets a CURIE `@id`: frontmatter `@id` if present, else derived from
the route (`/posts/x` → `post:posts/x`). The prefix (`post:`) maps to your
`siteNamespace` IRI, so every node has a stable, absolute IRI.

`classify(fm, url)` decides each node's `@type` and whether it's a **typed
authoring surface** (gated) or a **generic** node (a link/backlink target that
isn't gated). The blog preset types pages under `/posts/` as
`schema:BlogPosting` and `/authors/` as `schema:Person`; everything else is
generic.

## Writing edges

Four ways, all harvested into the graph:

**1. Frontmatter object-properties** — IRI-valued references:
```yaml
"schema:about": "post:posts/hello-knowledge-graph"
"schema:mentions": ["post:posts/typed-edges", "bondydoc:concepts/store"]
```

**2. Inline typed edges** — a link plus a `{rel="…"}` block:
```md
This builds on [the intro](/posts/hello){rel="schema:mentions"}.
```
At build the `{rel=…}` becomes an edge; at read time the braces vanish and the
link gets a ⇄ marker.

**3. Wikilinks** — `[[target]]`, resolved by `kbAlias` → filename → title →
route:
```md
See [[typed-edges]] for the syntax.
```

**4. Plain internal links** — become a generic `mentions` edge.

## Cross-site links (federated graph)

Declare other sites' namespaces and reference them by stable `@id` or absolute
IRI:

```ts
blogKbConfig({
  siteNamespace: 'https://blog.example.com/kb/',
  namespaces: { bondydoc: 'https://bondy.io/kb/' }
})
```

```md
<!-- frontmatter, or inline -->
"schema:mentions": "bondydoc:concepts/store"
[the store design](https://bondy.io/kb/concepts/store){rel="schema:about"}
```

Cross-site edges are **recorded** in the graph and flow into the post's JSON-LD
`about`/`mentions` — but they are **not build-checked**, because the other site
isn't part of this build. Internal references still are (see gates below).

## The build gates (integrity is enforced, not advisory)

With `enforce: true` (the default), the build **aborts** on:

- **Broken internal reference** — an unresolved `[[wikilink]]`, an unresolved
  internal typed-edge target, a dangling internal frontmatter `@id`, or an
  **unknown CURIE prefix** (typo protection).
- **SHACL violation** — the expanded triples are validated against the shapes
  (`blog.shapes.ttl`): every typed node needs a label; every object-property
  must reference a node by IRI, never a literal.

Broken references on **generic** nodes are warnings, not failures. Cross-site
references (declared external prefix or absolute IRI) are never gated.

Set `enforce: false` to downgrade all of this to warnings and skip SHACL (drops
the `@zazuko/env-node` + `rdf-validate-shacl` load).

## Re-pointing at a different vocabulary

Everything Bondy/schema-specific is config + two data files. To use your own
ontology, pass `createKbLoader` a `context` (or `contextPath`), a `shapesPath`,
a `classify` function, and your `objectProperties` / `referencesPredicate` /
`relatedPredicate`. The loader, gates, edge-harvesting and components make no
assumptions beyond "CURIEs resolvable via a context" and "a set of
object-property keys".

## Components

- `<Backlinks />` — auto-mounted after each page by `withKb`. Labels/order come
  from the `blogKbUi` (or your own) config.
- `<GraphView :height :include-generic :types />` — client-only force graph
  (needs the optional `graphology` + `sigma` peers; degrades gracefully).
- `<Glossary type="schema:DefinedTerm" />` — lists the terms with their
  excerpts; its links navigate (no preview).

## Concept previews

`withKb` also previews concept pages in place. Any link in page content to a
node of a preview type (default `schema:DefinedTerm`, the blog preset's
glossary pages) gets a dotted underline; clicking it, or hovering with a mouse,
shows a card with the term's title and `excerpt`. A plain markdown link is all
an author writes — and, being a link, it is also a `schema:mentions` edge.

- **Expand** opens the full term in a side panel (a bottom sheet up to 768px);
  from 1200px it can be **pinned**, and the page makes room for it.
- The panel's text comes from a lazily imported data file, so it costs nothing
  until the first Expand. Add `.vitepress/kb-bodies.data.ts` (see
  `kb/config/bodies.js`) and pass
  `preview: { bodies: () => import('../kb-bodies.data').then((m) => m.data) }`
  in the `withKb` UI config. Without it the card has no Expand.
- `preview: { types, kind }` changes which nodes preview and the card's label;
  `preview: false` turns it off.
- A site with a fixed top bar sets `--kb-panel-top` (and on phones
  `--kb-sheet-gap`) to clear it; see the comments in `kb.css`.

`blog-starter` wires all of this (`glossary/`, the link in
`posts/hello-knowledge-graph.md`). `npm run test:browser` builds it and drives
the card, panel, pin and phone sheet in headless Chrome
(`kb/test/concept-preview.browser.mjs`; needs Chrome, `CHROME=` to point at it).

## Verifying

The `blog-starter` build writes `public/kb/graph.json` and `triples.nq`. Inspect
them, or introduce a broken `[[wikilink]]` and watch the build abort.
