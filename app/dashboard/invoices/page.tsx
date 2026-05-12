'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import jsPDF from 'jspdf'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')

  const [bookingId, setBookingId] = useState('')
  const [amount, setAmount] = useState('')
  const [vatRate, setVatRate] = useState('0')
  const [dueDate, setDueDate] = useState('')

  const [recipientEmails, setRecipientEmails] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState('')

  const [editingId, setEditingId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [editBookingId, setEditBookingId] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editVatRate, setEditVatRate] = useState('0')
  const [editDueDate, setEditDueDate] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single()

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

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
    setClients(clientsData || [])
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

    const { error } = await supabase.from('invoices').insert({
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

    if (error) {
      alert(error.message)
      return
    }

    setBookingId('')
    setAmount('')
    setVatRate('0')
    setDueDate('')

    load()
  }

  const startEditing = (invoice: any) => {
    if (invoice.secured_at || invoice.status === 'paid') {
      alert('This invoice is secured or paid and cannot be edited.')
      return
    }

    setEditingId(invoice.id)
    setEditBookingId(invoice.booking_id || '')
    setEditAmount(invoice.amount ? String(invoice.amount) : '')
    setEditVatRate(invoice.vat_rate ? String(invoice.vat_rate) : '0')
    setEditDueDate(invoice.due_date || '')
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditBookingId('')
    setEditAmount('')
    setEditVatRate('0')
    setEditDueDate('')
  }

  const saveInvoiceEdit = async (invoiceId: string) => {
    const invoiceToEdit = invoices.find((invoice) => invoice.id === invoiceId)

    if (invoiceToEdit?.secured_at || invoiceToEdit?.status === 'paid') {
      alert('This invoice is secured or paid and cannot be edited.')
      cancelEditing()
      return
    }

    if (!editBookingId || !editAmount) {
      alert('Booking and amount are required')
      return
    }

    setSavingEdit(true)

    const selectedBooking = bookings.find((b) => b.id === editBookingId)

    const net = Number(editAmount)
    const vat = net * (Number(editVatRate) / 100)
    const total = net + vat

    const { error } = await supabase
      .from('invoices')
      .update({
        booking_id: editBookingId,
        client_name: selectedBooking?.client_name,
        amount: net,
        vat_rate: Number(editVatRate),
        vat_amount: vat,
        total_amount: total,
        due_date: editDueDate || null,
      })
      .eq('id', invoiceId)

    setSavingEdit(false)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    load()
  }

  const secureInvoice = async (invoiceId: string) => {
    const confirmSecure = confirm(
      'Are you sure you want to secure this invoice? Once secured, it cannot be edited.'
    )

    if (!confirmSecure) return

    const { error } = await supabase
      .from('invoices')
      .update({
        secured_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const markAsPaid = async (invoiceId: string) => {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        secured_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const markAsSent = async (invoiceId: string) => {
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const markAsDraft = async (invoiceId: string) => {
    const invoiceToUpdate = invoices.find((invoice) => invoice.id === invoiceId)

    if (invoiceToUpdate?.secured_at || invoiceToUpdate?.status === 'paid') {
      alert('This invoice is secured or paid and cannot be moved back to draft.')
      return
    }

    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'draft',
        sent_at: null,
        paid_at: null,
      })
      .eq('id', invoiceId)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const getClientEmailForInvoice = (invoice: any) => {
    const booking = bookings.find((b) => b.id === invoice.booking_id)

    if (!booking) return ''

    const client = clients.find((c) => c.id === booking.client_id)

    return client?.email || ''
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

    if (invoice.secured_at) {
      doc.text(`Secured: ${new Date(invoice.secured_at).toLocaleDateString()}`, 130, 72)
    }

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
    const recipientEmail =
      recipientEmails[invoice.id] || getClientEmailForInvoice(invoice)

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

  const securedInvoices = invoices.filter(
    (invoice) => invoice.secured_at
  )

  const getStatusStyle = (status: string) => {
    if (status === 'paid') {
      return 'bg-green-100 text-green-700'
    }

    if (status === 'sent') {
      return 'bg-blue-100 text-blue-700'
    }

    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Invoices
        </h1>

        <p className="text-gray-500 mt-1">
          Create, edit, secure, download, email and track client invoices
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Secured</p>
          <h2 className="text-3xl font-bold mt-2">
            {securedInvoices.length}
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
            const savedClientEmail = getClientEmailForInvoice(invoice)
            const isEditing = editingId === invoice.id
            const isLocked = Boolean(invoice.secured_at) || invoice.status === 'paid'

            return (
              <div
                key={invoice.id}
                className="bg-white border rounded-2xl p-5 shadow-sm"
              >
                {!isEditing ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {invoice.invoice_number || 'Invoice'}
                        </h2>

                        <p className="text-gray-500 mt-1">
                          {invoice.client_name}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div
                          className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                            invoice.status
                          )}`}
                        >
                          {invoice.status}
                        </div>

                        {invoice.secured_at && (
                          <div className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm">
                            Secured
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600 space-y-1">
                      <p>Net: £{netAmount.toFixed(2)}</p>
                      <p>VAT: £{vatAmount.toFixed(2)}</p>
                      <p>Total: £{totalAmount.toFixed(2)}</p>
                      <p>Due: {invoice.due_date || 'Not set'}</p>

                      {invoice.secured_at && (
                        <p>
                          Secured: {new Date(invoice.secured_at).toLocaleDateString()}
                        </p>
                      )}

                      {savedClientEmail && (
                        <p>Client Email: {savedClientEmail}</p>
                      )}

                      {invoice.paid_at && (
                        <p>
                          Paid: {new Date(invoice.paid_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex flex-col gap-3">
                      <input
                        className="border p-3 rounded-lg"
                        placeholder={savedClientEmail || 'Recipient email'}
                        value={recipientEmails[invoice.id] || ''}
                        onChange={(e) =>
                          setRecipientEmails((previous) => ({
                            ...previous,
                            [invoice.id]: e.target.value,
                          }))
                        }
                      />

                      {savedClientEmail && (
                        <p className="text-sm text-gray-500">
                          Leave blank to send to saved client email.
                        </p>
                      )}

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

                        {!isLocked && (
                          <button
                            className="border px-4 py-2 rounded-lg"
                            onClick={() => startEditing(invoice)}
                          >
                            Edit
                          </button>
                        )}

                        {!invoice.secured_at && invoice.status !== 'paid' && (
                          <button
                            className="border px-4 py-2 rounded-lg"
                            onClick={() => secureInvoice(invoice.id)}
                          >
                            Secure Invoice
                          </button>
                        )}

                        {invoice.status !== 'draft' && !invoice.secured_at && invoice.status !== 'paid' && (
                          <button
                            className="border px-4 py-2 rounded-lg"
                            onClick={() => markAsDraft(invoice.id)}
                          >
                            Mark Draft
                          </button>
                        )}

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

                      {isLocked && (
                        <p className="text-sm text-gray-500">
                          This invoice is locked because it is secured or paid.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-5">
                      <h2 className="text-xl font-semibold">
                        Edit Invoice
                      </h2>

                      <p className="text-gray-500 mt-1">
                        Update invoice details and totals
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        className="border p-3 rounded-lg md:col-span-2"
                        value={editBookingId}
                        onChange={(e) => setEditBookingId(e.target.value)}
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
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                      />

                      <input
                        className="border p-3 rounded-lg"
                        placeholder="VAT rate %"
                        value={editVatRate}
                        onChange={(e) => setEditVatRate(e.target.value)}
                      />

                      <input
                        className="border p-3 rounded-lg md:col-span-2"
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                      />
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mt-4 text-sm text-gray-700">
                      <p>
                        New VAT: £
                        {(Number(editAmount || 0) * (Number(editVatRate || 0) / 100)).toFixed(2)}
                      </p>

                      <p className="font-semibold mt-1">
                        New Total: £
                        {(
                          Number(editAmount || 0) +
                          Number(editAmount || 0) * (Number(editVatRate || 0) / 100)
                        ).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-5">
                      <button
                        className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                        onClick={() => saveInvoiceEdit(invoice.id)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>

                      <button
                        className="border px-4 py-2 rounded-lg"
                        onClick={cancelEditing}
                        disabled={savingEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
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