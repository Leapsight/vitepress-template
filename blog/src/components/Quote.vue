<!--
SPDX-License-Identifier: Apache-2.0

An attributed quotation — a semantic <figure> with a <blockquote> and a
citation line. Distinct from a bare `> …` pull-quote (which lifts the author's
own line, unattributed); use this to quote *someone else*, with credit.

  <Quote author="E. O. Wilson" source="Consilience, 1998">
  The trend cannot be reversed by force-feeding students with undigested facts.
  </Quote>

`source` is optional; `cite` (a URL) turns the source into a link.
-->
<template>
  <figure class="blog-quote">
    <blockquote><slot /></blockquote>
    <figcaption class="blog-quote-cite">
      <span class="cite-author">{{ author }}</span
      ><template v-if="source">, <cite
        ><a v-if="cite" :href="cite" target="_blank" rel="noreferrer">{{ source }}</a
        ><template v-else>{{ source }}</template></cite
      ></template>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
defineProps<{ author: string; source?: string; cite?: string }>()
</script>
