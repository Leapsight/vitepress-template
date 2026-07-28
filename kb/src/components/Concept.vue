<!--
SPDX-License-Identifier: Apache-2.0

Concept side-annotation: a small badge that links to a concept node in the
knowledge graph (typically a glossary `schema:DefinedTerm`). On wide screens it
floats into the article's right margin, top-aligned with its paragraph; under
~1120px it drops in-flow, below the paragraph. Place it at the END of the
paragraph it annotates.

Resolution (in order): explicit `to` URL, else the graph node matched by `id`.
Either way, if a graph node is found the badge borrows its title as the label —
so `<Concept to="/glossary/typed-feature-structures" />` auto-labels itself.

  <Concept to="/glossary/typed-feature-structures" />          resolve title from the graph
  <Concept to="/glossary/tfs">Feature Structures</Concept>     custom label (slot)
  <Concept id="concept:tfs" />                                 by graph @id
  <Concept to="https://…" label="…" kind="Reference" />        external
-->
<template>
  <a
    class="concept-note"
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noreferrer' : undefined"
  >
    <span class="concept-kind">{{ kind ?? 'Concept' }}</span>
    <span class="concept-label"><slot>{{ text }}</slot></span>
    <span class="concept-arrow" aria-hidden="true">→</span>
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { useKbData } from '../composables'

const props = defineProps<{
  id?: string // KB node @id (CURIE)
  to?: string // explicit URL/path; also used to match a node by url
  label?: string // display text (else the slot, else the resolved node title)
  kind?: string // eyebrow text, default "Concept"
}>()

const kb = useKbData()

function normKey(p: string): string {
  if (!p) return ''
  let r = p.replace(/\.html$/, '').replace(/[?#].*$/, '')
  const base = withBase('/')
  if (base !== '/' && r.startsWith(base)) r = '/' + r.slice(base.length)
  return r === '/' ? '/' : r.replace(/\/+$/, '')
}

const node = computed(() => {
  const nodes = kb.graph.nodes
  if (props.id) return nodes.find((n) => n.id === props.id)
  if (props.to && !/^https?:\/\//.test(props.to)) {
    const key = normKey(props.to)
    return nodes.find((n) => normKey(n.url) === key)
  }
  return undefined
})

const target = computed(() => props.to ?? node.value?.url ?? '')
const external = computed(() => /^https?:\/\//.test(target.value))
const href = computed(() => (external.value ? target.value : withBase(target.value || '#')))
const text = computed(() => props.label ?? node.value?.title ?? '')
</script>
