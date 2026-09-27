// Site theme: base theme → blog components → KB graph.
//
//   withBlog  registers post/taxonomy components + provides the posts index
//   withKb    registers backlinks/graph, provides the graph, mounts backlinks,
//             and previews glossary terms in place (`preview.bodies` feeds the
//             expanded panel from kb-bodies.data.ts, loaded on first use)
//
import Theme from '@leapsight/vitepress-template/theme'
import { withKb } from '@leapsight/vitepress-template/kb'
import { withBlog, blogKbUi } from '@leapsight/vitepress-template/blog'
import { data as kbData } from '../kb.data'
import { data as posts } from '../posts.data'
import './brand.css'

export default withKb(withBlog(Theme, posts), kbData, {
  ...blogKbUi,
  preview: { bodies: () => import('../kb-bodies.data').then((m) => m.data) }
})
