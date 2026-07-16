---
title: Linking a Blog to Docs
date: 2026-07-01
author: Bram de Vries
tags: [knowledge-graph, docs]
excerpt: Cross-site references by stable @id — the graph spans repositories.
series: Graph-native blogging
seriesOrder: 2
"schema:mentions": "bondydoc:concepts/store"
---

<ReadingProgress />
<PostMeta />
<SeriesNav />

The graph doesn't stop at this repository. Our docs live in a different site
under the `bondydoc:` namespace, and we reference them by stable `@id`.

This post `schema:mentions` the `bondydoc:concepts/store` node (declared in
frontmatter), and links to the [store design](https://bondy.io/kb/concepts/store){rel="schema:about"}
inline. Both are recorded as edges and flow into this post's JSON-LD
`about`/`mentions` — but neither is build-checked, because the docs site
isn't part of this build. Internal links still are: a typo in a
same-site link would fail the build.

It also picks up where [[typed-edges]] left off.

<RelatedPosts />
