export type BookingEmailBookingLike = {
  course_delivery_type?: string | null
  client_name?: string | null
  booking_contact_name?: string | null
  booking_contact_email?: string | null
  booking_contact_phone?: string | null
}

export type BookingEmailDelegateLike = {
  full_name?: string | null
  email?: string | null
}

export type BookingEmailClientLike = {
  name?: string | null
  email?: string | null
  phone?: string | null
}

export type BookingEmailRecipient = {
  name: string
  email: string
}

const trimValue = (value?: string | null) => String(value || '').trim()

export const getDefaultBookingContactFromClient = (
  client?: BookingEmailClientLike | null
) => ({
  name: trimValue(client?.name),
  email: trimValue(client?.email),
  phone: trimValue(client?.phone),
})

export const getBookingEmailRecipients = (
  booking: BookingEmailBookingLike,
  delegates: BookingEmailDelegateLike[] = []
) => {
  const isPublicBooking = booking.course_delivery_type === 'public'

  if (isPublicBooking) {
    const recipients = delegates
      .map((delegate) => ({
        name: trimValue(delegate.full_name) || 'Delegate',
        email: trimValue(delegate.email),
      }))
      .filter((recipient) => recipient.email)

    return {
      mode: 'public' as const,
      recipients,
      skippedMissingEmail: delegates.length - recipients.length,
      missingPrivateContactEmail: false,
    }
  }

  const email = trimValue(booking.booking_contact_email)

  return {
    mode: 'private' as const,
    recipients: email
      ? [
          {
            name:
              trimValue(booking.booking_contact_name) ||
              trimValue(booking.client_name) ||
              'Booking contact',
            email,
          },
        ]
      : [],
    skippedMissingEmail: 0,
    missingPrivateContactEmail: !email,
  }
}

export const getBookingEmailRecipientSummary = (
  booking: BookingEmailBookingLike,
  delegates: BookingEmailDelegateLike[] = []
) => {
  const result = getBookingEmailRecipients(booking, delegates)

  return {
    ...result,
    count: result.recipients.length,
  }
}
