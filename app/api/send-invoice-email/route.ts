import { Resend } from 'resend'
import jsPDF from 'jspdf'
import { createClient } from '@supabase/supabase-js'
import {
  buildEmailHtml,
  detailRow,
  detailsBox,
  escapeHtml,
  getErrorMessage,
  getEmailTemplate,
  replacePlaceholders,
  textToHtml,
} from '@/lib/emailTemplates'
import { emailTemplateDefaults } from '@/lib/emailTemplateDefaults'
import { getInvoiceEmailSuccessUpdate } from '@/lib/invoiceWorkflow'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const createSafeFilename = (invoiceNumber: string) => {
  const safeInvoiceNumber = invoiceNumber
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `${safeInvoiceNumber || 'invoice'}.pdf`
}

const generateInvoicePdfBuffer = ({
  invoiceNumber,
  recipientName,
  courseName,
  amount,
  vatAmount,
  totalAmount,
  dueDate,
  poNumber,
  status,
  businessName,
  businessEmail,
  businessPhone,
  paymentDetails,
}: {
  invoiceNumber: string
  recipientName: string
  courseName?: string
  amount?: number | string
  vatAmount?: number | string
  totalAmount?: number | string
  dueDate?: string
  poNumber?: string
  status?: string
  businessName?: string
  businessEmail?: string
  businessPhone?: string
  paymentDetails?: string
}) => {
  const doc = new jsPDF()

  const netAmount = Number(amount || 0)
  const vat = Number(vatAmount || 0)
  const total = Number(totalAmount || amount || 0)

  const providerName = businessName || 'Training Provider'
  const invoiceStatus = status || 'draft'
  const invoiceDate = new Date().toLocaleDateString()

  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, 210, 297, 'F')

  doc.setFillColor(255, 255, 255)
  doc.roundedRect(12, 12, 186, 273, 3, 3, 'F')

  doc.setFillColor(17, 24, 39)
  doc.roundedRect(12, 12, 186, 35, 3, 3, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.text('INVOICE', 22, 34)

  doc.setFontSize(11)
  doc.text(providerName, 188, 26, { align: 'right' })

  if (businessEmail) {
    doc.setFontSize(8)
    doc.text(businessEmail, 188, 33, { align: 'right' })
  }

  if (businessPhone) {
    doc.text(businessPhone, 188, 39, { align: 'right' })
  }

  doc.setTextColor(17, 24, 39)

  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(22, 60, 76, poNumber ? 50 : 42, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('INVOICE DETAILS', 28, 69)

  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text(`Invoice No: ${invoiceNumber}`, 28, 78)
  doc.text(`Date: ${invoiceDate}`, 28, 85)
  doc.text(`Due Date: ${dueDate || 'Not set'}`, 28, 92)
  doc.text(`Status: ${invoiceStatus}`, 28, 99)

  if (poNumber) {
    doc.text(`PO No: ${poNumber}`, 28, 106)
  }

  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(112, 60, 76, 42, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('BILL TO', 118, 69)

  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)

  const recipientLines = doc.splitTextToSize(recipientName || 'Recipient', 65)
  doc.text(recipientLines, 118, 80)

  if (courseName) {
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    const courseLines = doc.splitTextToSize(courseName, 65)
    doc.text(courseLines, 118, 91)
  }

  doc.setFillColor(17, 24, 39)
  doc.roundedRect(22, 126, 166, 12, 2, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('Description', 28, 134)
  doc.text('Net', 128, 134)
  doc.text('VAT', 150, 134)
  doc.text('Total', 172, 134)

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(229, 231, 235)
  doc.rect(22, 138, 166, 22, 'D')

  doc.setTextColor(17, 24, 39)
  doc.setFontSize(10)

  const description = courseName || 'Training course delivery'
  const descriptionLines = doc.splitTextToSize(description, 88)
  doc.text(descriptionLines, 28, 150)

  doc.text(`\u00A3${netAmount.toFixed(2)}`, 128, 150)
  doc.text(`\u00A3${vat.toFixed(2)}`, 150, 150)
  doc.text(`\u00A3${total.toFixed(2)}`, 172, 150)

  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(112, 176, 76, 42, 3, 3, 'FD')

  doc.setFontSize(10)
  doc.setTextColor(75, 85, 99)
  doc.text('Net Amount', 120, 188)
  doc.text(`\u00A3${netAmount.toFixed(2)}`, 180, 188, { align: 'right' })

  doc.text('VAT', 120, 200)
  doc.text(`\u00A3${vat.toFixed(2)}`, 180, 200, { align: 'right' })

  doc.setDrawColor(209, 213, 219)
  doc.line(120, 206, 180, 206)

  doc.setFontSize(14)
  doc.setTextColor(17, 24, 39)
  doc.text('Total', 120, 214)
  doc.text(`\u00A3${total.toFixed(2)}`, 180, 214, { align: 'right' })

  if (paymentDetails) {
    doc.setFillColor(255, 247, 237)
    doc.setDrawColor(254, 215, 170)
    doc.roundedRect(22, 176, 80, 50, 3, 3, 'FD')

    doc.setFontSize(9)
    doc.setTextColor(154, 52, 18)
    doc.text('PAYMENT DETAILS', 28, 186)

    doc.setFontSize(8)
    doc.setTextColor(67, 20, 7)

    const paymentLines = doc.splitTextToSize(paymentDetails, 68)
    doc.text(paymentLines, 28, 196)
  }

  doc.setDrawColor(229, 231, 235)
  doc.line(22, 265, 188, 265)

  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text('Generated by Hercules OS', 22, 274)

  doc.text(
    'Thank you for your business.',
    188,
    274,
    { align: 'right' }
  )

  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const {
      to,
      invoiceNumber,
      clientName,
      recipientName,
      courseName,
      amount,
      vatAmount,
      totalAmount,
      dueDate,
      poNumber,
      status,
      businessName,
      businessEmail,
      businessPhone,
      paymentDetails,
      organisationId,
      invoiceId,
    } = body

    const finalRecipientName = recipientName || clientName

    if (!to || !invoiceNumber || !finalRecipientName || !totalAmount) {
      return Response.json(
        { error: 'Missing required invoice email fields' },
        { status: 400 }
      )
    }

    const fromName = businessName || 'Hercules OS'

    let invoiceRecord: any = null

    if (invoiceId && organisationId) {
      const { data: invoice, error: invoiceFetchError } = await supabaseAdmin
        .from('invoices')
        .select('id, status, secured_at')
        .eq('id', invoiceId)
        .eq('organisation_id', organisationId)
        .single()

      if (invoiceFetchError || !invoice) {
        return Response.json(
          { error: invoiceFetchError?.message || 'Invoice not found' },
          { status: 404 }
        )
      }

      if (!invoice.secured_at) {
        return Response.json(
          {
            error:
              'Secure this invoice before sending so it cannot be changed after it has been sent.',
          },
          { status: 400 }
        )
      }

      invoiceRecord = invoice
    }

    const template = await getEmailTemplate(
      'invoice_email',
      organisationId,
      emailTemplateDefaults.invoiceEmail
    )

    const pdfBuffer = generateInvoicePdfBuffer({
      invoiceNumber,
      recipientName: finalRecipientName,
      courseName,
      amount,
      vatAmount,
      totalAmount,
      dueDate,
      poNumber,
      status,
      businessName: fromName,
      businessEmail,
      businessPhone,
      paymentDetails,
    })

    const filename = createSafeFilename(invoiceNumber)

    const safeCourseName = escapeHtml(courseName || '')
    const safeFromName = escapeHtml(fromName)
    const safeBusinessEmail = escapeHtml(businessEmail || '')
    const safeBusinessPhone = escapeHtml(businessPhone || '')
    const safePaymentDetails = escapeHtml(paymentDetails || '')
    const invoiceAmount = `\u00A3${Number(totalAmount || 0).toFixed(2)}`
    const placeholderValues = {
      clientName: finalRecipientName || '',
      client_name: finalRecipientName || '',
      delegate_name: finalRecipientName || '',
      learnerName: finalRecipientName || '',
      learner_name: finalRecipientName || '',
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
      certificateNumber: '',
      certificate_number: '',
      issueDate: '',
      issue_date: '',
      expiryDate: '',
      expiry_date: '',
      verificationUrl: '',
      verification_url: '',
      invoiceNumber: invoiceNumber || '',
      invoice_number: invoiceNumber || '',
      invoiceAmount,
      invoice_amount: invoiceAmount,
      poNumber: poNumber || '',
      po_number: poNumber || '',
      dueDate: dueDate || 'Not set',
      due_date: dueDate || 'Not set',
      businessName: fromName,
      business_name: fromName,
      businessEmail: businessEmail || '',
      business_email: businessEmail || '',
      businessPhone: businessPhone || '',
      business_phone: businessPhone || '',
      paymentDetails: paymentDetails || '',
    }
    const subject = replacePlaceholders(template.subject, placeholderValues)
    const emailBody = replacePlaceholders(template.body, placeholderValues)
    const paymentDetailsHtml = safePaymentDetails
      ? `
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 24px 0;">
          <h2 style="font-size: 18px; margin-top: 0;">Payment Details</h2>
          ${textToHtml(paymentDetails || '')}
        </div>
      `
      : ''

    const { data, error } = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [to],
      subject,
      html: buildEmailHtml({
        subject,
        body: emailBody,
        detailsHtml: [
          detailsBox([
            detailRow('Invoice No', invoiceNumber),
            poNumber ? detailRow('PO No', poNumber) : '',
            safeCourseName ? detailRow('Course', courseName) : '',
            detailRow('Recipient', finalRecipientName),
            detailRow('Net Amount', `\u00A3${Number(amount || 0).toFixed(2)}`),
            detailRow('VAT', `\u00A3${Number(vatAmount || 0).toFixed(2)}`),
            detailRow('Total', invoiceAmount),
            detailRow('Due Date', dueDate || 'Not set'),
            detailRow('Status', status || 'draft'),
          ].join('')),
          paymentDetailsHtml,
        ].join(''),
        footerHtml: [
          `Sent by ${safeFromName}`,
          safeBusinessEmail ? `<br>Email: ${safeBusinessEmail}` : '',
          safeBusinessPhone ? `<br>Phone: ${safeBusinessPhone}` : '',
        ].join(''),
      }),
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

    if (invoiceRecord && organisationId) {
      const sentUpdate = getInvoiceEmailSuccessUpdate(true, invoiceRecord)

      if (!sentUpdate) {
        return Response.json({ success: true, data })
      }

      const { error: updateError } = await supabaseAdmin
        .from('invoices')
        .update(sentUpdate)
        .eq('id', invoiceRecord.id)
        .eq('organisation_id', organisationId)

      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 })
      }
    }

    return Response.json({ success: true, data })
  } catch (error: unknown) {
    return Response.json(
      { error: getErrorMessage(error, 'Failed to send invoice email') },
      { status: 500 }
    )
  }
}
