/**
 * Markdown kit — the shared markdown-it setup extracted from
 * bondy_docs/bondy_lang. Registered for you by `withThemeDefaults()`;
 * call `applyMarkdown(md, options)` directly if you assemble your own
 * `markdown.config`.
 *
 * Authoring surface it enables:
 *
 *   ::: tabs            → <Tabs> (add `code` for the code-panel look)
 *   ::: tab NAME        → <Tab name="NAME">
 *   ::: columns / ::: column   → two-column layout (desktop)
 *   ::: definition TITLE       → definition admonition
 *   ::: code-group NAME        → a code group that follows the reader's
 *                                choice for NAME (see registerCodeGroupSync)
 *   ::: button URL             → big centered action button
 *   definition lists, footnotes, task lists
 *   optional KaTeX math (options.math — remember the KaTeX CSS)
 */
import mdDeflist from 'markdown-it-deflist'
import mdFootnote from 'markdown-it-footnote'
import mdTaskLists from 'markdown-it-task-lists'
import mdKatex from 'markdown-it-katex'
import mdContainer from 'markdown-it-container'

/**
 * @param {import('markdown-it')} md
 * @param {{
 *   math?: boolean,
 *   vPreCode?: boolean,
 *   injectTitle?: boolean | ((env: any) => boolean),
 *   containers?: boolean
 * }} [options]
 */
export function applyMarkdown(md, options = {}) {
  const { math = false, vPreCode = true, injectTitle = true, containers = true, base = '/' } = options

  md.use(mdDeflist)
  md.use(mdFootnote)
  md.use(mdTaskLists)

  if (math) {
    md.use(mdKatex)
  }

  if (containers) {
    registerContainers(md, base)
  }

  registerCodeGroupSync(md)

  if (vPreCode) {
    // Inline code is otherwise compiled as a Vue template — content
    // like `{{Kernel, Ok}, 42}` triggers the template parser. `v-pre`
    // opts the element out. (Fenced blocks go through Shiki, which
    // emits inert markup that doesn't need it.)
    md.renderer.rules.code_inline = (tokens, idx) => {
      const token = tokens[idx]
      return `<code v-pre>${md.utils.escapeHtml(token.content)}</code>`
    }
    // Indented (4-space) code blocks need the same treatment.
    md.renderer.rules.code_block = (tokens, idx) => {
      const token = tokens[idx]
      return `<pre v-pre><code>${md.utils.escapeHtml(token.content)}</code></pre>\n`
    }
  }

  if (injectTitle) {
    // Synthesize an `# H1` from frontmatter `title:` when the body
    // doesn't already start with a heading. Lets pages declare their
    // title once, in frontmatter. Pass a predicate to opt pages out — e.g.
    // a blog whose layout renders the post's own title + byline header.
    const shouldInject = typeof injectTitle === 'function' ? injectTitle : () => true
    md.core.ruler.before('normalize', 'ls-inject-title', (state) => {
      const fm = state.env?.frontmatter
      const title = fm?.title?.trim?.()
      if (!title) return
      if (/^\s*#\s/.test(state.src)) return
      if (!shouldInject(state.env)) return
      state.src = `# ${title}\n\n${state.src}`
    })
  }
}

/** @param {import('markdown-it')} md */
/**
 * Prefix a root-absolute URL with the site's `base`.
 *
 * Containers that emit raw HTML bypass VitePress's own link handling — it
 * rewrites markdown-it `link_open` tokens, not HTML strings — so a
 * `::: button /about/contributors` came out base-less and 404'd on any
 * sub-path deployment.
 *
 * The semantics match VitePress's client-side withBase(): external URLs and
 * anything not starting with `/` (relative paths, bare hash anchors) pass
 * through untouched. This has to be a separate implementation because
 * withBase() reads client site data and this runs in Node at build time.
 */
function joinBase(base, link) {
  if (!link) return link
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(link)) return link
  if (!link.startsWith('/')) return link
  return base.replace(/\/$/, '') + link
}

