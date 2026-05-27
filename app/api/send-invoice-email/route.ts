import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const replacePlaceholders = (
  text: string,
  values: Record<string, string>
) => {
  let output = text

  Object.entries(values).forEach(([key, value]) => {
    output = output.replaceAll(`{{${key}}}`, value || '')
  })

  return output
}

const textToHtml = (text: string) => {
  return text
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<br />'
      return `<p style="font-size: 16px; color: #4b5563; margin: 0 0 12px;">${line}</p>`
    })
    .join('')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      to,
      invoiceNumber,
      clientName,
      courseName,
      amount,
      vatAmount,
      totalAmount,
      dueDate,
      status,
      businessName,
      businessEmail,
      businessPhone,
      paymentDetails,
      organisationId,
    } = body

    if (!to || !invoiceNumber || !clientName || !totalAmount) {
      return Response.json(
        { error: 'Missing required invoice email fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    let templateSubject = 'Invoice for {{course_name}}'
    let templateBody = `Hello {{client_name}},

Please find your invoice details below.

Invoice number: {{invoice_number}}
Amount: {{invoice_amount}}
Due date: {{due_date}}

Kind regards,
{{business_name}}`

    if (organisationId) {
      const { data: template } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('template_key', 'invoice_email')
        .maybeSingle()

      if (template) {
        templateSubject = template.subject || templateSubject
        templateBody = template.body || templateBody
      }
    }

    const formattedAmount = `£${Number(amount || 0).toFixed(2)}`
    const formattedVatAmount = `£${Number(vatAmount || 0).toFixed(2)}`
    const formattedTotalAmount = `£${Number(totalAmount || 0).toFixed(2)}`

    const placeholderValues = {
      client_name: clientName || '',
      delegate_name: '',
      learner_name: '',
      course_name: courseName || 'Training course',
      booking_date: '',
      start_time: '',
      end_time: '',
      location: '',
      trainer_name: '',
      certificate_number: '',
      issue_date: '',
      expiry_date: '',
      verification_url: '',
      invoice_number: invoiceNumber || '',
      invoice_amount: formattedTotalAmount,
      invoice_net_amount: formattedAmount,
      invoice_vat_amount: formattedVatAmount,
      due_date: dueDate || 'Not set',
      business_name: fromName,
      business_email: businessEmail || '',
      business_phone: businessPhone || '',
      payment_details: paymentDetails || '',
      invoice_status: status || 'draft',
    }

    const subject = replacePlaceholders(templateSubject, placeholderValues)
    const emailBody = replacePlaceholders(templateBody, placeholderValues)

    const { data, error } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">
            ${subject}
          </h1>

          <div>
            ${textToHtml(emailBody)}
          </div>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Net Amount:</strong> ${formattedAmount}</p>
            <p><strong>VAT:</strong> ${formattedVatAmount}</p>
            <p><strong>Total:</strong> ${formattedTotalAmount}</p>
            <p><strong>Due Date:</strong> ${dueDate || 'Not set'}</p>
            <p><strong>Status:</strong> ${status || 'draft'}</p>
          </div>

          ${
            paymentDetails
              ? `
                <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 24px 0;">
                  <h2 style="font-size: 18px; margin-top: 0;">Payment Details</h2>
                  <p style="white-space: pre-line;">${paymentDetails}</p>
                </div>
              `
              : ''
          }

          <p style="font-size: 14px; color: #6b7280;">
            Sent by ${fromName}
            ${businessEmail ? `<br>Email: ${businessEmail}` : ''}
            ${businessPhone ? `<br>Phone: ${businessPhone}` : ''}
          </p>
        </div>
      `,
    })

    if (error) {
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Failed to send invoice email' },
      { status: 500 }
    )
  }
}