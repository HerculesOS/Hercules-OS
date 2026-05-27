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
        { error: 'Missing required booking confirmation fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    let templateSubject = 'Booking confirmation - {{course_name}}'
    let templateBody = `Hello {{client_name}},

This email confirms your booking for {{course_name}}.

Date: {{booking_date}}
Time: {{start_time}} - {{end_time}}
Location: {{location}}
Trainer: {{trainer_name}}

Kind regards,
{{business_name}}`

    if (organisationId) {
      const { data: template } = await supabaseAdmin
        .from('email_templates')
        .select('*')
        .eq('organisation_id', organisationId)
        .eq('template_key', 'booking_confirmation')
        .maybeSingle()

      if (template) {
        templateSubject = template.subject || templateSubject
        templateBody = template.body || templateBody
      }
    }

    const placeholderValues = {
      client_name: clientName || '',
      delegate_name: '',
      learner_name: '',
      course_name: courseName || '',
      booking_date: date || '',
      start_time: startTime || 'Not set',
      end_time: endTime || 'Not set',
      location: location || 'Not set',
      trainer_name: trainerName || 'To be confirmed',
      certificate_number: '',
      issue_date: '',
      expiry_date: '',
      verification_url: '',
      invoice_number: '',
      invoice_amount: '',
      due_date: '',
      business_name: fromName,
      business_email: businessEmail || '',
      business_phone: businessPhone || '',
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
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${startTime || 'Not set'} - ${endTime || 'Not set'}</p>
            <p><strong>Location:</strong> ${location || 'Not set'}</p>
            <p><strong>Trainer:</strong> ${trainerName || 'To be confirmed'}</p>
          </div>

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
      { error: error.message || 'Failed to send booking confirmation' },
      { status: 500 }
    )
  }
}