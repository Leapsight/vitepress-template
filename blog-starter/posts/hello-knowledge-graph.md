---
title: Hello, Knowledge Graph
date: 2026-06-01
author: Alia Marin
tags: [knowledge-graph, vitepress]
excerpt: Why this blog is a graph, not a pile of pages — and what that buys you.
featured: true
---

<ReadingProgress />
<PostMeta />

Most blogs are a pile of pages that happen to share a stylesheet. This one is
a [knowledge graph](/glossary/knowledge-graph): every post is a node with a stable `@id`, and the links between
posts (and out to our docs) are typed, machine-readable edges.

That single build-time index does four jobs at once: it emits [schema.org](https://schema.org)
JSON-LD for search engines and AI answing, powers the "Mentioned in" backlinks
below, drives the [interactive graph](/graph), and ranks related posts by
graph proximity instead of tag overlap alone.

The next post digs into the syntax: see [[typed-edges]] for how a plain
markdown link becomes a typed relationship.

<RelatedPosts />
