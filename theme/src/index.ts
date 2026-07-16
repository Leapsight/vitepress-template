/**
 * @leapsight/vitepress-theme — shared client theme.
 *
 * Use from a site's `.vitepress/theme/index.ts`:
 *
 *   import Theme from '@leapsight/vitepress-theme'
 *   import './brand.css'   // per-site token overrides
 *   export default Theme
 *
 * or extend it further (extra components, wrapped layout, ...):
 *
 *   import Theme from '@leapsight/vitepress-theme'
 *   export default {
 *     extends: Theme,
 *     enhanceApp({ app }) { app.component('MyThing', MyThing) }
 *   }
 */
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'

import Tab from './components/Tab.vue'
import Tabs from './components/Tabs.vue'
import Feature from './components/Feature.vue'
import Features from './components/Features.vue'
import SectionFeatures from './components/SectionFeatures.vue'
import CardGrid from './components/CardGrid.vue'
import DataTreeView from './components/DataTreeView.vue'
import ZoomImg from './components/ZoomImg.vue'
import Pill from './components/Pill.vue'
import SiteMeta from './components/SiteMeta.vue'
import NavbarVersion from './components/NavbarVersion.vue'
import BackToTop from './components/BackToTop.vue'

import './styles/vars.css'
import './styles/base.css'
import './styles/components.css'

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
  Pill,
  SiteMeta,
  NavbarVersion,
  BackToTop
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
    app.component('Pill', Pill)
    app.component('SiteMeta', SiteMeta)
  }
}

export default theme
