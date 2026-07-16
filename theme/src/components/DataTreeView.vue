<!--
Expandable tree view over a JSON-Schema-like object (adapted from
json-tree-view-vue3 via bondy_docs). Understands `object`, `array`
(with `items`) and scalar nodes, plus per-node metadata:
`required`, `mutable`, `computed`, `description`, `default`.

Usage in markdown (data must be a JSON string):

  <DataTreeView :data="JSON.stringify(schema)" :maxDepth="2" />

Dark mode follows the site theme automatically; pass
`colorScheme="light"|"dark"` to force one.
-->
<template>
  <div class="wrapper-pre"></div>
  <div class="wrapper">
    <DataTreeViewItem
      :class="[{ 'data-tree-item': true, dark: isDarkScheme }]"
      :data="parsed"
      :maxDepth="maxDepth"
      @selected="itemSelected"
    />
  </div>
  <div class="wrapper-post"></div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { useData } from 'vitepress'

import DataTreeViewItem from './DataTreeViewItem.vue'
import type { ItemData } from './DataTreeViewItem.vue'

export default defineComponent({
  name: 'DataTreeView',
  components: { DataTreeViewItem },
  props: {
    data: {
      type: String,
      required: false
    },
    rootKey: {
      type: String,
      required: false,
      default: '/'
    },
    maxDepth: {
      type: Number,
      required: false,
      default: 1
    },
    colorScheme: {
      type: String,
      required: false,
      default: '',
      validator: (value: string) => ['', 'light', 'dark'].indexOf(value) !== -1
    }
  },
  emits: ['selected'],
  setup(props, context) {
    const { isDark } = useData()

    const isDarkScheme = computed(() =>
      props.colorScheme ? props.colorScheme === 'dark' : isDark.value
    )

    function itemSelected(data: unknown): void {
      context.emit('selected', data)
    }

    function build(
      key: string,
      value: any,
      depth: number,
      path: string,
      includeKey: boolean
    ): ItemData {
      if (value instanceof Object) {
        const schemaType = value.type

        if (schemaType === undefined) {
          // root object
          const children = Object.entries(value).map(([childKey, childValue]) =>
            build(childKey, childValue, depth + 1, includeKey ? `${path}${key}.` : `${path}`, true)
          )

          return {
            key,
            type: 'object',
            required: value.required ?? false,
            mutable: value.mutable ?? true,
            computed: value.computed ?? false,
            description: value.description ?? '',
            depth,
            path,
            length: children.length,
            children
          }
        } else if (schemaType === 'array') {
          if (value.items?.type === 'object') {
            const children = Object.entries(value.items.properties ?? {}).map(
              ([childKey, childValue]) =>
                build(childKey, childValue, depth + 1, includeKey ? `${path}${key}.` : `${path}`, true)
            )

            return {
              key,
              type: 'array',
              arrayType: value.items.type,
              required: value.required ?? false,
              mutable: value.mutable ?? true,
              computed: value.computed ?? false,
              description: value.description ?? '',
              default: value.default,
              depth,
              path,
              length: children.length,
              children
            }
          }
          return {
            key,
            type: 'array',
            arrayType: value.items?.type,
            required: value.required ?? false,
            mutable: value.mutable ?? true,
            computed: value.computed ?? false,
            description: value.description ?? '',
            default: value.default,
            path: includeKey ? `${path}${key}` : path.slice(0, -1),
            depth
          }
        } else if (schemaType === 'object') {
          const children = Object.entries(value.properties ?? {}).map(([childKey, childValue]) =>
            build(childKey, childValue, depth + 1, includeKey ? `${path}${key}.` : `${path}`, true)
          )

          return {
            key,
            type: 'object',
            required: value.required ?? false,
            mutable: value.mutable ?? true,
            computed: value.computed ?? false,
            description: value.description ?? '',
            depth,
            path,
            length: children.length,
            children
          }
        }
        // Scalar/value types
        return {
          key,
          type: schemaType,
          required: value.required ?? false,
          mutable: value.mutable ?? true,
          computed: value.computed ?? false,
          description: value.description ?? '',
          default: value.default,
          path: includeKey ? `${path}${key}` : path.slice(0, -1),
          depth
        }
      }

      return {
        key,
        type: 'string',
        path: includeKey ? `${path}${key}` : path.slice(0, -1),
        depth
      }
    }

    const parsed = computed((): ItemData => {
      const json = props.data
      if (json != null) {
        const data = JSON.parse(json)
        if (data instanceof Object) {
          return build(props.rootKey, { ...data }, 0, '', true)
        }
      }
      throw new Error('DataTreeView: not a valid schema object: ' + json)
    })

    return { itemSelected, parsed, isDarkScheme }
  }
})
</script>

<style scoped>
.data-tree-item {
  --jtv-key-color: #0977e6;
  --jtv-valueKey-color: #073642;
  --jtv-string-color: #268bd2;
  --jtv-number-color: #2aa198;
  --jtv-boolean-color: #cb4b16;
  --jtv-null-color: #6c71c4;
  --jtv-arrow-size: 6px;
  --jtv-arrow-color: #444;
  --jtv-hover-color: rgba(0, 0, 0, 0.1);
  margin-left: 0;
  width: 100%;
  height: auto;
}
.data-tree-item.dark {
  --jtv-key-color: #80d8ff;
  --jtv-valueKey-color: #fdf6e3;
  --jtv-hover-color: rgba(255, 255, 255, 0.1);
  --jtv-arrow-color: #fdf6e3;
}
.wrapper-pre {
  float: left;
  height: 1px;
  width: 20px;
  border-style: solid hidden hidden hidden;
  border-top-color: var(--vp-c-divider) !important;
  border-top-width: 1px !important;
}
.wrapper {
  padding: 10px;
  border-left-color: var(--vp-c-divider) !important;
  border-style: hidden hidden hidden solid;
  border-left-width: 1px !important;
}
.wrapper-post {
  float: left;
  height: 1px;
  width: 20px;
  border-style: hidden hidden solid hidden;
  border-bottom-color: var(--vp-c-divider) !important;
  border-bottom-width: 1px !important;
}
</style>
