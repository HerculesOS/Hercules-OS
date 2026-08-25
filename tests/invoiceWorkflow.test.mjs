import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  calculateDefaultInvoiceDueDate,
  getInvoiceEmailSuccessUpdate,
  getSentInvoiceUpdate,
  normalizeOptionalPoNumber,
} = await import('../lib/invoiceWorkflow.ts')

describe('invoice workflow helpers', () => {
  it('uses the course start date when the course starts within 30 days', () => {
    assert.equal(
      calculateDefaultInvoiceDueDate({
        created_at: '2026-09-01T10:00:00Z',
        date: '2026-09-20',
      }),
      '2026-09-20'
    )
  })

  it('uses 30 days from booking creation when the course starts later', () => {
    assert.equal(
      calculateDefaultInvoiceDueDate({
        created_at: '2026-09-01T10:00:00Z',
        date: '2026-10-20',
      }),
      '2026-10-01'
    )
  })

  it('uses the course start date for same-day course bookings', () => {
    assert.equal(
      calculateDefaultInvoiceDueDate({
        created_at: '2026-09-01T10:00:00Z',
        date: '2026-09-01',
      }),
      '2026-09-01'
    )
  })

  it('allows PO numbers to be optional', () => {
    assert.equal(normalizeOptionalPoNumber(''), null)
    assert.equal(normalizeOptionalPoNumber('   '), null)
    assert.equal(normalizeOptionalPoNumber(' PO-123 '), 'PO-123')
  })

  it('marks sent invoices as sent after successful email', () => {
    assert.deepEqual(getInvoiceEmailSuccessUpdate(true, { status: 'draft' }, '2026-08-25T08:00:00Z'), {
      status: 'sent',
      sent_at: '2026-08-25T08:00:00Z',
    })
  })

  it('does not mark invoices as sent after failed email', () => {
    assert.equal(
      getInvoiceEmailSuccessUpdate(false, { status: 'draft' }, '2026-08-25T08:00:00Z'),
      null
    )
  })

  it('does not downgrade paid invoices to sent', () => {
    assert.deepEqual(getSentInvoiceUpdate({ status: 'paid' }, '2026-08-25T08:00:00Z'), {
      sent_at: '2026-08-25T08:00:00Z',
    })
  })
})
