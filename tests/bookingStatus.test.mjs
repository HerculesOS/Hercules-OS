import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  getBookingEndDateTime,
  getComputedBookingStatus,
  hasBookingEnded,
} from '../lib/bookingStatus.ts'

describe('booking status helpers', () => {
  it('keeps future bookings on their normal status', () => {
    const status = getComputedBookingStatus(
      { status: 'scheduled', date: '2026-07-15', end_time: '17:00' },
      new Date(2026, 6, 14, 12, 0)
    )

    assert.equal(status, 'scheduled')
  })

  it('does not complete a booking ending later today', () => {
    const status = getComputedBookingStatus(
      { status: 'confirmed', date: '2026-07-14', end_time: '17:00' },
      new Date(2026, 6, 14, 12, 0)
    )

    assert.equal(status, 'confirmed')
  })

  it('completes a booking ending earlier today', () => {
    const status = getComputedBookingStatus(
      { status: 'scheduled', date: '2026-07-14', end_time: '09:30' },
      new Date(2026, 6, 14, 12, 0)
    )

    assert.equal(status, 'completed')
  })

  it('completes a past booking with no end time at the end of the booking date', () => {
    assert.equal(
      hasBookingEnded(
        { status: 'scheduled', date: '2026-07-14' },
        new Date(2026, 6, 14, 12, 0)
      ),
      false
    )

    assert.equal(
      getComputedBookingStatus(
        { status: 'scheduled', date: '2026-07-14' },
        new Date(2026, 6, 15, 0, 1)
      ),
      'completed'
    )
  })

  it('completes multi-day bookings only after end date and end time', () => {
    const booking = {
      status: 'scheduled',
      date: '2026-07-14',
      end_date: '2026-07-16',
      end_time: '16:30',
    }

    assert.equal(
      getComputedBookingStatus(booking, new Date(2026, 6, 16, 12, 0)),
      'scheduled'
    )
    assert.equal(
      getComputedBookingStatus(booking, new Date(2026, 6, 16, 17, 0)),
      'completed'
    )
  })

  it('uses the final non-consecutive session to decide completion', () => {
    const booking = {
      status: 'scheduled',
      date: '2026-09-01',
      end_date: '2026-09-15',
      end_time: '16:00',
      booking_sessions: [
        { session_date: '2026-09-01', end_time: '16:00', sort_order: 1 },
        { session_date: '2026-09-08', end_time: '16:00', sort_order: 2 },
        { session_date: '2026-09-15', end_time: '16:00', sort_order: 3 },
      ],
    }

    assert.equal(
      getComputedBookingStatus(booking, new Date(2026, 8, 9, 12, 0)),
      'scheduled'
    )
    assert.equal(
      getComputedBookingStatus(booking, new Date(2026, 8, 15, 17, 0)),
      'completed'
    )
  })

  it('keeps cancelled bookings cancelled after their end time', () => {
    const status = getComputedBookingStatus(
      { status: 'cancelled', date: '2026-07-13', end_time: '17:00' },
      new Date(2026, 6, 14, 12, 0)
    )

    assert.equal(status, 'cancelled')
  })

  it('falls back to date when end date is missing', () => {
    const endDateTime = getBookingEndDateTime({
      date: '2026-07-14',
      end_time: '15:00',
    })

    assert.equal(endDateTime?.getFullYear(), 2026)
    assert.equal(endDateTime?.getMonth(), 6)
    assert.equal(endDateTime?.getDate(), 14)
    assert.equal(endDateTime?.getHours(), 15)
  })
})
