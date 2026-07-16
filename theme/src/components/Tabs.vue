<!--
Tabbed container (port of the vue-tabs-component pattern used by
bondy_docs). Pairs with <Tab>. Also reachable from markdown via the
`::: tabs` / `::: tab NAME` containers registered by the config kit.

Remembers the active tab per page in localStorage for `cacheLifetime`
minutes and optionally syncs with the URL fragment.
-->
<template>
  <div :class="wrapperClass">
    <ul role="tablist" :class="navClass">
      <li
        v-for="(tab, i) in tabs"
        :key="i"
        :class="[navItemClass, tab.isDisabled ? navItemDisabledClass : '', tab.isActive ? navItemActiveClass : '']"
        role="presentation"
      >
        <a
          role="tab"
          :class="[navItemLinkClass, tab.isDisabled ? navItemLinkDisabledClass : '', tab.isActive ? navItemLinkActiveClass : '']"
          :aria-controls="tab.hash"
          :aria-selected="tab.isActive"
          :href="tab.hash"
          @click="selectTab(tab.hash, $event)"
          v-html="tab.header"
        />
      </li>
    </ul>
    <div :class="panelsWrapperClass">
      <slot />
    </div>
  </div>
</template>

<script>
import expiringStorage from '../lib/expiring-storage'
import { reactive, provide, onMounted, toRefs } from 'vue'

export default {
  name: 'Tabs',
  props: {
    cacheLifetime: {
      type: Number,
      default: 5
    },
    options: {
      type: Object,
      required: false,
      default: () => ({
        useUrlFragment: true,
        defaultTabHash: null
      })
    },
    wrapperClass: { type: String, default: 'tabs-component' },
    panelsWrapperClass: { type: String, default: 'tabs-component-panels' },
    navClass: { type: String, default: 'tabs-component-tabs' },
    navItemClass: { type: String, default: 'tabs-component-tab' },
    navItemDisabledClass: { type: String, default: 'is-disabled' },
    navItemActiveClass: { type: String, default: 'is-active' },
    navItemLinkClass: { type: String, default: 'tabs-component-tab-a' },
    navItemLinkActiveClass: { type: String, default: 'is-active' },
    navItemLinkDisabledClass: { type: String, default: 'is-disabled' }
  },

  emits: ['changed', 'clicked'],

  setup(props, context) {
    const state = reactive({
      activeTabHash: '',
      lastActiveTabHash: '',
      tabs: []
    })

    provide('tabsProvider', state)

    provide('addTab', (tab) => {
      state.tabs.push(tab)
    })

    provide('updateTab', (computedId, data) => {
      const tabIndex = state.tabs.findIndex((tab) => tab.computedId === computedId)
      data.isActive = state.tabs[tabIndex].isActive
      state.tabs[tabIndex] = data
    })

    provide('deleteTab', (computedId) => {
      const tabIndex = state.tabs.findIndex((tab) => tab.computedId === computedId)
      state.tabs.splice(tabIndex, 1)
    })

    const storageKey = () =>
      `leapsight-tabs.cache.${window.location.host}${window.location.pathname}`

    const selectTab = (selectedTabHash, event) => {
      if (event && !props.options.useUrlFragment) {
        event.preventDefault()
      }

      const selectedTab = findTab(selectedTabHash)
      if (!selectedTab) return

      if (event && selectedTab.isDisabled) {
        event.preventDefault()
        return
      }

      if (state.lastActiveTabHash === selectedTab.hash) {
        context.emit('clicked', { tab: selectedTab })
        return
      }

      state.tabs.forEach((tab) => {
        tab.isActive = tab.hash === selectedTab.hash
      })

      context.emit('changed', { tab: selectedTab })

      state.lastActiveTabHash = state.activeTabHash = selectedTab.hash

      expiringStorage.set(storageKey(), selectedTab.hash, props.cacheLifetime)
    }

    const findTab = (hash) => state.tabs.find((tab) => tab.hash === hash)

    onMounted(() => {
      if (!state.tabs.length) return

      window.addEventListener('hashchange', () => selectTab(window.location.hash))

      if (findTab(window.location.hash)) {
        selectTab(window.location.hash)
        return
      }

      const previousSelectedTabHash = expiringStorage.get(storageKey())
      if (findTab(previousSelectedTabHash)) {
        selectTab(previousSelectedTabHash)
        return
      }

      if (props.options.defaultTabHash && findTab('#' + props.options.defaultTabHash)) {
        selectTab('#' + props.options.defaultTabHash)
        return
      }

      selectTab(state.tabs[0].hash)
    })

    return {
      ...toRefs(state),
      selectTab,
      findTab
    }
  }
}
</script>
