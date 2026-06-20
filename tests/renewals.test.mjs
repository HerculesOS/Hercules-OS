import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  buildRenewalOpportunities,
  canSendRenewalReminder,
  getRenewalReminderSkipReason,
  getRenewalSummary,
  getRenewalWindow,
  groupRenewalOpportunitiesByClient,
} = await import('../lib/renewals.ts')

describe('renewal helpers', () => {
  const today = new Date(2026, 5, 20)

  it('calculates renewal windows', () => {
    assert.deepEqual(getRenewalWindow('2026-06-19', today), {
      window: 'expired',
      daysUntilExpiry: -1,
    })
    assert.deepEqual(getRenewalWindow('2026-07-20', today), {
      window: '30',
      daysUntilExpiry: 30,
    })
    assert.deepEqual(getRenewalWindow('2026-08-19', today), {
      window: '60',
      daysUntilExpiry: 60,
    })
    assert.deepEqual(getRenewalWindow('2026-09-18', today), {
      window: '90',
      daysUntilExpiry: 90,
    })
    assert.equal(getRenewalWindow('2026-09-19', today).window, 'future')
  })

  it('groups renewal opportunities by client', () => {
    const opportunities = buildRenewalOpportunities(
      [
        { id: 'cert-1', delegate_id: 'delegate-1', expiry_date: '2026-07-01' },
        { id: 'cert-2', delegate_id: 'delegate-2', expiry_date: '2026-07-10' },
      ],
      [
        { id: 'delegate-1', client_id: 'client-1', email: 'a@example.com' },
        { id: 'delegate-2', client_id: 'client-1', email: 'b@example.com' },
      ],
      [{ id: 'client-1', company: 'Blackleaf' }],
      today
    )

    const groups = groupRenewalOpportunitiesByClient(opportunities)

    assert.equal(groups.length, 1)
    assert.equal(groups[0].label, 'Blackleaf')
    assert.equal(groups[0].opportunities.length, 2)
  })

  it('summarises affected clients and renewal delegates', () => {
    const opportunities = buildRenewalOpportunities(
      [
        { id: 'cert-1', delegate_id: 'delegate-1', expiry_date: '2026-06-19' },
        { id: 'cert-2', delegate_id: 'delegate-2', expiry_date: '2026-07-10' },
        { id: 'cert-3', delegate_id: 'delegate-3', expiry_date: '2026-08-10' },
      ],
      [
        { id: 'delegate-1', client_id: 'client-1' },
        { id: 'delegate-2', client_id: 'client-1' },
        { id: 'delegate-3', client_id: 'client-2' },
      ],
      [
        { id: 'client-1', company: 'Blackleaf' },
        { id: 'client-2', company: 'Whiteleaf' },
      ],
      today
    )

    assert.deepEqual(getRenewalSummary(opportunities), {
      expired: 1,
      within30: 1,
      within60: 1,
      within90: 0,
      clientsAffected: 2,
      potentialRenewalDelegates: 3,
    })
  })

  it('checks reminder eligibility and skip reasons', () => {
    assert.equal(
      canSendRenewalReminder(
        { id: 'cert-1', expiry_reminder_sent_at: null },
        { id: 'delegate-1', email: 'learner@example.com' }
      ),
      true
    )
    assert.equal(
      getRenewalReminderSkipReason(
        { id: 'cert-2', expiry_reminder_sent_at: null },
        { id: 'delegate-2', email: '' }
      ),
      'missing_email'
    )
    assert.equal(
      getRenewalReminderSkipReason(
        { id: 'cert-3', expiry_reminder_sent_at: '2026-06-01T10:00:00Z' },
        { id: 'delegate-3', email: 'learner@example.com' }
      ),
      'already_reminded'
    )
  })
})
