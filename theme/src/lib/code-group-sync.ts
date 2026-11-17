/**
 * Named code groups, client side: follows the reader's picks and re-applies
 * the choice on every page shown. What a choice is, where it is kept and how
 * a link carries one are described in code-group-choices.js, which holds the
 * logic shared with the inline <head> script.
 *
 * Picking a tab stores the pick, moves every group of the same name on the
 * page, and, if the address already has a `?NAME=`, rewrites it to match so
 * the address still describes the page. A page opened without the parameter
 * never gains one.
 *
 * Tested in a real browser by theme/test/code-group-sync.browser.mjs,
 * against the built starter and, with DEV=1, against `vitepress dev`.
 */
import { onMounted, onUnmounted } from 'vue'
import { onContentUpdated } from 'vitepress'
import { codeGroupChoices } from './code-group-choices.js'

const choices = codeGroupChoices()

/** Keep a `?NAME=` already in the address in step with the reader's pick. */
function rewriteLinkChoice(name: string, value: string): void {
  const url = new URL(location.href)
  if (!url.searchParams.has(name)) return
  url.searchParams.set(name, value)
  history.replaceState(history.state, '', url)
}

/** The reader picked a tab: keep the choice and move the sibling groups. */
function onChange(event: Event): void {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const group = input.closest(choices.GROUP)
  if (!group || input.parentElement?.parentElement !== group) return
  const label = choices.labelsOf(group).find((l: HTMLLabelElement) => l.htmlFor === input.id)
  if (!label) return

  const name = choices.nameOf(group)
  const value = choices.valueOf(label)
  choices.write(name, value)
  rewriteLinkChoice(name, value)
  // Blocks differ in height, so groups above this one changing tab would
  // push it away from the pointer. Scroll by however far it moved.
  const top = group.getBoundingClientRect().top
  choices.showEverywhere(name, value, group)
  const moved = group.getBoundingClientRect().top - top
  if (moved) window.scrollBy({ top: moved, behavior: 'instant' })
}

/**
 * Call once from the layout's setup. VitePress runs onContentUpdated
 * callbacks when a page's content is mounted, on first load and after each
 * in-app navigation (VitePressContent in its client, read at 1.6.4).
 */
export function useCodeGroupSync(): void {
  onMounted(() => document.addEventListener('change', onChange))
  onUnmounted(() => document.removeEventListener('change', onChange))
  onContentUpdated(choices.applyAll)
}
