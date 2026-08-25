import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  normalizeOptionalDelegateEmail,
  validateOptionalDelegateEmail,
} = await import('../lib/delegateEmailEditing.ts')

describe('delegate email editing helpers', () => {
  it('allows a blank delegate email', () => {
    assert.deepEqual(validateOptionalDelegateEmail('   '), {
      value: null,
      error: '',
    })
  })

  it('trims valid delegate email addresses', () => {
    assert.equal(
      normalizeOptionalDelegateEmail(' learner@example.com '),
      'learner@example.com'
    )
  })

  it('rejects invalid delegate email addresses', () => {
    const result = validateOptionalDelegateEmail('not-an-email')

    assert.equal(result.value, 'not-an-email')
    assert.match(result.error, /valid email/)
  })
})
