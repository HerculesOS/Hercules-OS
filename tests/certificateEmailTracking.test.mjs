import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getCertificateEmailSentDisplay,
  getCertificateEmailSentUpdate,
} = await import('../lib/certificateEmailTracking.ts')

describe('certificate email tracking helpers', () => {
  it('records a certificate sent timestamp only after successful email', () => {
    assert.deepEqual(
      getCertificateEmailSentUpdate(true, '2026-08-25T14:30:00Z'),
      { certificate_emailed_at: '2026-08-25T14:30:00Z' }
    )
  })

  it('does not record a timestamp after failed email', () => {
    assert.equal(
      getCertificateEmailSentUpdate(false, '2026-08-25T14:30:00Z'),
      null
    )
  })

  it('returns the stored certificate sent timestamp for display', () => {
    assert.equal(
      getCertificateEmailSentDisplay({
        certificate_emailed_at: '2026-08-25T14:30:00Z',
      }),
      '2026-08-25T14:30:00Z'
    )
    assert.equal(getCertificateEmailSentDisplay({}), null)
  })
})
