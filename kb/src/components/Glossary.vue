<!--
SPDX-License-Identifier: Apache-2.0

Glossary index: lists every concept node of a given @type (default
`schema:DefinedTerm`) from the knowledge graph, alphabetically, with its short
definition (the node's carried `excerpt`, when present). Drop `<Glossary />`
onto a glossary index page; new term pages appear automatically.
-->
<template>
  <div class="kb-glossary">
    <p v-if="!terms.length" class="kb-glossary-empty">No terms defined yet.</p>
    <dl v-else class="kb-glossary-list">
      <div v-for="t in terms" :key="t.url" class="kb-glossary-item">
        <dt><a :href="withBase(t.url)">{{ t.title }}</a></dt>
        <dd v-if="summary(t)">{{ summary(t) }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { useKbData } from '../composables'
import type { KbNode } from '../types'

const props = withDefaults(defineProps<{ type?: string }>(), { type: 'schema:DefinedTerm' })

const kb = useKbData()

const terms = computed(() =>
  kb.graph.nodes.filter((n) => n.type === props.type).slice().sort((a, b) => a.title.localeCompare(b.title))
)

function summary(n: KbNode): string {
  const e = n.meta?.excerpt
  return typeof e === 'string' ? e : ''
}
</script>
