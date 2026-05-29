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
import { emailTemplateDefaults } from '@/lib/emailTemplateDefaults'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      to,
      learnerName,
      courseName,
      expiryDate,
      certificateNumber,
      verificationUrl,
      businessName,
      businessEmail,
      businessPhone,
      organisationId,
    } = body

    if (!to || !learnerName || !courseName || !expiryDate) {
      return Response.json(
        { error: 'Missing required expiry reminder fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    const template = await getEmailTemplate(
      'certificate_expiry_reminder',
      organisationId,
      emailTemplateDefaults.certificateExpiryReminder
    )

    const placeholderValues = {
      client_name: '',
      clientName: '',
      delegate_name: learnerName || '',
      learnerName: learnerName || '',
      learner_name: learnerName || '',
      courseName: courseName || '',
      course_name: courseName || '',
      date: '',
      booking_date: '',
      startTime: '',
      start_time: '',
      endTime: '',
      end_time: '',
      location: '',
      trainerName: '',
      trainer_name: '',
      certificateNumber: certificateNumber || 'N/A',
      certificate_number: certificateNumber || 'N/A',
      issue_date: '',
      expiryDate: expiryDate || '',
      expiry_date: expiryDate || '',
      verificationUrl: verificationUrl || '',
      verification_url: verificationUrl || '',
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
    const actionHtml = verificationUrl
      ? `
        <a href="${escapeHtml(verificationUrl)}" style="display: inline-block; background: #111827; color: white; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: bold;">
          Verify Certificate
        </a>
      `
      : ''

    const { data, error } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html: buildEmailHtml({
        subject,
        body: emailBody,
        detailsHtml: detailsBox([
          detailRow('Learner', learnerName),
          detailRow('Course', courseName),
          detailRow('Certificate No', certificateNumber || 'N/A'),
          detailRow('Expiry Date', expiryDate),
        ].join('')),
        actionHtml,
        footerHtml: footerParts,
      }),
    })

    if (error) {
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (error: unknown) {
    return Response.json(
      { error: getErrorMessage(error, 'Failed to send expiry reminder') },
      { status: 500 }
    )
  }
}
