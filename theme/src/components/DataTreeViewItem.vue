<!-- Recursive child of <DataTreeView>. Not registered globally. -->
<template>
  <div class="data-tree-item">
    <div v-if="data.type === 'object' || data.type === 'array'" :style="valueStyle">
      <div v-if="data.key != '/'" class="data-key">
        <code class="property">{{ data.key }}</code>
        <span v-if="data.type === 'array'" class="value-type">
          {{ data.type + '[' + data.arrayType + ']' }}
        </span>
        <span v-else class="value-type">{{ data.type }}</span>
        <span v-if="data.required" class="value-tag red">REQUIRED</span>
        <span v-if="isImmutable" class="value-tag">IMMUTABLE</span>
        <span v-if="data.computed" class="value-tag">COMPUTED</span>
        <div class="object-description" v-html="md.render(data.description || '')"></div>
        <div
          v-if="data.default"
          class="object-default"
          v-html="md.renderInline('_Default:_ ' + data.default)"
        ></div>
        <button
          v-if="data.type === 'object' || data.arrayType === 'object' || data.arrayType === 'array'"
          class="property-toggle"
          :aria-expanded="state.open ? 'true' : 'false'"
          @click.stop="toggleOpen"
        >
          <div :class="classes"></div>
          {{ state.open ? 'Hide properties' : 'Show properties' }}
        </button>
      </div>

      <DataTreeViewItem
        v-show="state.open"
        v-for="child in data.children"
        :key="getKey(child)"
        :data="child"
        :maxDepth="maxDepth"
        :canSelect="canSelect"
        @selected="bubbleSelected"
      />
    </div>
    <div
      v-else
      :style="valueStyle"
      :class="valueClasses"
      :role="canSelect ? 'button' : undefined"
      :tabindex="canSelect ? '0' : undefined"
      @click="onClick(data)"
      @keyup.enter="onClick(data)"
      @keyup.space="onClick(data)"
    >
      <span class="value-key"><code class="property">{{ data.key }}</code></span>
      <span v-if="isValueType(data.type)" class="value-type">{{ data.type }}</span>
      <span v-else class="value-type">
        <a :href="slug">{{ data.type }}</a>
      </span>
      <span v-if="data.required" class="value-tag red">REQUIRED</span>
      <span v-if="isImmutable" class="value-tag">IMMUTABLE</span>
      <span v-if="data.computed" class="value-tag">COMPUTED</span>
      <div class="value-description" v-html="md.render(data.description || '')" />
      <div
        v-if="data.default"
        class="value-default"
        v-html="md.renderInline('_Default:_ ' + data.default)"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, reactive } from 'vue'
import type { PropType } from 'vue'
import MarkdownIt from 'markdown-it'
import { applyBase } from '../lib/apply-base'
import Container from 'markdown-it-container'
import slugify from '../lib/slugify'

export interface SelectedData {
  key: string
  value: string
  path: string
}

export type ItemData = {
  key: string
  type: string
  arrayType?: string
  required?: boolean
  mutable?: boolean
  computed?: boolean
  description?: string
  default?: string
  path: string
  depth: number
  length?: number
  children?: ItemData[]
}

const VALUE_TYPES = ['any', 'integer', 'bigInt', 'bigint', 'boolean', 'string', 'undefined']

