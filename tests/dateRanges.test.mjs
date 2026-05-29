import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getDaysUntilLocalDate,
  isLocalDateWithinNextDays,
} = await import('../lib/dateRanges.ts')

describe('date range helpers', () => {
  const today = new Date(2026, 4, 29, 23, 30)

  it('counts a date-only value for today as 0 days even late in the day', () => {
    assert.equal(getDaysUntilLocalDate('2026-05-29', today), 0)
  })

  it('checks inclusive upcoming date ranges', () => {
    assert.equal(isLocalDateWithinNextDays('2026-05-29', 90, today), true)
    assert.equal(isLocalDateWithinNextDays('2026-08-27', 90, today), true)
    assert.equal(isLocalDateWithinNextDays('2026-08-28', 90, today), false)
    assert.equal(isLocalDateWithinNextDays('2026-05-28', 90, today), false)
  })
})
