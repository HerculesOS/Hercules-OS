import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  calculateSetupProgress,
} = await import('../lib/setupProgress.ts')

const emptyCounts = {
  courseTemplates: 0,
  certificateTemplates: 0,
  emailTemplates: 0,
  clients: 0,
  delegates: 0,
  bookings: 0,
}

describe('setup progress helpers', () => {
  it('marks a new default workspace as incomplete', () => {
    const progress = calculateSetupProgress(
      {
        name: 'My Training Company',
        email: '',
        phone: '',
        public_request_slug: '',
      },
      emptyCounts
    )

    assert.equal(progress.completedSteps, 0)
    assert.equal(progress.totalSteps, 7)
    assert.equal(progress.complete, false)
  })

  it('marks each setup area complete from saved details and counts', () => {
    const progress = calculateSetupProgress(
      {
        name: 'Whiteleaf Training',
        email: 'hello@whiteleaf.test',
        phone: '',
        public_request_slug: 'whiteleaf',
      },
      {
        courseTemplates: 2,
        certificateTemplates: 1,
        emailTemplates: 5,
        clients: 3,
        delegates: 0,
        bookings: 1,
      }
    )

    assert.equal(progress.completedSteps, 7)
    assert.equal(progress.percent, 100)
    assert.equal(progress.complete, true)
  })

  it('counts imported delegates even when no clients exist yet', () => {
    const progress = calculateSetupProgress(
      {
        name: 'Whiteleaf Training',
        email: 'hello@whiteleaf.test',
        public_request_slug: '',
      },
      {
        ...emptyCounts,
        delegates: 4,
      }
    )

    const importStep = progress.steps.find((step) => step.key === 'import-audience')

    assert.equal(importStep?.complete, true)
  })
})
