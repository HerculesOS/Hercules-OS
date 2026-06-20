import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getBulkCertificateEmailSummary,
  getBulkCertificateGenerationSummary,
  getRegisterStatus,
  isCertificateEligible,
  normalizeRegisterRow,
} = await import('../lib/attendanceRegister.ts')

describe('attendance register helpers', () => {
  it('treats an empty or unmarked register as not started', () => {
    assert.equal(getRegisterStatus([]), 'not_started')
    assert.equal(
      getRegisterStatus([
        { attendance_status: 'not_marked', result_status: 'not_assessed' },
      ]),
      'not_started'
    )
  })

  it('marks a partly completed register as in progress', () => {
    assert.equal(
      getRegisterStatus([
        { attendance_status: 'present', result_status: 'passed' },
        { attendance_status: 'not_marked', result_status: 'not_assessed' },
      ]),
      'in_progress'
    )
  })

  it('marks a fully completed register as complete', () => {
    assert.equal(
      getRegisterStatus([
        { attendance_status: 'present', result_status: 'passed' },
        { attendance_status: 'absent', result_status: 'failed' },
      ]),
      'complete'
    )
  })

  it('allows present and passed delegates to receive certificates', () => {
    assert.equal(
      isCertificateEligible({
        attendance_status: 'present',
        result_status: 'passed',
      }),
      true
    )
  })

  it('does not allow absent, failed or unassessed delegates to receive certificates', () => {
    assert.equal(
      isCertificateEligible({
        attendance_status: 'absent',
        result_status: 'failed',
      }),
      false
    )
    assert.equal(
      isCertificateEligible({
        attendance_status: 'present',
        result_status: 'failed',
      }),
      false
    )
    assert.equal(
      isCertificateEligible({
        attendance_status: 'present',
        result_status: 'not_assessed',
      }),
      false
    )
  })

  it('normalizes absent and passed to absent and failed', () => {
    assert.deepEqual(
      normalizeRegisterRow({
        attendance_status: 'absent',
        result_status: 'passed',
      }),
      {
        attendance_status: 'absent',
        result_status: 'failed',
      }
    )
  })

  it('selects eligible delegates for bulk certificate generation', () => {
    const delegates = [
      { id: 'one', attendance_status: 'present', result_status: 'passed' },
      { id: 'two', attendance_status: 'absent', result_status: 'failed' },
      { id: 'three', attendance_status: 'present', result_status: 'passed' },
    ]

    const summary = getBulkCertificateGenerationSummary(
      delegates,
      (delegate) => delegate.id === 'three'
    )

    assert.deepEqual(
      summary.delegatesToGenerate.map((delegate) => delegate.id),
      ['one']
    )
    assert.equal(summary.skippedNotEligible, 1)
    assert.equal(summary.skippedExistingCertificate, 1)
  })

  it('skips delegates without certificates or email for bulk certificate email', () => {
    const delegates = [
      {
        id: 'one',
        email: 'one@example.com',
        attendance_status: 'present',
        result_status: 'passed',
      },
      {
        id: 'two',
        email: '',
        attendance_status: 'present',
        result_status: 'passed',
      },
      {
        id: 'three',
        email: 'three@example.com',
        attendance_status: 'present',
        result_status: 'passed',
      },
      {
        id: 'four',
        email: 'four@example.com',
        attendance_status: 'present',
        result_status: 'failed',
      },
    ]

    const certificates = new Map([
      ['one', { id: 'cert-one' }],
      ['two', { id: 'cert-two' }],
    ])

    const summary = getBulkCertificateEmailSummary(
      delegates,
      (delegate) => certificates.get(delegate.id)
    )

    assert.deepEqual(
      summary.delegatesToEmail.map(({ delegate }) => delegate.id),
      ['one']
    )
    assert.equal(summary.skippedNotEligible, 1)
    assert.equal(summary.skippedMissingCertificate, 1)
    assert.equal(summary.skippedMissingEmail, 1)
  })
})
