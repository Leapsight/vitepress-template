// SPDX-License-Identifier: Apache-2.0

import { computed, inject } from 'vue'
import { useData, useRoute } from 'vitepress'
import { POSTS_KEY } from './types'
import type { PostSummary } from './types'

/** All posts (date-sorted), provided by the site theme via `withBlog`. */
export function usePosts(): PostSummary[] {
  return inject<PostSummary[]>(POSTS_KEY, [])
}

function normKey(p: string): string {
  if (!p) return '/'
  const r = p.replace(/\.html$/, '')
  return r === '/' ? '/' : r.replace(/\/+$/, '')
}

/** The post whose URL matches the current route, if any. */
export function useCurrentPost() {
  const posts = usePosts()
  const route = useRoute()
  const { site } = useData()
  return computed<PostSummary | null>(() => {
    const base = site.value.base
    let path = route.path
    if (base && base !== '/' && path.startsWith(base)) path = '/' + path.slice(base.length)
    const key = normKey(path)
    return posts.find((p) => normKey(p.url) === key) ?? null
  })
}
