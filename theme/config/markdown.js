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
 *   injectTitle?: boolean,
 *   containers?: boolean
 * }} [options]
 */
export function applyMarkdown(md, options = {}) {
  const { math = false, vPreCode = true, injectTitle = true, containers = true } = options

  md.use(mdDeflist)
  md.use(mdFootnote)
  md.use(mdTaskLists)

  if (math) {
    md.use(mdKatex)
  }

  if (containers) {
    registerContainers(md)
  }

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
    // title once, in frontmatter.
    md.core.ruler.before('normalize', 'ls-inject-title', (state) => {
      const fm = state.env?.frontmatter
      const title = fm?.title?.trim?.()
      if (!title) return
      if (/^\s*#\s/.test(state.src)) return
      state.src = `# ${title}\n\n${state.src}`
    })
  }
}

/** @param {import('markdown-it')} md */
function registerContainers(md) {
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
        const href = md.utils.escapeHtml(m[1])
        const target = href.startsWith('http') ? ' target="_blank" rel="noreferrer"' : ''
        return `<div class="action"><a class="ls-button big alt" href="${href}"${target}>`
      }
      return '</a></div>\n'
    }
  })
}
