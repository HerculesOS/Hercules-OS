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
      learnerName,
      courseName,
      issueDate,
      expiryDate,
      certificateNumber,
      verificationUrl,
      businessName,
      organisationId,
    } = body

    if (!to || !learnerName || !courseName || !verificationUrl) {
      return Response.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    let templateSubject = 'Your certificate - {{course_name}}'
    let templateBody = `Hello {{delegate_name}},

Please find your certificate details below.

Course: {{course_name}}
Certificate number: {{certificate_number}}
Issue date: {{issue_date}}
Expiry date: {{expiry_date}}

You can verify the certificate here:
{{verification_url}}

Kind regards,
{{business_name}}`

    if (organisationId) {
      const { data: template } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('template_key', 'certificate_email')
        .maybeSingle()

      if (template) {
        templateSubject = template.subject || templateSubject
        templateBody = template.body || templateBody
      }
    }

    const placeholderValues = {
      client_name: '',
      delegate_name: learnerName || '',
      learner_name: learnerName || '',
      course_name: courseName || '',
      booking_date: '',
      start_time: '',
      end_time: '',
      location: '',
      trainer_name: '',
      certificate_number: certificateNumber || 'N/A',
      issue_date: issueDate || 'N/A',
      expiry_date: expiryDate || 'N/A',
      verification_url: verificationUrl || '',
      invoice_number: '',
      invoice_amount: '',
      due_date: '',
      business_name: fromName,
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
            <p><strong>Learner:</strong> ${learnerName}</p>
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>Certificate No:</strong> ${certificateNumber || 'N/A'}</p>
            <p><strong>Issue Date:</strong> ${issueDate || 'N/A'}</p>
            <p><strong>Expiry Date:</strong> ${expiryDate || 'N/A'}</p>
          </div>

          <a href="${verificationUrl}" style="display: inline-block; background: #111827; color: white; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: bold;">
            Verify Certificate
          </a>

          <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
            This email was sent by ${fromName}.
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
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}