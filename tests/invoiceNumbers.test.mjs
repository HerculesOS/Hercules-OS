import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getNextInvoiceNumber,
  isDuplicateInvoiceNumberError,
} = await import('../lib/invoiceNumbers.ts')

describe('invoice number helpers', () => {
  it('uses the next highest invoice number rather than list length', () => {
    const nextInvoiceNumber = getNextInvoiceNumber([
      'INV-0001',
      'INV-0007',
      'INV-0003',
      null,
      'legacy-number',
    ])

    assert.equal(nextInvoiceNumber, 'INV-0008')
  })

  it('starts at INV-0001 when no matching invoice numbers exist', () => {
    assert.equal(getNextInvoiceNumber(['QUOTE-1', undefined]), 'INV-0001')
  })

  it('detects Supabase/Postgres duplicate key errors', () => {
    assert.equal(isDuplicateInvoiceNumberError({ code: '23505' }), true)
    assert.equal(
      isDuplicateInvoiceNumberError({
        message: 'duplicate key value violates unique constraint',
      }),
      true
    )
    assert.equal(isDuplicateInvoiceNumberError({ message: 'network error' }), false)
  })
})
