/**
 * @leapsight/vitepress-template/theme — shared client theme.
 *
 * Use from a site's `.vitepress/theme/index.ts`:
 *
 *   import Theme from '@leapsight/vitepress-template/theme'
 *   import './brand.css'   // per-site token overrides
 *   export default Theme
 *
 * or extend it further (extra components, wrapped layout, ...):
 *
 *   import Theme from '@leapsight/vitepress-template/theme'
 *   export default {
 *     extends: Theme,
 *     enhanceApp({ app }) { app.component('MyThing', MyThing) }
 *   }
 */
import type { Theme } from 'vitepress'
import { defineAsyncComponent } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'

import Tab from './components/Tab.vue'
import Tabs from './components/Tabs.vue'
import Feature from './components/Feature.vue'
import Features from './components/Features.vue'
import SectionFeatures from './components/SectionFeatures.vue'
import CardGrid from './components/CardGrid.vue'
import ZoomImg from './components/ZoomImg.vue'
import ZoomSvg from './components/ZoomSvg.vue'
import Pill from './components/Pill.vue'
import SiteMeta from './components/SiteMeta.vue'
import NavbarVersion from './components/NavbarVersion.vue'
import BackToTop from './components/BackToTop.vue'
import NewsletterForm from './components/NewsletterForm.vue'
import ZulipChannelView from './components/ZulipChannelView.vue'
import ZulipChannels from './components/ZulipChannels.vue'

import './styles/vars.css'
import './styles/base.css'
import './styles/components.css'

// Async: DataTreeViewItem renders descriptions with markdown-it in the
// browser, so a static import put the parser in every page's theme chunk
// (~40 KB gzipped on bondy.io) whether or not the page used the component.
const DataTreeView = defineAsyncComponent(() => import('./components/DataTreeView.vue'))

export {
  Layout,
  Tab,
  Tabs,
  Feature,
  Features,
  SectionFeatures,
  CardGrid,
  DataTreeView,
  ZoomImg,
  ZoomSvg,
  Pill,
  SiteMeta,
  NavbarVersion,
  BackToTop,
  NewsletterForm,
  ZulipChannelView,
  ZulipChannels
}

const theme: Theme = {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // Globally available in markdown pages.
    app.component('Tab', Tab)
    app.component('Tabs', Tabs)
    app.component('Feature', Feature)
    app.component('Features', Features)
    app.component('SectionFeatures', SectionFeatures)
    app.component('CardGrid', CardGrid)
    app.component('DataTreeView', DataTreeView)
    app.component('ZoomImg', ZoomImg)
    app.component('ZoomSvg', ZoomSvg)
    app.component('Pill', Pill)
    app.component('SiteMeta', SiteMeta)
    app.component('NewsletterForm', NewsletterForm)
    app.component('ZulipChannelView', ZulipChannelView)
    app.component('ZulipChannels', ZulipChannels)
  }
}

export default theme
