import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getDashboardActionCounts,
  getMoneySnapshot,
  getOverdueInvoices,
  getTrainingSnapshot,
  getTodaysBookings,
  getUpcomingBookings,
  getBookingsWithIncompleteRegisters,
} = await import('../lib/dashboardCommand.ts')

describe('dashboard command helpers', () => {
  const today = new Date(2026, 5, 21)

  it('finds bookings happening today or in the next 7 days', () => {
    const bookings = [
      { id: 'today', date: '2026-06-21', status: 'scheduled' },
      { id: 'week', date: '2026-06-28', status: 'scheduled' },
      { id: 'later', date: '2026-06-29', status: 'scheduled' },
      { id: 'cancelled', date: '2026-06-22', status: 'cancelled' },
    ]

    assert.deepEqual(
      getUpcomingBookings(bookings, today).map((booking) => booking.id),
      ['today', 'week']
    )
  })

  it('does not treat gaps between non-consecutive sessions as today', () => {
    assert.deepEqual(
      getTodaysBookings(
        [
          {
            id: 'faw',
            date: '2026-09-01',
            end_date: '2026-09-15',
            status: 'scheduled',
            booking_sessions: [
              { session_date: '2026-09-01', sort_order: 1 },
              { session_date: '2026-09-08', sort_order: 2 },
              { session_date: '2026-09-15', sort_order: 3 },
            ],
          },
        ],
        new Date(2026, 8, 9, 12, 0)
      ),
      []
    )
  })

  it('detects overdue unpaid invoices', () => {
    const invoices = [
      { id: 'overdue', due_date: '2026-06-20', status: 'sent' },
      { id: 'paid', due_date: '2026-06-20', status: 'paid' },
      { id: 'future', due_date: '2026-06-22', status: 'sent' },
      { id: 'void', due_date: '2026-06-20', status: 'void' },
      { id: 'cancelled', due_date: '2026-06-20', status: 'cancelled' },
    ]

    assert.deepEqual(
      getOverdueInvoices(invoices, today).map((invoice) => invoice.id),
      ['overdue']
    )
  })

  it('calculates money snapshot values', () => {
    const snapshot = getMoneySnapshot(
      [
        {
          id: 'one',
          total_amount: 100,
          status: 'paid',
          created_at: '2026-06-01',
          paid_at: '2026-06-05',
        },
        {
          id: 'two',
          total_amount: 75,
          status: 'sent',
          created_at: '2026-06-10',
          due_date: '2026-06-20',
        },
        {
          id: 'old',
          total_amount: 50,
          status: 'sent',
          created_at: '2026-05-10',
          due_date: '2026-06-25',
        },
      ],
      today
    )

    assert.equal(snapshot.revenueThisMonth, 175)
    assert.equal(snapshot.paidThisMonth, 100)
    assert.equal(snapshot.outstandingAmount, 125)
    assert.equal(snapshot.overdueCount, 1)
  })

  it('keeps cancelled and void invoices out of outstanding totals', () => {
    const snapshot = getMoneySnapshot(
      [
        { id: 'sent', total_amount: 100, status: 'sent' },
        { id: 'cancelled', total_amount: 75, status: 'cancelled' },
        { id: 'void', total_amount: 50, status: 'void' },
      ],
      today
    )

    assert.equal(snapshot.outstandingAmount, 100)
    assert.equal(snapshot.outstandingCount, 1)
  })

  it('calculates training snapshot values', () => {
    const snapshot = getTrainingSnapshot(
      [{ id: 'booking', date: '2026-06-15' }],
      [{ created_at: '2026-06-10' }, { created_at: '2026-05-10' }],
      [
        {
          id: 'certificate',
          issue_date: '2026-06-11',
          expiry_date: '2026-07-01',
          status: 'valid',
        },
      ],
      today
    )

    assert.equal(snapshot.bookingsThisMonth, 1)
    assert.equal(snapshot.delegatesThisMonth, 1)
    assert.equal(snapshot.certificatesIssuedThisMonth, 1)
    assert.equal(snapshot.expiringSoonCount, 1)
  })

  it('does not count already expired certificates as expiring soon', () => {
    const snapshot = getTrainingSnapshot(
      [],
      [],
      [
        {
          id: 'expired-but-stored-valid',
          expiry_date: '2026-06-20',
          status: 'valid',
        },
        {
          id: 'expires-today',
          expiry_date: '2026-06-21',
          status: 'valid',
        },
      ],
      today
    )

    assert.equal(snapshot.expiringSoonCount, 1)
  })

  it('detects incomplete booking registers', () => {
    const incomplete = getBookingsWithIncompleteRegisters(
      [
        { id: 'complete', status: 'scheduled' },
        { id: 'incomplete', status: 'scheduled' },
      ],
      [
        {
          booking_id: 'complete',
          attendance_status: 'present',
          result_status: 'passed',
        },
        {
          booking_id: 'incomplete',
          attendance_status: 'present',
          result_status: 'not_assessed',
        },
      ]
    )

    assert.deepEqual(incomplete.map((booking) => booking.id), ['incomplete'])
  })

  it('summarises dashboard action counts', () => {
    const counts = getDashboardActionCounts({
      requests: [{ id: 'request', status: 'new' }],
      invoices: [{ id: 'invoice', status: 'sent', due_date: '2026-06-20' }],
      certificates: [
        {
          id: 'cert',
          delegate_id: 'delegate',
          status: 'valid',
          expiry_date: '2026-07-01',
        },
      ],
      bookings: [{ id: 'booking', status: 'scheduled' }],
      bookingDelegateLinks: [
        {
          booking_id: 'booking',
          attendance_status: 'not_marked',
          result_status: 'not_assessed',
        },
      ],
      delegates: [{ id: 'delegate', client_id: 'client' }],
      clients: [{ id: 'client' }],
      today,
    })

    assert.equal(counts.openRequests, 1)
    assert.equal(counts.overdueInvoices, 1)
    assert.equal(counts.expiringSoonCertificates, 1)
    assert.equal(counts.renewalOpportunities, 1)
    assert.equal(counts.incompleteRegisters, 1)
  })
})
