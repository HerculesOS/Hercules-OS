import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  parseOptionalNonNegativeNumber,
  parseOptionalPositiveInteger,
  parseRequiredPositiveNumber,
} = await import('../lib/numberValidation.ts')

describe('number validation helpers', () => {
  it('accepts required positive numbers', () => {
    assert.deepEqual(parseRequiredPositiveNumber('125.50', 'Amount'), {
      value: 125.5,
      error: '',
    })
  })

  it('rejects missing, negative, zero, and non-numeric required positive numbers', () => {
    assert.match(parseRequiredPositiveNumber('', 'Amount').error, /required/)
    assert.match(parseRequiredPositiveNumber('0', 'Amount').error, /greater than 0/)
    assert.match(parseRequiredPositiveNumber('-1', 'Amount').error, /greater than 0/)
    assert.match(parseRequiredPositiveNumber('abc', 'Amount').error, /valid number/)
  })

  it('allows blank optional non-negative numbers', () => {
    assert.deepEqual(parseOptionalNonNegativeNumber('', 'Price'), {
      value: null,
      error: '',
    })
  })

  it('rejects negative optional numbers', () => {
    assert.match(parseOptionalNonNegativeNumber('-5', 'Price').error, /0 or more/)
  })

  it('requires optional positive integers to be whole numbers', () => {
    assert.deepEqual(parseOptionalPositiveInteger('12', 'Learners'), {
      value: 12,
      error: '',
    })
    assert.match(parseOptionalPositiveInteger('1.5', 'Learners').error, /whole number/)
  })
})