export default defineComponent({
  name: 'DataTreeViewItem',
  props: {
    data: {
      required: true,
      type: Object as PropType<ItemData>
    },
    maxDepth: {
      type: Number,
      required: false,
      default: 1
    },
    canSelect: {
      type: Boolean,
      required: false,
      default: false
    }
  },
  emits: ['selected'],
  setup(props, context) {
    const state = reactive({
      open: props.data.depth < 1
    })

    function toggleOpen(): void {
      state.open = !state.open
    }

    function onClick(data: ItemData): void {
      if (!props.canSelect) return
      context.emit('selected', {
        key: data.key,
        value: (data as any).value,
        path: data.path
      } as SelectedData)
    }

    function bubbleSelected(data: unknown): void {
      context.emit('selected', data)
    }

    function getKey(itemData: ItemData): string {
      const keyValue = Number(itemData.key)
      return !isNaN(keyValue) ? `${itemData.key}"` : `"${itemData.key}"`
    }

    function isValueType(value: string): boolean {
      return value.startsWith('()') || VALUE_TYPES.includes(value)
    }

    // Descriptions may carry markdown (including `::: info` blocks).
    const md = new MarkdownIt()

    // This is a standalone markdown-it instance, so VitePress never sees its
    // links and never applies the site `base` to them: a description saying
    // `[user](/reference/wamp_api/user)` rendered that href verbatim and 404'd
    // on any sub-path deployment. applyBase() leaves external URLs, relative
    // paths and bare hash anchors alone.
    const renderLinkOpen =
      md.renderer.rules.link_open ??
      ((tokens: any[], idx: number, opts: any, _env: any, self: any) =>
        self.renderToken(tokens, idx, opts))
    md.renderer.rules.link_open = (tokens: any[], idx: number, opts: any, env: any, self: any) => {
      const href = tokens[idx].attrGet('href')
      if (href) tokens[idx].attrSet('href', applyBase(href))
      return renderLinkOpen(tokens, idx, opts, env, self)
    }
    md.use(Container, 'info', {
      validate: (params: string) => params.trim().match(/^info(?:\s.+)?$/),
      render: (tokens: any[], idx: number) => {
        const m = tokens[idx].info.trim().match(/^info(?:\s+(.+))?$/)
        if (tokens[idx].nesting === 1) {
          const title = md.renderInline((m && m[1]) || 'INFO')
          return `<div class="info custom-block"><p class="custom-block-title">${title}</p>\n`
        }
        return `</div>\n`
      }
    })

    const classes = computed(() => ({
      'chevron-arrow': true,
      opened: state.open
    }))
    const valueClasses = computed(() => ({
      'value-key': true,
      'can-select': props.canSelect
    }))
    const valueStyle = computed(() => {
      if (props.data.depth > 1) {
        const margin = (props.data.depth - 1) * 36
        return `margin-left:${margin}px; border-left: 1px solid var(--vp-c-divider);`
      }
      return ''
    })

    const slug = computed(() => '#' + slugify(props.data.type))

    const isImmutable = computed(() => {
      const isMutable = props.data.mutable ?? true
      const isComputed = props.data.computed ?? false
      return !isMutable || isComputed
    })

    return {
      state,
      toggleOpen,
      onClick,
      bubbleSelected,
      getKey,
      isValueType,
      classes,
      valueStyle,
      valueClasses,
      isImmutable,
      slug,
      md
    }
  }
})
</script>

<style>
.data-tree-item:not(.root-item) {
  border-left-color: var(--vp-c-divider);
}
.value-key {
  font-size: 16px;
  border-radius: 2px;
  white-space: nowrap;
  padding: 5px 5px 5px 10px;
}
.value-type {
  font-size: 15px;
  font-family: var(--vp-font-family-mono);
  font-weight: 400;
  margin-left: 5px;
  margin-right: 10px;
  border-radius: 2px;
  white-space: nowrap;
  color: var(--vp-c-text-2);
}
.value-description,
.object-description {
  border-radius: 2px;
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0.15px;
  padding: 5px 5px 5px 10px;
  white-space: normal;
}
.value-description {
  margin-left: 10px;
}
.value-description code,
.value-default code,
.object-description code,
.object-default code {
  background-color: transparent !important;
  font-size: 0.95em !important;
}
.value-description th,
.object-description th {
  font-size: 0.95em !important;
}
.value-default,
.object-default {
  font-size: 15px;
  border-radius: 2px;
  font-weight: 400;
  letter-spacing: 0.15px;
  padding: 0px 5px 5px 10px;
  white-space: normal;
}
.value-default {
  margin-left: 10px;
}
.value-key.can-select {
  cursor: pointer;
}
.value-key.can-select:hover {
  background-color: rgba(0, 0, 0, 0.08);
}
.value-key.can-select:focus {
  outline: 2px solid var(--jtv-hover-color);
}
.value-tag {
  font-size: 14px;
  margin-right: 10px;
  font-family: var(--vp-font-family-mono);
}
.value-tag.red {
  color: var(--vp-c-danger-1, #bd4b27);
}
.data-key {
  margin-left: 15px;
  font-size: 16px;
  align-items: center;
  background-color: transparent;
  border-radius: 2px;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: block;
  font-family: inherit;
  font-weight: inherit;
  padding: 5px;
  white-space: nowrap;
  width: 100%;
}
.property-toggle {
  align-items: center;
  background-color: transparent;
  border-radius: 2px;
  border: 0;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: 15px;
  font-weight: inherit;
  margin-left: 5px;
  padding: 5px;
  padding-left: 0px;
  white-space: nowrap;
  width: 100%;
}
.chevron-arrow {
  flex-shrink: 0;
  border-right: 2px solid var(--jtv-arrow-color);
  border-bottom: 2px solid var(--jtv-arrow-color);
  width: var(--jtv-arrow-size);
  height: var(--jtv-arrow-size);
  margin-right: 10px;
  margin-left: 5px;
  transform: rotate(-45deg);
}
.chevron-arrow.opened {
  margin-top: -3px;
  transform: rotate(45deg);
}
</style>
