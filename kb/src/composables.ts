// SPDX-License-Identifier: Apache-2.0

import { inject } from 'vue'
import { KB_DATA_KEY, KB_UI_KEY, EMPTY_KB } from './types'
import type { KbData, KbUiConfig } from './types'

/** The KB graph provided by the site theme (empty if the site didn't wire it). */
export function useKbData(): KbData {
  return inject<KbData>(KB_DATA_KEY, EMPTY_KB)
}

/** UI config (labels, order, colors) provided by the site theme. */
export function useKbUi(): KbUiConfig {
  return inject<KbUiConfig>(KB_UI_KEY, {})
}
