import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getCourseDurationDays,
  getDefaultEndDateForDuration,
} = await import('../lib/bookingDates.ts')

const {
  bookingOccursOnDate,
  createDefaultBookingSessions,
  getBookingLegacyDateFieldsFromSessions,
  getBookingSessionDateSummary,
  getBookingSessionDatesText,
  isBookingSessionRangeConsecutive,
} = await import('../lib/bookingSessions.ts')

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

  it('generates default consecutive course sessions from duration days', () => {
    assert.deepEqual(createDefaultBookingSessions('2026-09-01', 3, '09:00', '16:30'), [
      {
        session_date: '2026-09-01',
        start_time: '09:00',
        end_time: '16:30',
        sort_order: 1,
      },
      {
        session_date: '2026-09-02',
        start_time: '09:00',
        end_time: '16:30',
        sort_order: 2,
      },
      {
        session_date: '2026-09-03',
        start_time: '09:00',
        end_time: '16:30',
        sort_order: 3,
      },
    ])
  })

  it('summarises one-day and consecutive multi-day sessions', () => {
    const formatDate = (value) => value

    assert.equal(
      getBookingSessionDateSummary(
        { booking_sessions: createDefaultBookingSessions('2026-09-01', 1) },
        formatDate
      ),
      '2026-09-01'
    )

    assert.equal(
      getBookingSessionDateSummary(
        { booking_sessions: createDefaultBookingSessions('2026-09-01', 3) },
        formatDate
      ),
      '2026-09-01 - 2026-09-03'
    )
  })

  it('summarises non-consecutive session dates as course days', () => {
    const booking = {
      booking_sessions: [
        { session_date: '2026-09-01', sort_order: 1 },
        { session_date: '2026-09-08', sort_order: 2 },
        { session_date: '2026-09-15', sort_order: 3 },
      ],
    }

    assert.equal(
      getBookingSessionDateSummary(booking, (value) => value),
      '3 course days'
    )
    assert.equal(isBookingSessionRangeConsecutive(booking), false)
  })

  it('lists actual non-consecutive course dates for email placeholders', () => {
    const booking = {
      booking_sessions: [
        { session_date: '2026-09-01', start_time: '09:00', end_time: '16:00' },
        { session_date: '2026-09-08', start_time: '09:00', end_time: '16:00' },
      ],
    }

    assert.equal(
      getBookingSessionDatesText(
        booking,
        (value) => value,
        (start, end) => `${start}-${end}`
      ),
      'Day 1: 2026-09-01, 09:00-16:00; Day 2: 2026-09-08, 09:00-16:00'
    )
  })

  it('uses actual session dates for calendar display, not the whole range', () => {
    const booking = {
      date: '2026-09-01',
      end_date: '2026-09-15',
      booking_sessions: [
        { session_date: '2026-09-01' },
        { session_date: '2026-09-08' },
        { session_date: '2026-09-15' },
      ],
    }

    assert.equal(bookingOccursOnDate(booking, '2026-09-08'), true)
    assert.equal(bookingOccursOnDate(booking, '2026-09-09'), false)
  })

  it('keeps legacy booking fields aligned to first and final sessions', () => {
    assert.deepEqual(
      getBookingLegacyDateFieldsFromSessions([
        { session_date: '2026-09-01', start_time: '09:00', end_time: '16:00' },
        { session_date: '2026-09-15', start_time: '10:00', end_time: '15:00' },
      ]),
      {
        date: '2026-09-01',
        end_date: '2026-09-15',
        start_time: '09:00',
        end_time: '15:00',
      }
    )
  })
})
