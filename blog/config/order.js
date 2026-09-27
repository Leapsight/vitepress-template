// SPDX-License-Identifier: Apache-2.0
//
// The one "newest first" order for posts, shared by the post index
// (posts.js), the feeds (feeds.js) and the announcement bar (announce.js), so
// the listing, "latest post" and the feed never disagree.
//
// Date descending; on the same date, `seriesOrder` descending, so part 9 of a
// series published the same day as part 1 is the newer one; a post without a
// `seriesOrder` comes after those with one, as in the series-parts order in
// posts.js; then title. A post without a date sorts last. order.test.js
// covers each tie.

const day = (d) => (d ? new Date(d).toISOString() : '')

/**
 * @param {{ date?: string | Date | null, seriesOrder?: number | null, title?: string }} a
 * @param {{ date?: string | Date | null, seriesOrder?: number | null, title?: string }} b
 */
export function newestFirst(a, b) {
  const da = day(a.date)
  const db = day(b.date)
  if (da !== db) {
    if (!da) return 1
    if (!db) return -1
    return db.localeCompare(da)
  }
  const oa = typeof a.seriesOrder === 'number' ? a.seriesOrder : null
  const ob = typeof b.seriesOrder === 'number' ? b.seriesOrder : null
  if (oa !== ob) {
    if (oa == null) return 1
    if (ob == null) return -1
    return ob - oa
  }
  return (a.title ?? '').localeCompare(b.title ?? '')
}
