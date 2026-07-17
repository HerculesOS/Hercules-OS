import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getComputedCertificateStatus,
  isCertificateExpiredByDate,
  isCertificateExpiringSoon,
} = await import('../lib/certificateStatus.ts')

describe('certificate status helpers', () => {
  const today = new Date(2026, 6, 17, 12, 0)

  it('keeps future expiry certificates valid', () => {
    assert.equal(
      getComputedCertificateStatus(
        { status: 'valid', expiry_date: '2026-07-18' },
        today
      ),
      'valid'
    )
  })

  it('keeps certificates expiring today valid today', () => {
    assert.equal(
      getComputedCertificateStatus(
        { status: 'valid', expiry_date: '2026-07-17' },
        today
      ),
      'valid'
    )
    assert.equal(
      isCertificateExpiredByDate({ expiry_date: '2026-07-17' }, today),
      false
    )
  })

  it('shows past expiry certificates as expired', () => {
    assert.equal(
      getComputedCertificateStatus(
        { status: 'valid', expiry_date: '2026-07-16' },
        today
      ),
      'expired'
    )
  })

  it('keeps revoked certificates revoked even after expiry', () => {
    assert.equal(
      getComputedCertificateStatus(
        { status: 'revoked', expiry_date: '2026-07-16' },
        today
      ),
      'revoked'
    )
  })

  it('does not auto-expire certificates without an expiry date', () => {
    assert.equal(
      getComputedCertificateStatus({ status: 'valid', expiry_date: null }, today),
      'valid'
    )
  })

  it('excludes expired certificates from expiring soon', () => {
    assert.equal(
      isCertificateExpiringSoon(
        { status: 'valid', expiry_date: '2026-07-16' },
        today
      ),
      false
    )
    assert.equal(
      isCertificateExpiringSoon(
        { status: 'valid', expiry_date: '2026-08-01' },
        today
      ),
      true
    )
  })
})
