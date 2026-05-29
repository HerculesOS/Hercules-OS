import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getCourseDurationDays,
  getDefaultEndDateForDuration,
} = await import('../lib/bookingDates.ts')

describe('booking date helpers', () => {
  it('sets inclusive end dates from duration days', () => {
    assert.equal(getDefaultEndDateForDuration('2026-05-29', 1), '2026-05-29')
    assert.equal(getDefaultEndDateForDuration('2026-05-29', 3), '2026-05-31')
  })

  it('normalizes invalid course durations to one day', () => {
    assert.equal(getCourseDurationDays({ duration_days: 2 }), 2)
    assert.equal(getCourseDurationDays({ duration_days: 0 }), 1)
    assert.equal(getCourseDurationDays({ duration_days: 'abc' }), 1)
  })
})
