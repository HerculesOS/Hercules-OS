import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      to,
      invoiceNumber,
      clientName,
      amount,
      vatAmount,
      totalAmount,
      dueDate,
      status,
      businessName,
      businessEmail,
      businessPhone,
      paymentDetails,
    } = body

    if (!to || !invoiceNumber || !clientName || !totalAmount) {
      return Response.json(
        { error: 'Missing required invoice email fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    const { data, error } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject: `Invoice ${invoiceNumber} from ${fromName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">
            Invoice ${invoiceNumber}
          </h1>

          <p style="font-size: 16px; color: #4b5563;">
            Hi ${clientName},
          </p>

          <p style="font-size: 16px; color: #4b5563;">
            Please find your invoice details below.
          </p>

          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Net Amount:</strong> £${Number(amount || 0).toFixed(2)}</p>
            <p><strong>VAT:</strong> £${Number(vatAmount || 0).toFixed(2)}</p>
            <p><strong>Total:</strong> £${Number(totalAmount || 0).toFixed(2)}</p>
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