function registerContainers(md, base = '/') {
  // ::: tabs [code]  →  <Tabs class="code?">
  md.use(mdContainer, 'tabs', {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const m = tokens[idx].info.trim().match(/^tabs\s*(.*)$/)
        const variant = m && m[1] ? ` class="${md.utils.escapeHtml(m[1])}"` : ''
        return `<Tabs${variant}>`
      }
      return '</Tabs>\n'
    }
  })

  // ::: tab NAME  →  <Tab name="NAME">
  md.use(mdContainer, 'tab', {
    validate(params) {
      return params.trim().match(/^tab\s+(.*)$/)
    },
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const m = tokens[idx].info.trim().match(/^tab\s+(.*)$/)
        return `<Tab name="${md.utils.escapeHtml(m[1])}">`
      }
      return '</Tab>\n'
    }
  })

  // ::: definition [TITLE]
  md.use(mdContainer, 'definition', {
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const m = tokens[idx].info.trim().match(/^definition\s*(.*)$/)
        const title = md.renderInline((m && m[1]) || 'Definition')
        return `<div class="definition custom-block"><p class="custom-block-title">${title}</p>\n`
      }
      return '</div>\n'
    }
  })

  // ::: columns  /  ::: column
  md.use(mdContainer, 'columns', {
    render(tokens, idx) {
      return tokens[idx].nesting === 1 ? '<div class="column-wrapper">' : '</div>\n'
    }
  })
  md.use(mdContainer, 'column', {
    render(tokens, idx) {
      return tokens[idx].nesting === 1 ? '<div class="column">' : '</div>\n'
    }
  })

  // ::: button URL  →  big centered action button
  md.use(mdContainer, 'button', {
    validate(params) {
      return params.trim().match(/^button\s+(.*)$/)
    },
    render(tokens, idx) {
      if (tokens[idx].nesting === 1) {
        const m = tokens[idx].info.trim().match(/^button\s+(.*)$/)
        const raw = m[1].trim()
        const href = md.utils.escapeHtml(joinBase(base, raw))
        const target = raw.startsWith('http') ? ' target="_blank" rel="noreferrer"' : ''
        return `<div class="action"><a class="ls-button big alt" href="${href}"${target}>`
      }
      return '</a></div>\n'
    }
  })
}

const CODE_GROUP_OPEN = 'container_code-group_open'
const CODE_GROUP_NAME = /^[a-z][a-z0-9-]*$/
const CODE_GROUP_ROOT = '<div class="vp-code-group'

/**
 * `::: code-group NAME` marks VitePress's code group with
 * `data-ls-sync="NAME"`. The client (theme/src/lib/code-group-sync.ts)
 * keeps every group carrying the same NAME on the same tab. A code group
 * with no name is left exactly as VitePress renders it.
 *
 * This wraps VitePress's own renderer rather than replacing it, and
 * depends on two things read in VitePress 1.6.4's source
 * (createCodeGroup and createMarkdownRenderer in dist/node):
 * `markdown.config` runs after the built-in containers are registered, and
 * the group's root is emitted as `<div class="vp-code-group…`. Both are
 * exercised by markdown.test.js against the installed VitePress; if the
 * root markup changes the build throws here instead of dropping the mark.
 *
 * NAME is lower-case letters, digits and hyphens: it is also the URL
 * parameter and the storage key the client uses.
 *
 * @param {import('markdown-it')} md
 */
function registerCodeGroupSync(md) {
  const render = md.renderer.rules[CODE_GROUP_OPEN]
  // Not VitePress's renderer: there is no code group to mark.
  if (!render) return

  md.renderer.rules[CODE_GROUP_OPEN] = (tokens, idx, options, env, self) => {
    const html = render(tokens, idx, options, env, self)
    if (tokens[idx].nesting !== 1) return html

    const name = tokens[idx].info.trim().slice('code-group'.length).trim()
    if (!name) return html
    if (!CODE_GROUP_NAME.test(name)) {
      throw new Error(
        `::: code-group ${name} — the name must be lower-case letters, digits and hyphens, starting with a letter`
      )
    }
    if (!html.startsWith(CODE_GROUP_ROOT)) {
      throw new Error(
        `::: code-group ${name} — VitePress's code-group markup is not the one this theme marks; see registerCodeGroupSync`
      )
    }
    return `<div data-ls-sync="${name}"` + html.slice('<div'.length)
  }
}
