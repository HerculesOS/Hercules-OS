import { Resend } from 'resend'

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
    } = body

    if (!to || !learnerName || !courseName || !expiryDate) {
      return Response.json(
        { error: 'Missing required expiry reminder fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    const { data, error } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject: `Certificate expiry reminder: ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">
            Certificate Expiry Reminder
          </h1>

          <p style="font-size: 16px; color: #4b5563;">
            Hi,
          </p>

          <p style="font-size: 16px; color: #4b5563;">
            This is a reminder that a first aid certificate is due to expire soon.
          </p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <p><strong>Learner:</strong> ${learnerName}</p>
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>Certificate No:</strong> ${certificateNumber || 'N/A'}</p>
            <p><strong>Expiry Date:</strong> ${expiryDate}</p>
          </div>

          ${
            verificationUrl
              ? `
                <a href="${verificationUrl}" style="display: inline-block; background: #111827; color: white; padding: 12px 18px; border-radius: 10px; text-decoration: none; font-weight: bold;">
                  Verify Certificate
                </a>
              `
              : ''
          }

          <p style="font-size: 16px; color: #4b5563; margin-top: 24px;">
            Please contact ${fromName} if refresher training needs to be arranged.
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
      { error: error.message || 'Failed to send expiry reminder' },
      { status: 500 }
    )
  }
}