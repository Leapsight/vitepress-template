---
title: Typed Edges in Practice
date: 2026-06-15
author: Alia Marin
tags: [knowledge-graph, rdf]
excerpt: Turning ordinary markdown links into typed, queryable relationships.
series: Graph-native blogging
seriesOrder: 1
"schema:about": "post:posts/hello-knowledge-graph"
---

<ReadingProgress />
<PostMeta />
<SeriesNav />

A typed edge is a normal markdown link with a `{rel="…"}` block naming the
relationship. This post declares — in frontmatter — that it is
`schema:about` the [introduction](/posts/hello-knowledge-graph), so the intro
now shows this post under "Subject of".

You can also write typed edges inline: this builds on the ideas we
[introduced earlier](/posts/hello-knowledge-graph){rel="schema:mentions"}.
At build time that link becomes a `schema:mentions` triple; at read time the
braces vanish and the link gets a small ⇄ marker.

Because the edges are real RDF, a broken internal reference fails the build —
integrity is enforced, not advisory.

<RelatedPosts />
