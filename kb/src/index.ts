// SPDX-License-Identifier: Apache-2.0
//
// Client entry for @leapsight/vitepress-template/kb.
//
// A site wires the graph into its theme like this:
//
//   // .vitepress/theme/index.ts
//   import Theme from '@leapsight/vitepress-template/theme'
//   import { withKb } from '@leapsight/vitepress-template/kb'
//   import { data as kbData } from '../kb.data'
//   import { blogKbUi } from '@leapsight/vitepress-template/blog'
//   export default withKb(Theme, kbData, blogKbUi)
//
// `withKb` registers <Backlinks> + <GraphView> globally, provides the graph
// to them, and wraps the layout so the backlinks panel appears after the doc
// content on every page.

import { h, defineComponent } from 'vue'
import type { Theme as VPTheme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Backlinks from './components/Backlinks.vue'
import GraphView from './components/GraphView.vue'
import Concept from './components/Concept.vue'
import Glossary from './components/Glossary.vue'
import { KB_DATA_KEY, KB_UI_KEY } from './types'
import type { KbData, KbUiConfig } from './types'
import './styles/kb.css'

export { Backlinks, GraphView, Concept, Glossary }
export { useKbData, useKbUi } from './composables'
export * from './types'

function makeKbLayout(BaseLayout: unknown) {
  return defineComponent({
    name: 'KbLayout',
    setup(_, { slots }) {
      return () =>
        h(BaseLayout as never, null, {
          ...slots,
          'doc-after': (scope: unknown) => [slots['doc-after']?.(scope), h(Backlinks)]
        })
    }
  })
}

/**
 * Compose a base VitePress theme with the KB graph.
 * @param baseTheme the theme to extend (e.g. @leapsight/vitepress-template/theme default)
 * @param data the loader output, imported from the site's `kb.data.ts`
 * @param ui optional labels/order/colors for backlinks + graph
 */
export function withKb(baseTheme: VPTheme, data: KbData, ui: KbUiConfig = {}): VPTheme {
  const Base = (baseTheme as { Layout?: unknown }).Layout ?? DefaultTheme.Layout
  return {
    ...baseTheme,
    Layout: makeKbLayout(Base),
    enhanceApp(ctx) {
      baseTheme.enhanceApp?.(ctx)
      ctx.app.provide(KB_DATA_KEY, data)
      ctx.app.provide(KB_UI_KEY, ui)
      ctx.app.component('Backlinks', Backlinks)
      ctx.app.component('GraphView', GraphView)
      ctx.app.component('Concept', Concept)
      ctx.app.component('Glossary', Glossary)
    }
  }
}
