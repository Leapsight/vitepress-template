/**
 * Named code groups: which tab each `::: code-group NAME` shows.
 *
 * The config kit marks such a group with `data-ls-sync="NAME"`
 * (registerCodeGroupSync in theme/config/markdown.js). A tab's value is its
 * label in lower case, so `[Erlang]` is `erlang`.
 *
 * The reader's choice is kept in localStorage under `ls-code-group.NAME`: it
 * stays in the reader's browser and is never sent anywhere. Where storage is
 * unavailable the groups on a page still follow each other; the choice just
 * does not outlive the page.
 *
 * A link can carry a choice as a query parameter named after the group:
 * `?NAME=value`. While it is in the address it comes before the stored
 * choice, group by group: a group that lacks the link's tab shows the stored
 * one, and a group that has neither keeps the tab it shows. Opening such a
 * link stores nothing.
 *
 * VitePress owns the group's markup and switches a clicked group itself
 * (useCodeGroups in its client); this moves groups the same way: the radio's
 * `checked` and the `active` class on the block at the same index.
 *
 * THIS FUNCTION MUST STAY SELF-CONTAINED — no imports, nothing from module
 * scope. It runs in two places from one source: imported by
 * code-group-sync.ts, and serialised with toString() by the config kit into
 * an inline <head> script (theme/config/index.js), which is how the choice
 * is on screen before the first paint.
 *
 * Tested in a real browser against the built starter by
 * theme/test/code-group-sync.browser.mjs.
 */
export function codeGroupChoices() {
  const GROUP = '[data-ls-sync]'
  const PREFIX = 'ls-code-group.'

  const nameOf = (group) => group.getAttribute('data-ls-sync')
  const labelsOf = (group) => Array.from(group.querySelectorAll(':scope > .tabs > label'))
  const inputsOf = (group) => group.querySelectorAll(':scope > .tabs > input')
  const valueOf = (label) => (label.dataset.title || '').trim().toLowerCase()

  // localStorage itself throws when the browser blocks site data.
  function read(name) {
    try {
      return localStorage.getItem(PREFIX + name)
    } catch {
      return null
    }
  }

  function write(name, value) {
    try {
      localStorage.setItem(PREFIX + name, value)
    } catch {
      // Nothing to keep it in.
    }
  }

  function linkChoice(name) {
    const value = new URLSearchParams(location.search).get(name)
    return value ? value.trim().toLowerCase() : null
  }

  /** The values to try for a name, in order: the link's, then the stored one. */
  function wanted(name) {
    return [linkChoice(name), read(name)].filter(Boolean)
  }

  /** Index of the first of `values` that `group` has a tab for, or -1. */
  function indexFor(group, values) {
    const have = labelsOf(group).map(valueOf)
    for (const value of values) {
      const index = have.indexOf(value)
      if (index >= 0) return index
    }
    return -1
  }

  function showIndex(group, index) {
    const blocks = group.querySelector(':scope > .blocks')
    if (index < 0 || !blocks) return
    inputsOf(group)[index].checked = true
    Array.from(blocks.children).forEach((block, i) => block.classList.toggle('active', i === index))
  }

  /** Show the tab with `value` in every group named `name`, except `except`. */
  function showEverywhere(name, value, except) {
    document.querySelectorAll(GROUP).forEach((group) => {
      if (group !== except && nameOf(group) === name) showIndex(group, indexFor(group, [value]))
    })
  }

  /** Put every named group now in the page on the wanted tab. */
  function applyAll() {
    const byName = {}
    document.querySelectorAll(GROUP).forEach((group) => {
      const name = nameOf(group)
      showIndex(group, indexFor(group, byName[name] || (byName[name] = wanted(name))))
    })
  }

  /**
   * For the inline <head> script: set each group as the HTML parser reaches
   * it, so the page is never painted on another tab and nothing shifts after
   * load. A block arrives after its group's tabs, so the wanted index is
   * known by then; each block is switched on or off as it is inserted.
   * Mutation records are delivered before the browser next renders.
   *
   * Does nothing for a reader with no stored choice and no query string.
   */
  function applyWhileParsing() {
    let any = !!location.search
    try {
      for (let i = 0; !any && i < localStorage.length; i++) any = localStorage.key(i).startsWith(PREFIX)
    } catch {
      // Storage refused: only a link can carry a choice.
    }
    if (!any) return

    const byName = {}
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const block of record.addedNodes) {
          const blocks = block.parentElement
          const group = blocks && blocks.parentElement
          if (block.nodeType !== 1 || !group || !blocks.classList.contains('blocks') || !group.matches(GROUP)) continue
          const name = nameOf(group)
          const index = indexFor(group, byName[name] || (byName[name] = wanted(name)))
          if (index < 0) continue
          const at = Array.prototype.indexOf.call(blocks.children, block)
          block.classList.toggle('active', at === index)
          if (at === index) inputsOf(group)[index].checked = true
        }
      }
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    document.addEventListener('DOMContentLoaded', () => observer.disconnect())
  }

  return { GROUP, nameOf, labelsOf, valueOf, write, showEverywhere, applyAll, applyWhileParsing }
}
