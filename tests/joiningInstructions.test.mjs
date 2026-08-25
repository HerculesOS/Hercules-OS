import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  defaultJoiningInstructionTemplate,
  getJoiningInstructionDraft,
  getJoiningInstructionSendSummary,
  isBookingDueForJoiningInstructions,
  replaceJoiningInstructionPlaceholders,
} = await import('../lib/joiningInstructions.ts')

describe('joining instruction helpers', () => {
  it('replaces snake_case and camelCase placeholders', () => {
    const output = replaceJoiningInstructionPlaceholders(
      '{{delegate_name}} joins {{courseName}} at {{booking_location}}',
      {
        delegateName: 'Sarah Jones',
        course_name: 'First Aid',
        courseName: 'First Aid',
        bookingLocation: 'Training Room 1',
      }
    )

    assert.equal(output, 'Sarah Jones joins First Aid at Training Room 1')
  })

  it('uses the default fallback when no template exists', () => {
    const draft = getJoiningInstructionDraft({}, [])

    assert.equal(draft.subject, defaultJoiningInstructionTemplate.subject)
    assert.equal(draft.body, defaultJoiningInstructionTemplate.body)
  })

  it('uses booking custom instructions ahead of the template', () => {
    const draft = getJoiningInstructionDraft(
      {
        joining_instruction_subject: 'Custom subject',
        joining_instruction_body: 'Custom body',
      },
      [{ id: 'template', subject: 'Template subject', body: 'Template body' }]
    )

    assert.equal(draft.subject, 'Custom subject')
    assert.equal(draft.body, 'Custom body')
  })

  it('sends only when the booking is exactly 7 days away', () => {
    assert.equal(
      isBookingDueForJoiningInstructions(
        { date: '2026-09-01', status: 'scheduled' },
        new Date(2026, 7, 25)
      ),
      true
    )

    assert.equal(
      isBookingDueForJoiningInstructions(
        { date: '2026-09-02', status: 'scheduled' },
        new Date(2026, 7, 25)
      ),
      false
    )
  })

  it('skips cancelled bookings and bookings already sent', () => {
    assert.equal(
      isBookingDueForJoiningInstructions(
        { date: '2026-09-01', status: 'cancelled' },
        new Date(2026, 7, 25)
      ),
      false
    )
    assert.equal(
      isBookingDueForJoiningInstructions(
        {
          date: '2026-09-01',
          status: 'scheduled',
          joining_instructions_sent_at: '2026-08-25T08:00:00Z',
        },
        new Date(2026, 7, 25)
      ),
      false
    )
  })

  it('summarises delegates with missing email addresses', () => {
    const summary = getJoiningInstructionSendSummary([
      { email: 'one@example.com' },
      { email: '' },
      { email: null },
    ])

    assert.equal(summary.sendableDelegates.length, 1)
    assert.equal(summary.skippedMissingEmail, 2)
  })
})
