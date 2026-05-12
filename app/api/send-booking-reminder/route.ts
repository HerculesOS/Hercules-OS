import { Resend } from 'resend'

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
    } = body

    if (!to || !clientName || !courseName || !date) {
      return Response.json(
        { error: 'Missing required booking reminder fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    const { data, error } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject: `Reminder: ${courseName} on ${date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">
            Training Reminder
          </h1>

          <p style="font-size: 16px; color: #4b5563;">
            Hi ${clientName},
          </p>

          <p style="font-size: 16px; color: #4b5563;">
            This is a reminder about your upcoming first aid training session.
          </p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${startTime || 'Not set'} - ${endTime || 'Not set'}</p>
            <p><strong>Location:</strong> ${location || 'Not set'}</p>
            <p><strong>Trainer:</strong> ${trainerName || 'To be confirmed'}</p>
          </div>

          <p style="font-size: 16px; color: #4b5563;">
            Please make sure learners arrive on time and bring anything requested by the training provider.
          </p>

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
      { error: error.message || 'Failed to send booking reminder' },
      { status: 500 }
    )
  }
}