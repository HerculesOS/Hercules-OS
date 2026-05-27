import { Resend } from 'resend'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)

const createSafeFilename = (name: string, certificateNumber: string) => {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const safeCertificateNumber = certificateNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `${safeName || 'certificate'}-${safeCertificateNumber || 'certificate'}.pdf`
}

const generateCertificatePdfBuffer = async ({
  learnerName,
  courseName,
  issueDate,
  expiryDate,
  certificateNumber,
  verificationUrl,
  businessName,
}: {
  learnerName: string
  courseName: string
  issueDate?: string
  expiryDate?: string
  certificateNumber?: string
  verificationUrl?: string
  businessName?: string
}) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  const providerName = businessName || 'Training Provider'
  const certNumber = certificateNumber || 'N/A'
  const issued = issueDate || 'N/A'
  const expires = expiryDate || 'N/A'

  let qrDataUrl = ''

  if (verificationUrl) {
    try {
      qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        width: 240,
      })
    } catch {
      qrDataUrl = ''
    }
  }

  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, 297, 210, 'F')

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(15, 15, 267, 180, 4, 4, 'F')

  doc.setDrawColor(17, 24, 39)
  doc.setLineWidth(1.2)
  doc.roundedRect(22, 22, 253, 166, 3, 3, 'D')

  doc.setDrawColor(209, 213, 219)
  doc.setLineWidth(0.4)
  doc.roundedRect(28, 28, 241, 154, 2, 2, 'D')

  doc.setTextColor(17, 24, 39)
  doc.setFontSize(16)
  doc.text(providerName, 148.5, 40, { align: 'center' })

  doc.setFontSize(30)
  doc.text('Certificate of Completion', 148.5, 63, { align: 'center' })

  doc.setDrawColor(17, 24, 39)
  doc.setLineWidth(0.5)
  doc.line(80, 72, 217, 72)

  doc.setFontSize(13)
  doc.setTextColor(75, 85, 99)
  doc.text('Presented to', 148.5, 86, { align: 'center' })

  doc.setFontSize(28)
  doc.setTextColor(17, 24, 39)
  doc.text(learnerName, 148.5, 103, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(75, 85, 99)

  const body = `This is to certify that ${learnerName} has successfully completed ${courseName}.`
  const bodyLines = doc.splitTextToSize(body, 190)
  doc.text(bodyLines, 148.5, 119, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)

  doc.text(`Course: ${courseName}`, 45, 150)
  doc.text(`Issue Date: ${issued}`, 45, 158)
  doc.text(`Expiry Date: ${expires}`, 45, 166)
  doc.text(`Certificate No: ${certNumber}`, 45, 174)

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 132, 141, 34, 34)

    doc.setFontSize(7)
    doc.setTextColor(107, 114, 128)
    doc.text('Scan to verify', 149, 179, { align: 'center' })
  }

  doc.setDrawColor(17, 24, 39)
  doc.line(198, 153, 255, 153)

  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)
  doc.text(providerName, 226.5, 162, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(75, 85, 99)
  doc.text('Training Provider', 226.5, 169, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)

  const footer = 'This certificate can be verified online using the certificate number or QR code.'
  const footerLines = doc.splitTextToSize(footer, 210)
  doc.text(footerLines, 148.5, 186, { align: 'center' })

  if (verificationUrl) {
    doc.setFontSize(6)
    doc.setTextColor(156, 163, 175)
    doc.text(verificationUrl, 148.5, 201, { align: 'center' })
  }

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
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
    } = body

    if (!to || !learnerName || !courseName || !verificationUrl) {
      return Response.json(
        { error: 'Missing required email fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    const pdfBuffer = await generateCertificatePdfBuffer({
      learnerName,
      courseName,
      issueDate,
      expiryDate,
      certificateNumber,
      verificationUrl,
      businessName: fromName,
    })

    const filename = createSafeFilename(
      learnerName,
      certificateNumber || 'certificate'
    )

    const { data, error } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject: `Your ${courseName} certificate`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
          <h1 style="font-size: 24px; margin-bottom: 8px;">
            Your certificate is ready
          </h1>

          <p style="font-size: 16px; color: #4b5563;">
            Hi ${learnerName},
          </p>

          <p style="font-size: 16px; color: #4b5563;">
            Your certificate for <strong>${courseName}</strong> has been issued.
          </p>

          <p style="font-size: 16px; color: #4b5563;">
            A PDF copy of your certificate is attached to this email.
          </p>

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
      attachments: [
        {
          filename,
          content: pdfBuffer,
        },
      ],
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