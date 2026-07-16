import { createPostsLoader } from '@leapsight/vitepress-blog/config'
import type { PostSummary } from '@leapsight/vitepress-blog'

declare const data: PostSummary[]
export { data }

export default createPostsLoader({ pattern: 'posts/*.md' })
