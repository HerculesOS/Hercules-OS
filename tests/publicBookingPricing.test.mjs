import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  buildPublicDelegateInvoiceLineDescription,
  getPublicBookingPricingSummary,
  getPublicDelegateInvoiceLineItems,
  getPublicDelegateInvoiceSummary,
} = await import('../lib/publicBookingPricing.ts')

describe('public booking pricing helpers', () => {
  it('summarises public booking revenue and invoiced values', () => {
    const summary = getPublicBookingPricingSummary([
      { id: 'one', unit_price: 95, invoice_id: 'invoice-one' },
      { id: 'two', unit_price: '105.50' },
      { id: 'three', unit_price: 0 },
    ])

    assert.equal(summary.totalCount, 3)
    assert.equal(summary.totalValue, 200.5)
    assert.equal(summary.invoicedCount, 1)
    assert.equal(summary.invoicedValue, 95)
    assert.equal(summary.uninvoicedCount, 2)
    assert.equal(summary.uninvoicedValue, 105.5)
  })

  it('selects only uninvoiced delegates for a public invoice summary', () => {
    const summary = getPublicDelegateInvoiceSummary(
      [
        { id: 'one', client_id: 'client-a', unit_price: 100 },
        { id: 'two', client_id: 'client-a', unit_price: 125, invoice_id: 'invoice-one' },
        { id: 'three', client_id: 'client-a', unit_price: 150 },
      ],
      ['one', 'two']
    )

    assert.equal(summary.selectedCount, 2)
    assert.equal(summary.uninvoicedCount, 1)
    assert.equal(summary.alreadyInvoicedCount, 1)
    assert.equal(summary.totalAmount, 100)
    assert.equal(summary.hasMixedClients, false)
    assert.equal(summary.clientId, 'client-a')
  })

  it('flags mixed client selections for public invoice creation', () => {
    const summary = getPublicDelegateInvoiceSummary(
      [
        { id: 'one', client_id: 'client-a', unit_price: 100 },
        { id: 'two', client_id: 'client-b', unit_price: 125 },
      ],
      ['one', 'two']
    )

    assert.equal(summary.hasMixedClients, true)
    assert.equal(summary.totalAmount, 225)
  })

  it('builds clear invoice line descriptions for selected delegates', () => {
    assert.equal(
      buildPublicDelegateInvoiceLineDescription(
        { full_name: 'Pat Learner' },
        'First Aid at Work'
      ),
      'Pat Learner - First Aid at Work'
    )

    assert.equal(
      buildPublicDelegateInvoiceLineDescription({
        full_name: 'Pat Learner',
        invoice_line_description: 'Custom course place',
      }),
      'Custom course place'
    )
  })

  it('returns line items linked to a specific invoice', () => {
    const lineItems = getPublicDelegateInvoiceLineItems(
      [
        { full_name: 'Alex One', unit_price: 90, invoice_id: 'invoice-one' },
        { full_name: 'Alex Two', unit_price: 95, invoice_id: 'invoice-two' },
      ],
      'invoice-one',
      'Manual Handling'
    )

    assert.deepEqual(lineItems, [
      {
        description: 'Alex One - Manual Handling',
        amount: 90,
      },
    ])
  })
})
