import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import {
  buildEmailHtml,
  detailRow,
  detailsBox,
  escapeHtml,
  getErrorMessage,
} from '@/lib/emailTemplates'
import { formatAppDate, formatAppTimeRange } from '@/lib/formatters'
import {
  getJoiningInstructionDraft,
  replaceJoiningInstructionPlaceholders,
} from '@/lib/joiningInstructions'
import { getBookingEmailRecipients } from '@/lib/bookingEmailRecipients'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const getBaseUrl = (request: Request) =>
  process.env.NEXT_PUBLIC_SITE_URL ||
  request.headers.get('origin') ||
  new URL(request.url).origin

const sendJoiningInstructionsForBooking = async ({
  bookingId,
  organisationId,
  force = false,
  request,
}: {
  bookingId: string
  organisationId: string
  force?: boolean
  request: Request
}) => {
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('organisation_id', organisationId)
    .single()

  if (bookingError || !booking) {
    throw new Error(bookingError?.message || 'Booking not found')
  }

  if (booking.status === 'cancelled') {
    return {
      sent: 0,
      skippedMissingEmail: 0,
      failed: 0,
      alreadySent: false,
      skippedCancelled: true,
    }
  }

  if (booking.joining_instructions_sent_at && !force) {
    return {
      sent: 0,
      skippedMissingEmail: 0,
      failed: 0,
      alreadySent: true,
      skippedCancelled: false,
    }
  }

  const { data: organisation } = await supabaseAdmin
    .from('organisations')
    .select('*')
    .eq('id', organisationId)
    .single()

  const { data: templates } = await supabaseAdmin
    .from('joining_instruction_templates')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('archived_at', null)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })

  const { data: trainer } = booking.trainer_id
    ? await supabaseAdmin
        .from('trainers')
        .select('*')
        .eq('id', booking.trainer_id)
        .eq('organisation_id', organisationId)
        .maybeSingle()
    : { data: null }

  const { data: bookingLinks } = await supabaseAdmin
    .from('booking_delegates')
    .select('delegate_id')
    .eq('booking_id', bookingId)
    .eq('organisation_id', organisationId)

  const delegateIds = (bookingLinks || [])
    .map((link) => link.delegate_id)
    .filter(Boolean)

  let delegates: any[] = []

  if (delegateIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('delegates')
      .select('*')
      .eq('organisation_id', organisationId)
      .in('id', delegateIds)

    delegates = data || []
  }

  const clientIds = Array.from(
    new Set(
      [
        booking.client_id,
        ...delegates.map((delegate) => delegate.client_id),
      ].filter(Boolean)
    )
  )
  let clients: any[] = []

  if (clientIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('organisation_id', organisationId)
      .in('id', clientIds)

    clients = data || []
  }

  const bookingClient = clients.find((client) => client.id === booking.client_id)
  const { subject, body } = getJoiningInstructionDraft(booking, templates || [])
  const recipientSummary = getBookingEmailRecipients(booking, delegates)

  if (recipientSummary.missingPrivateContactEmail) {
    return {
      sent: 0,
      skippedMissingEmail: 0,
      failed: 0,
      alreadySent: false,
      skippedCancelled: false,
      missingPrivateContactEmail: true,
      recipientMode: recipientSummary.mode,
    }
  }

  const baseUrl = getBaseUrl(request)
  const fromName = organisation?.name || 'Hercules OS'
  let sent = 0
  let failed = 0

  for (const recipient of recipientSummary.recipients) {
    const delegate = delegates.find(
      (item) => item.email && item.email === recipient.email
    )
    const delegateClient = delegate
      ? clients.find((client) => client.id === delegate.client_id) ||
        bookingClient
      : bookingClient
    const clientName =
      delegateClient?.company ||
      delegateClient?.name ||
      booking.client_name ||
      (booking.course_delivery_type === 'public' ? 'Public course' : '')
    const values = {
      delegateName: recipient.name || '',
      delegate_name: recipient.name || '',
      clientName,
      client_name: clientName,
      courseName: booking.course_name || '',
      course_name: booking.course_name || '',
      bookingDate: formatAppDate(booking.date, organisation),
      booking_date: formatAppDate(booking.date, organisation),
      bookingStartTime: formatAppTimeRange(booking.start_time, null, organisation),
      booking_start_time: formatAppTimeRange(booking.start_time, null, organisation),
      bookingEndTime: formatAppTimeRange(booking.end_time, null, organisation),
      booking_end_time: formatAppTimeRange(booking.end_time, null, organisation),
      bookingLocation: booking.location || 'Not set',
      booking_location: booking.location || 'Not set',
      trainerName: trainer?.name || 'To be confirmed',
      trainer_name: trainer?.name || 'To be confirmed',
      organisationName: fromName,
      organisation_name: fromName,
      organisationEmail: organisation?.email || '',
      organisation_email: organisation?.email || '',
      organisationPhone: organisation?.phone || '',
      organisation_phone: organisation?.phone || '',
    }
    const renderedSubject = replaceJoiningInstructionPlaceholders(subject, values)
    const renderedBody = replaceJoiningInstructionPlaceholders(body, values)
    const footerParts = [
      `Sent by ${escapeHtml(fromName)}`,
      organisation?.email ? `<br>Email: ${escapeHtml(organisation.email)}` : '',
      organisation?.phone ? `<br>Phone: ${escapeHtml(organisation.phone)}` : '',
    ].join('')

    const { error } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [recipient.email],
      subject: renderedSubject,
      html: buildEmailHtml({
        subject: renderedSubject,
        body: renderedBody,
        detailsHtml: detailsBox([
          detailRow('Course', booking.course_name),
          detailRow('Date', values.bookingDate),
          detailRow(
            'Time',
            `${values.bookingStartTime || 'Not set'} - ${values.bookingEndTime || 'Not set'}`
          ),
          detailRow('Location', booking.location),
          detailRow('Trainer', trainer?.name || 'To be confirmed'),
        ].join('')),
        actionHtml: `
          <p style="font-size: 14px; color: #6b7280; margin-top: 16px;">
            Booking reference: ${escapeHtml(booking.id)}
          </p>
          <p style="font-size: 14px; color: #6b7280; margin-top: 4px;">
            ${escapeHtml(baseUrl)}
          </p>
        `,
        footerHtml: footerParts,
      }),
    })

    if (error) {
      failed += 1
    } else {
      sent += 1
    }
  }

  if (sent > 0) {
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ joining_instructions_sent_at: new Date().toISOString() })
      .eq('id', bookingId)
      .eq('organisation_id', organisationId)

    if (updateError) {
      throw new Error(updateError.message)
    }
  }

  return {
    sent,
    skippedMissingEmail: recipientSummary.skippedMissingEmail,
    failed,
    alreadySent: false,
    skippedCancelled: false,
    missingPrivateContactEmail: false,
    recipientMode: recipientSummary.mode,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { bookingId, organisationId, force } = body

    if (!bookingId || !organisationId) {
      return Response.json(
        { error: 'Booking and organisation are required' },
        { status: 400 }
      )
    }

    const summary = await sendJoiningInstructionsForBooking({
      bookingId,
      organisationId,
      force: Boolean(force),
      request,
    })

    return Response.json({ success: true, summary })
  } catch (error: unknown) {
    return Response.json(
      { error: getErrorMessage(error, 'Failed to send joining instructions') },
      { status: 500 }
    )
  }
}
