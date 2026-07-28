# Blogging

Blog capability is two parts of `@leapsight/vitepress-template`, layered on the theme:

- **`@leapsight/vitepress-template/kb`** — the vocabulary-agnostic knowledge-graph layer
  (loader, ontology, SHACL gate, typed edges, backlinks, graph view). See
  [KNOWLEDGE-GRAPH.md](./KNOWLEDGE-GRAPH.md).
- **`@leapsight/vitepress-template/blog`** — blog features on top of it: a schema.org
  preset for the KB layer, post/taxonomy/archive components, feeds, JSON-LD +
  OG meta, and Zod-validated frontmatter.

The `blog-starter/` package is a complete, working example. Copy it to start a
new blog.

## Wiring (what a blog site needs)

Four files, all present in `blog-starter/`:

**`.vitepress/posts.data.ts`** — the post index:
```ts
import { createPostsLoader } from '@leapsight/vitepress-template/blog/config'
import type { PostSummary } from '@leapsight/vitepress-template/blog'
declare const data: PostSummary[]
export { data }
export default createPostsLoader({ pattern: 'posts/*.md' })
```

**`.vitepress/kb.data.ts`** — the knowledge graph (schema.org preset):
```ts
import { createKbLoader } from '@leapsight/vitepress-template/kb/loader'
import { blogKbConfig } from '@leapsight/vitepress-template/blog/config'
export default createKbLoader(blogKbConfig({
  siteNamespace: 'https://blog.example.com/kb/',
  idPrefix: 'post',
  namespaces: { bondydoc: 'https://bondy.io/kb/' }, // cross-linked sites
  enforce: true
}))
```

**`.vitepress/theme/index.ts`** — compose theme → blog → KB:
```ts
import Theme from '@leapsight/vitepress-template/theme'
import { withKb } from '@leapsight/vitepress-template/kb'
import { withBlog, blogKbUi } from '@leapsight/vitepress-template/blog'
import { data as kbData } from '../kb.data'
import { data as posts } from '../posts.data'
import './brand.css'
export default withKb(withBlog(Theme, posts), kbData, blogKbUi)
```

**`.vitepress/config.ts`** — feeds + JSON-LD/OG + typed-edge markdown:
```ts
export default defineConfig(withThemeDefaults(withKbDefaults({
  title: 'Acme Blog',
  transformPageData: blogTransformPageData({ hostname, siteNamespace, organization }),
  async buildEnd(cfg) { await emitFeeds(cfg, { hostname, pattern: 'posts/*.md' }) }
}, { context: blogContext({ idPrefix, siteNamespace, namespaces }) })))
```
`withThemeDefaults` already wires `vite.ssr.noExternal` for the whole
`@leapsight/vitepress-template` package (theme, kb, and blog alike, since
they're one package now) — no need to add it yourself.

## Frontmatter contract

| Key | Effect |
| --- | ------ |
| `title` | Post title (required); Zod-validated |
| `date` | Publish date — sorting, feeds, JSON-LD `datePublished` |
| `author` | String or array; byline, author pages, JSON-LD `Person` |
| `tags` | Array; tag pages, `keywords`, tag cloud |
| `description` / `excerpt` | Summary; feeds, OG, listing (auto-derived if absent) |
| `series` / `seriesOrder` | Multi-part series nav |
| `cover` | Social/OG image |
| `featured` | Pin in `<PostList :featured>` |
| `draft` | Renders in dev, excluded from production build/feed/graph |
| `canonical` | Overrides the canonical URL |
| `schema:about`, `schema:mentions`, … | Typed graph edges — see KNOWLEDGE-GRAPH.md |

Invalid frontmatter (missing title, bad canonical URL, …) **fails the build**.

## Components (registered globally)

| Component | Use |
| --------- | --- |
| `<PostList :tag :author :series :featured :page-size :limit />` | Filtered, paginated listing |
| `<PostMeta />` | Byline (date · reading time · authors · tags) — looks up the current post |
| `<TagCloud />` | All tags with counts |
| `<TagPage :tag="$params.tag" />` | Tag archive body (dynamic route) |
| `<AuthorPage :author="$params.author" />` | Author archive body (dynamic route) |
| `<Archive />` | All posts grouped by year |
| `<SeriesNav />` | Parts of the current post's series |
| `<RelatedPosts />` | Ranked by shared tags **and** graph proximity |
| `<ReadingProgress />` | Top scroll-progress bar |
| `<GraphView :height />` | Interactive knowledge-graph view (KB package) |
| `<Backlinks />` | Auto-mounted after every post by `withKb` |

## Taxonomy pages (dynamic routes)

Tag and author pages are generated one-per-term. Each needs a template `.md` +
a `.paths.js`:

```
tags/[tag].md              → <TagPage :tag="$params.tag" />
tags/[tag].paths.js        → export default createTagPaths({ dir: 'posts' })
authors/[author].md        → <AuthorPage :author="$params.author" :name="$params.name" />
authors/[author].paths.js  → export default createAuthorPaths({ dir: 'posts' })
```

## Feeds

`emitFeeds` writes `feed.rss`, `feed.atom`, and `feed.json` (full-content) to
the build output. Advertise them in `config.ts` head if you want autodiscovery:
```ts
head: [['link', { rel: 'alternate', type: 'application/rss+xml', href: '/feed.rss' }]]
```

## Drafts & scheduling

`draft: true` renders in `dev` and is excluded from the production build,
feeds, listings and the graph. A static site can't self-publish on a timer;
for scheduled posts, filter on `date > now` and trigger a rebuild from cron.

## Theming

Same seam as the docs template: override `--vp-c-*` tokens in
`.vitepress/theme/brand.css`. See [THEMING.md](./THEMING.md).
