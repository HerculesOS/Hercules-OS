import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
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
})
