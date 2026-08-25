import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import {
  buildEmailHtml,
  detailRow,
  detailsBox,
  escapeHtml,
  getErrorMessage,
  getEmailTemplate,
  replacePlaceholders,
} from '@/lib/emailTemplates'
import { emailTemplateDefaults } from '@/lib/emailTemplateDefaults'
import { formatAppDate, formatAppTimeRange } from '@/lib/formatters'
import { getBookingEmailRecipients } from '@/lib/bookingEmailRecipients'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sendBookingConfirmationEmail = async ({
  to,
  recipientName,
  clientName,
  courseName,
  date,
  startTime,
  endTime,
  location,
  trainerName,
  businessName,
  businessEmail,
  businessPhone,
  organisationId,
}: {
  to: string
  recipientName?: string
  clientName: string
  courseName: string
  date: string
  startTime?: string
  endTime?: string
  location?: string
  trainerName?: string
  businessName?: string
  businessEmail?: string
  businessPhone?: string
  organisationId?: string
}) => {
  const fromName = businessName || 'Hercules OS'

  const template = await getEmailTemplate(
    'booking_confirmation',
    organisationId,
    emailTemplateDefaults.bookingConfirmation
  )

  const placeholderValues = {
    clientName: clientName || '',
    client_name: clientName || '',
    delegate_name: recipientName || '',
    learnerName: recipientName || '',
    learner_name: recipientName || '',
    courseName: courseName || '',
    course_name: courseName || '',
    date: date || '',
    booking_date: date || '',
    startTime: startTime || 'Not set',
    start_time: startTime || 'Not set',
    endTime: endTime || 'Not set',
    end_time: endTime || 'Not set',
    location: location || 'Not set',
    trainerName: trainerName || 'To be confirmed',
    trainer_name: trainerName || 'To be confirmed',
    certificateNumber: '',
    certificate_number: '',
    issue_date: '',
    expiryDate: '',
    expiry_date: '',
    verificationUrl: '',
    verification_url: '',
    invoiceNumber: '',
    invoice_number: '',
    invoice_amount: '',
    due_date: '',
    businessName: fromName,
    business_name: fromName,
    businessEmail: businessEmail || '',
    business_email: businessEmail || '',
    businessPhone: businessPhone || '',
    business_phone: businessPhone || '',
    paymentDetails: '',
  }

  const subject = replacePlaceholders(template.subject, placeholderValues)
  const emailBody = replacePlaceholders(template.body, placeholderValues)
  const footerParts = [
    `Sent by ${escapeHtml(fromName)}`,
    businessEmail ? `<br>Email: ${escapeHtml(businessEmail)}` : '',
    businessPhone ? `<br>Phone: ${escapeHtml(businessPhone)}` : '',
  ].join('')

  return resend.emails.send({
    from: `${fromName} <onboarding@resend.dev>`,
    to: [to],
    subject,
    html: buildEmailHtml({
      subject,
      body: emailBody,
      detailsHtml: detailsBox([
        detailRow('Course', courseName),
        detailRow('Date', date),
        detailRow('Time', `${startTime || 'Not set'} - ${endTime || 'Not set'}`),
        detailRow('Location', location),
        detailRow('Trainer', trainerName || 'To be confirmed'),
      ].join('')),
      footerHtml: footerParts,
    }),
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      bookingId,
      to,
      clientName,
      courseName,
      date,
      startTime,
      endTime,
      location,
      trainerName,
      businessName,
      businessEmail,
      businessPhone,
      organisationId,
    } = body

    if (bookingId && organisationId) {
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('organisation_id', organisationId)
        .single()

      if (bookingError || !booking) {
        return Response.json(
          { error: bookingError?.message || 'Booking not found' },
          { status: 404 }
        )
      }

      const { data: organisation } = await supabaseAdmin
        .from('organisations')
        .select('*')
        .eq('id', organisationId)
        .single()

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

      const { data: client } = booking.client_id
        ? await supabaseAdmin
            .from('clients')
            .select('*')
            .eq('id', booking.client_id)
            .eq('organisation_id', organisationId)
            .maybeSingle()
        : { data: null }

      const recipientSummary = getBookingEmailRecipients(booking, delegates)

      if (recipientSummary.missingPrivateContactEmail) {
        return Response.json(
          { error: 'Add a booking contact email before sending.' },
          { status: 400 }
        )
      }

      const resolvedClientName =
        client?.company ||
        client?.name ||
        booking.client_name ||
        (booking.course_delivery_type === 'public' ? 'Public course' : '')
      let sent = 0
      let failed = 0

      for (const recipient of recipientSummary.recipients) {
        const result = await sendBookingConfirmationEmail({
          to: recipient.email,
          recipientName: recipient.name,
          clientName: resolvedClientName,
          courseName: booking.course_name,
          date: formatAppDate(booking.date, organisation),
          startTime: formatAppTimeRange(booking.start_time, null, organisation),
          endTime: booking.end_time
            ? formatAppTimeRange(booking.end_time, null, organisation)
            : '',
          location: booking.location,
          trainerName: trainer?.name || '',
          businessName: organisation?.name || 'Hercules OS',
          businessEmail: organisation?.email || '',
          businessPhone: organisation?.phone || '',
          organisationId,
        })

        if (result.error) {
          failed += 1
        } else {
          sent += 1
        }
      }

      return Response.json({
        success: true,
        summary: {
          recipientMode: recipientSummary.mode,
          sent,
          failed,
          skippedMissingEmail: recipientSummary.skippedMissingEmail,
        },
      })
    }

    if (!to || !clientName || !courseName || !date) {
      return Response.json(
        { error: 'Missing required booking confirmation fields' },
        { status: 400 }
      )
    }

    const { data, error } = await sendBookingConfirmationEmail({
      to,
      clientName,
      courseName,
      date,
      startTime,
      endTime,
      location,
      trainerName,
      businessName,
      businessEmail,
      businessPhone,
      organisationId,
    })

    if (error) {
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (error: unknown) {
    return Response.json(
      { error: getErrorMessage(error, 'Failed to send booking confirmation') },
      { status: 500 }
    )
  }
}
