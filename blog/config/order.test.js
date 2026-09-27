// node --test blog/config/order.test.js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { newestFirst } from './order.js'

const titles = (posts) => [...posts].sort(newestFirst).map((p) => p.title)

test('a later date wins over a higher seriesOrder', () => {
  assert.deepEqual(titles([
    { title: 'part 9', date: '2026-09-29', seriesOrder: 9 },
    { title: 'next day', date: '2026-09-30', seriesOrder: 1 }
  ]), ['next day', 'part 9'])
})

test('same date: higher seriesOrder first, whatever the input order', () => {
  const parts = [3, 1, 9, 2].map((n) => ({ title: `part ${n}`, date: '2026-09-29', seriesOrder: n }))
  assert.deepEqual(titles(parts), ['part 9', 'part 3', 'part 2', 'part 1'])
  assert.deepEqual(titles([...parts].reverse()), ['part 9', 'part 3', 'part 2', 'part 1'])
})

test('same date: Date objects and ISO strings compare as the same day', () => {
  assert.deepEqual(titles([
    { title: 'part 1', date: new Date('2026-09-29'), seriesOrder: 1 },
    { title: 'part 2', date: '2026-09-29', seriesOrder: 2 }
  ]), ['part 2', 'part 1'])
})

test('same date: a post without seriesOrder comes after the series parts', () => {
  assert.deepEqual(titles([
    { title: 'standalone', date: '2026-09-29' },
    { title: 'part 1', date: '2026-09-29', seriesOrder: 1 }
  ]), ['part 1', 'standalone'])
})

test('same date, no seriesOrder: by title', () => {
  assert.deepEqual(titles([
    { title: 'b', date: '2026-09-29' },
    { title: 'a', date: '2026-09-29' }
  ]), ['a', 'b'])
})

test('a post without a date sorts last', () => {
  assert.deepEqual(titles([
    { title: 'undated', seriesOrder: 9 },
    { title: 'dated', date: '2020-01-01' }
  ]), ['dated', 'undated'])
})
