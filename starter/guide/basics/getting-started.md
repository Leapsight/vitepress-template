---
title: Getting Started
order: 1
description: Create a new documentation site from this starter in five minutes.
feature: true
related:
  - text: Component Tour
    link: /guide/basics/components
    description: Everything the shared theme gives you out of the box.
---

This page's title comes from frontmatter (`title:`) — the H1 is
injected automatically. Its sidebar position comes from `order:`, and
because it declares `feature: true` it also appears as a card on the
[Guide landing page](/guide/).

## Create a new site

1. Copy the `starter/` package into a new repository.
2. Point the `@leapsight/vitepress-template` dependency at a git URL
   (or a published version, if you've published one).
3. Edit `.vitepress/config.ts` (title, nav, sidebar sections) and
   `.vitepress/theme/brand.css` (colors, fonts).
4. Write markdown.

## Frontmatter conventions

| Key | Effect |
| --- | ------ |
| `title` | Page title; also injected as the H1 when the body has none |
| `order` | Sort key within the sidebar group |
| `description` | Card text on section landing pages |
| `feature: true` | Include this page on the section landing grid |
| `draft: true` | Show a DRAFT watermark on the page |
| `related:` | Card grid of related links before the footer (see below) |

The **Related** section under this page's content is rendered from the
`related:` frontmatter of this very file.
