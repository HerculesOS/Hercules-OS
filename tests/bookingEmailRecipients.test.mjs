import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  getBookingEmailRecipients,
  getDefaultBookingContactFromClient,
} = await import('../lib/bookingEmailRecipients.ts')

describe('booking email recipient helpers', () => {
  it('uses booking contact email for private bookings', () => {
    const result = getBookingEmailRecipients(
      {
        course_delivery_type: 'private',
        client_name: 'Whiteleaf',
        booking_contact_name: 'Course Booker',
        booking_contact_email: 'booker@example.com',
      },
      [{ full_name: 'Delegate One', email: 'delegate@example.com' }]
    )

    assert.equal(result.mode, 'private')
    assert.deepEqual(result.recipients, [
      { name: 'Course Booker', email: 'booker@example.com' },
    ])
  })

  it('does not send private joining instructions directly to delegates', () => {
    const result = getBookingEmailRecipients(
      {
        course_delivery_type: 'private',
        booking_contact_name: 'Course Booker',
        booking_contact_email: 'booker@example.com',
      },
      [{ full_name: 'Delegate One', email: 'delegate@example.com' }]
    )

    assert.equal(result.recipients.length, 1)
    assert.equal(result.recipients[0].email, 'booker@example.com')
  })

  it('blocks private sends when booking contact email is missing', () => {
    const result = getBookingEmailRecipients(
      { course_delivery_type: 'private', booking_contact_name: 'Course Booker' },
      [{ full_name: 'Delegate One', email: 'delegate@example.com' }]
    )

    assert.equal(result.missingPrivateContactEmail, true)
    assert.equal(result.recipients.length, 0)
  })

  it('sends public booking emails to delegates with email addresses', () => {
    const result = getBookingEmailRecipients(
      { course_delivery_type: 'public' },
      [
        { full_name: 'Delegate One', email: 'one@example.com' },
        { full_name: 'Delegate Two', email: 'two@example.com' },
      ]
    )

    assert.equal(result.mode, 'public')
    assert.deepEqual(
      result.recipients.map((recipient) => recipient.email),
      ['one@example.com', 'two@example.com']
    )
  })

  it('skips public delegates without email addresses', () => {
    const result = getBookingEmailRecipients(
      { course_delivery_type: 'public' },
      [
        { full_name: 'Delegate One', email: 'one@example.com' },
        { full_name: 'Delegate Two', email: '' },
      ]
    )

    assert.equal(result.recipients.length, 1)
    assert.equal(result.skippedMissingEmail, 1)
  })

  it('can default booking contact fields from the selected client', () => {
    assert.deepEqual(
      getDefaultBookingContactFromClient({
        name: 'Primary Contact',
        email: 'primary@example.com',
        phone: '01234 567890',
      }),
      {
        name: 'Primary Contact',
        email: 'primary@example.com',
        phone: '01234 567890',
      }
    )
  })
})
