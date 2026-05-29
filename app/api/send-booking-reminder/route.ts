import { Resend } from 'resend'
import {
  buildEmailHtml,
  detailRow,
  detailsBox,
  escapeHtml,
  getErrorMessage,
  getEmailTemplate,
  replacePlaceholders,
} from '@/lib/emailTemplates'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
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

    if (!to || !clientName || !courseName || !date) {
      return Response.json(
        { error: 'Missing required booking reminder fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    const template = await getEmailTemplate(
      'booking_reminder',
      organisationId,
      {
        subject: 'Reminder - {{courseName}}',
        body: `Hello {{clientName}},

This is a reminder for your upcoming training course.

Course: {{courseName}}
Date: {{date}}
Time: {{startTime}} - {{endTime}}
Location: {{location}}
Trainer: {{trainerName}}

Kind regards,
{{businessName}}`,
      }
    )

    const placeholderValues = {
      clientName: clientName || '',
      client_name: clientName || '',
      delegate_name: '',
      learnerName: '',
      learner_name: '',
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

    const { data, error } = await resend.emails.send({
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

    if (error) {
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (error: unknown) {
    return Response.json(
      { error: getErrorMessage(error, 'Failed to send booking reminder') },
      { status: 500 }
    )
  }
}
