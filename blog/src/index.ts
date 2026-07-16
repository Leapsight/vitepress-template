// SPDX-License-Identifier: Apache-2.0
//
// Client entry for @leapsight/vitepress-blog. Compose with the theme (and KB):
//
//   // .vitepress/theme/index.ts
//   import Theme from '@leapsight/vitepress-theme'
//   import { withKb } from '@leapsight/vitepress-kb'
//   import { withBlog, blogKbUi } from '@leapsight/vitepress-blog'
//   import { data as kbData } from '../kb.data'
//   import { data as posts } from '../posts.data'
//   export default withKb(withBlog(Theme, posts), kbData, blogKbUi)

import type { Theme as VPTheme } from 'vitepress'
import PostList from './components/PostList.vue'
import PostMeta from './components/PostMeta.vue'
import TagCloud from './components/TagCloud.vue'
import TagPage from './components/TagPage.vue'
import AuthorPage from './components/AuthorPage.vue'
import Archive from './components/Archive.vue'
import SeriesNav from './components/SeriesNav.vue'
import RelatedPosts from './components/RelatedPosts.vue'
import ReadingProgress from './components/ReadingProgress.vue'
import { POSTS_KEY } from './types'
import type { PostSummary } from './types'
import './styles/blog.css'

export {
  PostList,
  PostMeta,
  TagCloud,
  TagPage,
  AuthorPage,
  Archive,
  SeriesNav,
  RelatedPosts,
  ReadingProgress
}
export { usePosts, useCurrentPost } from './composables'
export * from './types'
// Re-export the (client-safe) KB UI preset so sites import it from one place.
export { blogKbUi } from '../config/kb-ui.js'

const BLOG_COMPONENTS = {
  PostList,
  PostMeta,
  TagCloud,
  TagPage,
  AuthorPage,
  Archive,
  SeriesNav,
  RelatedPosts,
  ReadingProgress
}

/**
 * Register blog components globally and provide the posts index to them.
 * @param baseTheme the theme to extend
 * @param posts the array imported from the site's `posts.data.ts`
 */
export function withBlog(baseTheme: VPTheme, posts: PostSummary[]): VPTheme {
  return {
    ...baseTheme,
    enhanceApp(ctx) {
      baseTheme.enhanceApp?.(ctx)
      ctx.app.provide(POSTS_KEY, posts)
      for (const [name, comp] of Object.entries(BLOG_COMPONENTS)) {
        ctx.app.component(name, comp)
      }
    }
  }
}
