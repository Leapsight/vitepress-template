---
title: Configuration Options
order: 1
description: Every knob the example server exposes.
feature: true
---

Definition lists, footnotes and task lists are enabled by the shared
markdown kit:

Term
: Definition of the term.

Another term
: And its definition[^note].

[^note]: Footnotes render at the bottom of the page.

- [x] Task lists work too
- [ ] Unchecked item

Inline code with braces is safe thanks to the `v-pre` rule:
`{{kernel, ok}, 42}`.
