# Leapsight VitePress Template

A reusable VitePress setup extracted from `bondy_docs` and
`bondy_lang/docs`. Future documentation sites reuse the same Vue
components, layout and config machinery, changing only **content** and
**CSS tokens**.

## Layout of this repo

| Path | What it is |
| ---- | ---------- |
| `theme/` | `@leapsight/vitepress-theme` — the shared package: layout, Vue components, structural CSS, and a node-side config kit. |
| `kb/` | `@leapsight/vitepress-kb` — vocabulary-agnostic RDF knowledge-graph layer: build-time loader, CURIE ontology, SHACL gate, typed-edge markdown, backlinks + graph-view, JSON-LD emitter. Optional; docs or blog sites opt in. |
| `blog/` | `@leapsight/vitepress-blog` — blog features on top of KB: schema.org `BlogPosting` preset, post/taxonomy/archive/series components, pagination, reading progress, Zod frontmatter, RSS/Atom/JSON feeds, JSON-LD + OG meta. |
| `starter/` | Copyable **docs** starter site (theme only). |
| `blog-starter/` | Copyable **blog** starter site (theme + kb + blog): posts, tags, authors, archive, a live graph, feeds, and cross-site `@id` references. |

The three packages compose: a plain docs site needs only `theme`; a
knowledge-graphed docs site adds `kb`; a blog adds `kb` + `blog`.

## Creating a new site

1. Copy `starter/` into a new repository.
2. Change the `@leapsight/vitepress-theme` dependency from `*` to the
   published version, or a git URL:

   ```json
   "dependencies": {
     "@leapsight/vitepress-theme": "github:leapsight/vitepress-template#path:/theme"
   }
   ```

   (Until the package is published, `npm pack` in `theme/` and install
   the tarball, or use this repo as an npm workspace.)
3. Edit `.vitepress/config.ts` — title, description, nav, sidebar
   sections, versions, metadata, social/edit/footer links.
4. Edit `.vitepress/theme/brand.css` — colors and fonts. This is the
   only styling file a site needs (see [THEMING.md](./THEMING.md)).
5. Replace `public/logo.svg`, add favicons, write content.

```sh
npm install
npm run dev        # docs starter dev server
npm run build      # docs starter static build
npm run dev:blog   # blog starter dev server
npm run build:blog # blog starter static build
```

## Blogging + knowledge graph

To build a blog (or add a knowledge graph to docs), see:

- [BLOGGING.md](./BLOGGING.md) — frontmatter contract, components, feeds,
  taxonomy pages, drafts.
- [KNOWLEDGE-GRAPH.md](./KNOWLEDGE-GRAPH.md) — typed edges, cross-site `@id`
  linking, the SHACL build gate, re-pointing at a custom ontology.

The short version: blog posts become schema.org `BlogPosting` nodes in an RDF
graph; typed edges (`{rel="schema:about"}`, `[[wikilinks]]`, frontmatter
`schema:mentions`) link posts to each other and — by stable `@id` — to content
in other sites. One build-time index drives JSON-LD, backlinks, a graph view,
and graph-proximity related posts, with integrity enforced by a SHACL gate.

## What the theme provides

### Layout behaviours (automatic)

- **DRAFT watermark** — frontmatter `draft: true`
- **Related cards** before the footer — frontmatter `related:` list
- **Navbar version picker** — `themeConfig.versions` (static badge for
  one version, dropdown for several)
- **Back-to-top button** on desktop
- Extra layout slots pass through, so a site can wrap the layout again.

### Components (registered globally)

| Component | Purpose |
| --------- | ------- |
| `<Tabs>` / `<Tab>` | Tabbed content; remembers selection per page. Also via `::: tabs` / `::: tab NAME` containers |
| `<Features>` / `<Feature>` | Feature card grid (same item shape as `related:` frontmatter) |
| `<SectionFeatures path="/guide/">` | Landing-page grid generated from the sidebar (`feature: true` pages) |
| `<CardGrid :cards="[...]">` | Compact card grid with brand accent bar |
| `<DataTreeView :data="json">` | Expandable tree over a JSON-Schema-like object |
| `<ZoomImg src alt width>` | Click-to-zoom image |
| `<Pill text color?>` | Small floated pill label |
| `<SiteMeta k="key">` | Inline value from `themeConfig.metadata` |

### Markdown kit (via `withThemeDefaults`)

Definition lists, footnotes, task lists, optional KaTeX; containers
`::: tabs`, `::: tab`, `::: columns`, `::: column`, `::: definition`,
`::: button URL`; a `v-pre` rule so inline code with `{{ }}` never
breaks Vue; H1 injection from frontmatter `title:`.

### Config kit (`@leapsight/vitepress-theme/config`)

- `withThemeDefaults(config, opts)` — clean URLs, local search,
  markdown kit and `ssr.noExternal` wiring, deep-merged under your
  config.
- `buildContentSidebar(srcDir, '/section')` — filesystem-driven
  sidebar: subdirectories become groups; pages sort by frontmatter
  `order:`; `title`, `description`, `feature` are read from
  frontmatter. A section index with `sidebar_children: false`
  collapses to one link.

### Frontmatter conventions

| Key | Effect |
| --- | ------ |
| `title` | Page + sidebar title; injected as H1 when body has none |
| `order` | Sidebar sort key |
| `description` | Card text on section landing pages |
| `feature: true` | Page appears in `<SectionFeatures>` grids |
| `draft: true` | DRAFT watermark |
| `related:` | Related-cards grid before the footer |

## Deployment

The starter ships config for the static hosts:

- **Netlify** — `netlify.toml` (build command + publish dir)
- **Vercel** — `vercel.json`
- **Cloudflare Pages** — no file needed; set build command
  `npm run build` and output directory `.vitepress/dist` in the
  dashboard.

To serve under a sub-path, set `DOCS_BASE=/subpath/` at build time.

## Developing the theme itself

This repo is an npm workspace: the starter resolves the theme locally,
so `npm run dev` at the root exercises theme changes live. Bump
`theme/package.json` version and publish to roll changes out to sites.
