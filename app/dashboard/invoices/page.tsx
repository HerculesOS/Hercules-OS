'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import jsPDF from 'jspdf'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')

  const [bookingId, setBookingId] = useState('')
  const [amount, setAmount] = useState('')
  const [vatRate, setVatRate] = useState('0')
  const [dueDate, setDueDate] = useState('')

  const [recipientEmails, setRecipientEmails] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single()

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

    setOrganisation(organisationData || null)
    setBookings(bookingsData || [])
    setInvoices(invoicesData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const createInvoice = async () => {
    if (!bookingId || !amount) {
      alert('Booking and amount are required')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const selectedBooking = bookings.find((b) => b.id === bookingId)

    const net = Number(amount)
    const vat = net * (Number(vatRate) / 100)
    const total = net + vat

    const invoiceNumber = `INV-${String(invoices.length + 1).padStart(4, '0')}`

    await supabase.from('invoices').insert({
      user_id: userData.user?.id,
      organisation_id: organisationId,
      booking_id: bookingId,
      client_name: selectedBooking?.client_name,
      invoice_number: invoiceNumber,
      amount: net,
      vat_rate: Number(vatRate),
      vat_amount: vat,
      total_amount: total,
      due_date: dueDate || null,
      status: 'draft',
    })

    setBookingId('')
    setAmount('')
    setVatRate('0')
    setDueDate('')

    load()
  }

  const markAsPaid = async (invoiceId: string) => {
    await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    load()
  }

  const markAsSent = async (invoiceId: string) => {
    await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    load()
  }

  const generateInvoicePDF = (invoice: any) => {
    const doc = new jsPDF()

    const netAmount = Number(invoice.amount || 0)
    const vatAmount = Number(invoice.vat_amount || 0)
    const totalAmount = Number(invoice.total_amount || invoice.amount || 0)

    const businessName = organisation?.name || 'Training Provider'
    const businessEmail = organisation?.email || ''
    const businessPhone = organisation?.phone || ''
    const businessAddress = organisation?.address || ''
    const businessWebsite = organisation?.website || ''
    const paymentDetails = organisation?.invoice_payment_details || ''

    doc.setFontSize(24)
    doc.text('Invoice', 20, 25)

    doc.setFontSize(16)
    doc.text(businessName, 20, 40)

    doc.setFontSize(10)

    let y = 48

    if (businessAddress) {
      const addressLines = doc.splitTextToSize(businessAddress, 80)
      doc.text(addressLines, 20, y)
      y += addressLines.length * 5
    }

    if (businessEmail) {
      doc.text(`Email: ${businessEmail}`, 20, y)
      y += 5
    }

    if (businessPhone) {
      doc.text(`Phone: ${businessPhone}`, 20, y)
      y += 5
    }

    if (businessWebsite) {
      doc.text(`Website: ${businessWebsite}`, 20, y)
      y += 5
    }

    doc.setFontSize(12)
    doc.text(`Invoice No: ${invoice.invoice_number || invoice.id}`, 130, 40)
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 130, 48)
    doc.text(`Due Date: ${invoice.due_date || 'Not set'}`, 130, 56)
    doc.text(`Status: ${invoice.status}`, 130, 64)

    doc.line(20, 80, 190, 80)

    doc.setFontSize(16)
    doc.text('Bill To', 20, 95)

    doc.setFontSize(12)
    doc.text(`${invoice.client_name}`, 20, 108)

    doc.setFontSize(16)
    doc.text('Invoice Summary', 20, 132)

    doc.setFontSize(12)
    doc.text('Description', 20, 148)
    doc.text('Amount', 160, 148)

    doc.line(20, 153, 190, 153)

    doc.text('First aid training course', 20, 165)
    doc.text(`£${netAmount.toFixed(2)}`, 160, 165)

    doc.line(20, 174, 190, 174)

    doc.text('Net Amount:', 120, 190)
    doc.text(`£${netAmount.toFixed(2)}`, 160, 190)

    doc.text(`VAT (${invoice.vat_rate || 0}%):`, 120, 200)
    doc.text(`£${vatAmount.toFixed(2)}`, 160, 200)

    doc.setFontSize(14)
    doc.text('Total:', 120, 215)
    doc.text(`£${totalAmount.toFixed(2)}`, 160, 215)

    if (paymentDetails) {
      doc.setFontSize(14)
      doc.text('Payment Details', 20, 235)

      doc.setFontSize(10)
      const paymentLines = doc.splitTextToSize(paymentDetails, 160)
      doc.text(paymentLines, 20, 245)
    }

    doc.setFontSize(10)
    doc.text('Generated by Hercules OS', 20, 285)

    doc.save(`${invoice.invoice_number || 'invoice'}.pdf`)
  }

  const sendInvoiceEmail = async (invoice: any) => {
    const recipientEmail = recipientEmails[invoice.id]

    if (!recipientEmail) {
      alert('Enter a recipient email first')
      return
    }

    setSendingId(invoice.id)

    const response = await fetch('/api/send-invoice-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
        invoiceNumber: invoice.invoice_number || invoice.id,
        clientName: invoice.client_name,
        amount: invoice.amount,
        vatAmount: invoice.vat_amount,
        totalAmount: invoice.total_amount || invoice.amount,
        dueDate: invoice.due_date,
        status: invoice.status,
        businessName: organisation?.name || 'Hercules OS',
        businessEmail: organisation?.email || '',
        businessPhone: organisation?.phone || '',
        paymentDetails: organisation?.invoice_payment_details || '',
      }),
    })

    const result = await response.json()

    setSendingId('')

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Email failed')
      return
    }

    await markAsSent(invoice.id)

    alert('Invoice email sent')

    setRecipientEmails((previous) => ({
      ...previous,
      [invoice.id]: '',
    }))
  }

  const totalRevenue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
    0
  )

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status !== 'paid'
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Invoices
        </h1>

        <p className="text-gray-500 mt-1">
          Create, download, email and track client invoices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Total Invoice Value</p>
          <h2 className="text-3xl font-bold mt-2">
            £{totalRevenue.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Invoices</p>
          <h2 className="text-3xl font-bold mt-2">
            {invoices.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Outstanding</p>
          <h2 className="text-3xl font-bold mt-2">
            {unpaidInvoices.length}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Create Invoice
          </h2>

          <div className="flex flex-col gap-3">
            <select
              className="border p-3 rounded-lg"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            >
              <option value="">Select Booking</option>

              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.client_name} - {booking.course_name}
                </option>
              ))}
            </select>

            <input
              className="border p-3 rounded-lg"
              placeholder="Net amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="VAT rate %"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <button
              className="bg-black text-white p-3 rounded-lg"
              onClick={createInvoice}
            >
              Create Invoice
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 grid gap-4">
          {invoices.map((invoice) => {
            const netAmount = Number(invoice.amount || 0)
            const vatAmount = Number(invoice.vat_amount || 0)
            const totalAmount = Number(invoice.total_amount || invoice.amount || 0)

            return (
              <div
                key={invoice.id}
                className="bg-white border rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {invoice.invoice_number || 'Invoice'}
                    </h2>

                    <p className="text-gray-500 mt-1">
                      {invoice.client_name}
                    </p>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-sm ${
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : invoice.status === 'sent'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {invoice.status}
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600 space-y-1">
                  <p>Net: £{netAmount.toFixed(2)}</p>
                  <p>VAT: £{vatAmount.toFixed(2)}</p>
                  <p>Total: £{totalAmount.toFixed(2)}</p>
                  <p>Due: {invoice.due_date || 'Not set'}</p>

                  {invoice.paid_at && (
                    <p>
                      Paid: {new Date(invoice.paid_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <input
                    className="border p-3 rounded-lg"
                    placeholder="Recipient email"
                    value={recipientEmails[invoice.id] || ''}
                    onChange={(e) =>
                      setRecipientEmails((previous) => ({
                        ...previous,
                        [invoice.id]: e.target.value,
                      }))
                    }
                  />

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="bg-black text-white px-4 py-2 rounded-lg"
                      onClick={() => generateInvoicePDF(invoice)}
                    >
                      Download PDF
                    </button>

                    <button
                      className="border px-4 py-2 rounded-lg disabled:bg-gray-100"
                      onClick={() => sendInvoiceEmail(invoice)}
                      disabled={sendingId === invoice.id}
                    >
                      {sendingId === invoice.id ? 'Sending...' : 'Send Email'}
                    </button>

                    {invoice.status === 'draft' && (
                      <button
                        className="border px-4 py-2 rounded-lg"
                        onClick={() => markAsSent(invoice.id)}
                      >
                        Mark Sent
                      </button>
                    )}

                    {invoice.status !== 'paid' && (
                      <button
                        className="border px-4 py-2 rounded-lg"
                        onClick={() => markAsPaid(invoice.id)}
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {invoices.length === 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
              No invoices yet. Create your first invoice from a booking.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}