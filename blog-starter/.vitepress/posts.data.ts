import { createPostsLoader } from '@leapsight/vitepress-template/blog/config'
import type { PostSummary } from '@leapsight/vitepress-template/blog'

declare const data: PostSummary[]
export { data }

export default createPostsLoader({ pattern: 'posts/*.md' })
