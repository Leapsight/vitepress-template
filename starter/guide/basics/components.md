---
title: Component Tour
order: 2
description: Tabs, cards, pills, zoomable images and data trees — the shared component surface.
feature: true
draft: true
---

Every component on this page ships with `@leapsight/vitepress-template/theme`
and is registered globally — use it in any markdown file. (This page
also has `draft: true`, hence the watermark.)

## Tabs

Authored with the `::: tabs` / `::: tab NAME` containers:

::: tabs

::: tab Erlang

```erlang
-module(hello).
-export([greet/0]).

greet() -> io:format("Hello from Erlang~n").
```

:::

::: tab Elixir

```elixir
IO.puts("Hello from Elixir")
```

:::

:::

## Card grid

<CardGrid :cards="[
  { title: 'First card', description: 'Cards flow responsively.', link: '/guide/' },
  { title: 'Second card', description: 'Accent bar follows the brand token.', link: '/reference/' },
  { title: 'External card', description: 'External links pass through.', link: 'https://vitepress.dev' }
]" />

## Pill

A floated pill label <Pill text="NEW" /> that follows the brand color
(or takes an explicit `color` prop).

## Site metadata

The current product version is <SiteMeta k="productVersion" /> — read
from `themeConfig.metadata` so it's declared once in config.

## Columns

::: columns

::: column

**Left column.** On desktop these sit side by side; on mobile they
stack.

:::

::: column

**Right column.** Handy for before/after or protocol/example pairs.

:::

:::

## Definition

::: definition Idempotence
An operation that can be applied multiple times without changing the
result beyond the initial application.
:::

## Action button

::: button /guide/basics/getting-started
Get Started
:::

## Data tree view

Renders a JSON-Schema-like object as an expandable tree:

<DataTreeView rootKey="listener" :maxDepth="2" :data="JSON.stringify({
  enabled: {
    type: 'boolean',
    required: true,
    description: 'Whether the listener is started at boot.',
    default: 'true'
  },
  port: {
    type: 'integer',
    required: true,
    mutable: false,
    description: 'TCP port to bind. **Immutable** after first boot.'
  },
  acceptors: {
    type: 'object',
    description: 'Acceptor pool configuration.',
    properties: {
      size: { type: 'integer', description: 'Pool size.', default: '16' }
    }
  }
})" />

## Zoomable image

<ZoomImg src="/logo.svg" alt="Logo" width="120" />

Click the image to zoom.
