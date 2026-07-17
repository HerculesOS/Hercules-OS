import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getComputedInvoiceStatus,
  isInvoiceOutstanding,
  isInvoiceOverdueByDate,
} = await import('../lib/invoiceStatus.ts')

describe('invoice status helpers', () => {
  const today = new Date(2026, 6, 17, 12, 0)

  it('keeps future due invoices on their normal status', () => {
    assert.equal(
      getComputedInvoiceStatus(
        { status: 'sent', due_date: '2026-07-18' },
        today
      ),
      'sent'
    )
  })

  it('does not make invoices due today overdue', () => {
    assert.equal(
      getComputedInvoiceStatus(
        { status: 'sent', due_date: '2026-07-17' },
        today
      ),
      'sent'
    )
    assert.equal(
      isInvoiceOverdueByDate({ due_date: '2026-07-17' }, today),
      false
    )
  })

  it('shows unpaid past due invoices as overdue', () => {
    assert.equal(
      getComputedInvoiceStatus(
        { status: 'sent', due_date: '2026-07-16' },
        today
      ),
      'overdue'
    )
  })

  it('keeps paid invoices paid even when due date has passed', () => {
    assert.equal(
      getComputedInvoiceStatus(
        { status: 'paid', due_date: '2026-07-16' },
        today
      ),
      'paid'
    )
  })

  it('keeps cancelled and void invoices inactive even when overdue by date', () => {
    assert.equal(
      getComputedInvoiceStatus(
        { status: 'cancelled', due_date: '2026-07-16' },
        today
      ),
      'cancelled'
    )
    assert.equal(
      getComputedInvoiceStatus(
        { status: 'void', due_date: '2026-07-16' },
        today
      ),
      'void'
    )
  })

  it('does not auto-overdue invoices without a due date', () => {
    assert.equal(
      getComputedInvoiceStatus({ status: 'draft', due_date: null }, today),
      'draft'
    )
  })

  it('keeps lock state separate from payment status', () => {
    const invoice = {
      status: 'sent',
      due_date: '2026-07-16',
      secured_at: '2026-07-10T09:00:00Z',
    }

    assert.equal(getComputedInvoiceStatus(invoice, today), 'overdue')
    assert.equal(Boolean(invoice.secured_at), true)
    assert.equal(isInvoiceOutstanding(invoice, today), true)
  })
})
