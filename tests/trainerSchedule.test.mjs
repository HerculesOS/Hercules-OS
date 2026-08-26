import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getBookingsForTrainer,
  getTrainerRegisterStatus,
  getTrainerWorkloadStats,
  splitTrainerBookings,
} = await import('../lib/trainerSchedule.ts')

describe('trainer schedule helpers', () => {
  const today = new Date(2026, 5, 21)

  it('filters bookings assigned to a trainer', () => {
    const bookings = [
      { id: 'one', trainer_id: 'trainer-1' },
      { id: 'two', trainer_id: 'trainer-2' },
      { id: 'three', trainer_id: 'trainer-1' },
    ]

    assert.deepEqual(
      getBookingsForTrainer(bookings, 'trainer-1').map((booking) => booking.id),
      ['one', 'three']
    )
  })

  it('splits trainer bookings into upcoming and recent', () => {
    const { upcoming, recent } = splitTrainerBookings(
      [
        { id: 'future', date: '2026-06-22', status: 'scheduled' },
        { id: 'today', date: '2026-06-21', status: 'scheduled' },
        { id: 'past', date: '2026-06-20', status: 'scheduled' },
        { id: 'complete', date: '2026-06-25', status: 'completed' },
      ],
      today
    )

    assert.deepEqual(upcoming.map((booking) => booking.id), ['today', 'future'])
    assert.deepEqual(recent.map((booking) => booking.id), ['complete', 'past'])
  })

  it('keeps non-consecutive trainer bookings upcoming until the final session ends', () => {
    const { upcoming, recent } = splitTrainerBookings(
      [
        {
          id: 'faw',
          trainer_id: 'trainer-1',
          date: '2026-09-01',
          end_date: '2026-09-15',
          status: 'scheduled',
          booking_sessions: [
            { session_date: '2026-09-01', end_time: '16:00', sort_order: 1 },
            { session_date: '2026-09-08', end_time: '16:00', sort_order: 2 },
            { session_date: '2026-09-15', end_time: '16:00', sort_order: 3 },
          ],
        },
      ],
      new Date(2026, 8, 9, 12, 0)
    )

    assert.deepEqual(upcoming.map((booking) => booking.id), ['faw'])
    assert.deepEqual(recent, [])
  })

  it('calculates register status for trainer booking rows', () => {
    assert.equal(
      getTrainerRegisterStatus('booking-1', [
        {
          booking_id: 'booking-1',
          attendance_status: 'present',
          result_status: 'passed',
        },
      ]),
      'complete'
    )
    assert.equal(
      getTrainerRegisterStatus('booking-2', [
        {
          booking_id: 'booking-2',
          attendance_status: 'present',
          result_status: 'not_assessed',
        },
      ]),
      'in_progress'
    )
    assert.equal(getTrainerRegisterStatus('booking-3', []), 'not_started')
  })

  it('summarises trainer workload stats', () => {
    assert.deepEqual(
      getTrainerWorkloadStats(2, 3, ['complete', 'in_progress', 'not_started']),
      {
        upcomingCount: 2,
        recentCount: 3,
        completeRegisters: 1,
        incompleteRegisters: 2,
      }
    )
  })
})
