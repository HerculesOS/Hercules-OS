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

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [securedFilter, setSecuredFilter] = useState('all')
  const [unpaidOnly, setUnpaidOnly] = useState(false)
  const [sortBy, setSortBy] = useState('newest')

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

  const invoiceDate = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString()
    : new Date().toLocaleDateString()

  const securedDate = invoice.secured_at
    ? new Date(invoice.secured_at).toLocaleDateString()
    : ''

  const paidDate = invoice.paid_at
    ? new Date(invoice.paid_at).toLocaleDateString()
    : ''

  // Background
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, 210, 297, 'F')

  // Main white panel
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(12, 12, 186, 273, 3, 3, 'F')

  // Header
  doc.setFillColor(17, 24, 39)
  doc.roundedRect(12, 12, 186, 35, 3, 3, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.text('INVOICE', 22, 34)

  doc.setFontSize(11)
  doc.text(businessName, 188, 26, { align: 'right' })

  if (businessEmail) {
    doc.setFontSize(8)
    doc.text(businessEmail, 188, 33, { align: 'right' })
  }

  if (businessPhone) {
    doc.text(businessPhone, 188, 39, { align: 'right' })
  }

  // Reset colour
  doc.setTextColor(17, 24, 39)

  // Invoice meta box
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(22, 60, 76, 42, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('INVOICE DETAILS', 28, 69)

  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text(`Invoice No: ${invoice.invoice_number || invoice.id}`, 28, 78)
  doc.text(`Date: ${invoiceDate}`, 28, 85)
  doc.text(`Due Date: ${invoice.due_date || 'Not set'}`, 28, 92)
  doc.text(`Status: ${invoice.status || 'draft'}`, 28, 99)

  // Bill to box
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(112, 60, 76, 42, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('BILL TO', 118, 69)

  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)
  doc.text(invoice.client_name || 'Client', 118, 80)

  // Business address
  if (businessAddress) {
    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)

    const addressLines = doc.splitTextToSize(businessAddress, 65)
    doc.text(addressLines, 118, 89)
  }

  // Status badges
  let badgeX = 22

  if (invoice.secured_at) {
    doc.setFillColor(229, 231, 235)
    doc.setTextColor(55, 65, 81)
    doc.roundedRect(badgeX, 112, 36, 9, 2, 2, 'F')
    doc.setFontSize(8)
    doc.text('SECURED', badgeX + 18, 118, { align: 'center' })
    badgeX += 42
  }

  if (invoice.status === 'paid') {
    doc.setFillColor(220, 252, 231)
    doc.setTextColor(21, 128, 61)
    doc.roundedRect(badgeX, 112, 28, 9, 2, 2, 'F')
    doc.setFontSize(8)
    doc.text('PAID', badgeX + 14, 118, { align: 'center' })
  }

  // Table header
  doc.setFillColor(17, 24, 39)
  doc.roundedRect(22, 132, 166, 12, 2, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.text('Description', 28, 140)
  doc.text('Net', 128, 140)
  doc.text('VAT', 150, 140)
  doc.text('Total', 172, 140)

  // Table row
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(229, 231, 235)
  doc.rect(22, 144, 166, 20, 'D')

  doc.setTextColor(17, 24, 39)
  doc.setFontSize(10)
  doc.text('Training course delivery', 28, 156)

  doc.text(`£${netAmount.toFixed(2)}`, 128, 156)
  doc.text(`£${vatAmount.toFixed(2)}`, 150, 156)
  doc.text(`£${totalAmount.toFixed(2)}`, 172, 156)

  // Totals box
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(112, 178, 76, 42, 3, 3, 'FD')

  doc.setFontSize(10)
  doc.setTextColor(75, 85, 99)
  doc.text('Net Amount', 120, 190)
  doc.text(`£${netAmount.toFixed(2)}`, 180, 190, { align: 'right' })

  doc.text(`VAT (${invoice.vat_rate || 0}%)`, 120, 202)
  doc.text(`£${vatAmount.toFixed(2)}`, 180, 202, { align: 'right' })

  doc.setDrawColor(209, 213, 219)
  doc.line(120, 208, 180, 208)

  doc.setFontSize(14)
  doc.setTextColor(17, 24, 39)
  doc.text('Total', 120, 216)
  doc.text(`£${totalAmount.toFixed(2)}`, 180, 216, { align: 'right' })

  // Payment details
  if (paymentDetails) {
    doc.setFillColor(255, 247, 237)
    doc.setDrawColor(254, 215, 170)
    doc.roundedRect(22, 178, 80, 42, 3, 3, 'FD')

    doc.setFontSize(9)
    doc.setTextColor(154, 52, 18)
    doc.text('PAYMENT DETAILS', 28, 188)

    doc.setFontSize(8)
    doc.setTextColor(67, 20, 7)

    const paymentLines = doc.splitTextToSize(paymentDetails, 68)
    doc.text(paymentLines, 28, 198)
  }

  // Record details
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)

  let recordY = 238

  if (securedDate) {
    doc.text(`Secured on: ${securedDate}`, 22, recordY)
    recordY += 6
  }

  if (paidDate) {
    doc.text(`Paid on: ${paidDate}`, 22, recordY)
    recordY += 6
  }

  if (businessWebsite) {
    doc.text(`Website: ${businessWebsite}`, 22, recordY)
  }

  // Footer
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

  doc.save(`${invoice.invoice_number || 'invoice'}.pdf`)
}

const sendInvoiceEmail = async (invoice: any) => {
  const recipientEmail =
    recipientEmails[invoice.id] || getClientEmailForInvoice(invoice)

  if (!recipientEmail) {
    alert('Enter a recipient email first')
    return
  }

  const booking = bookings.find((b) => b.id === invoice.booking_id)

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
      courseName: booking?.course_name || 'Training course',
      amount: invoice.amount,
      vatAmount: invoice.vat_amount,
      totalAmount: invoice.total_amount || invoice.amount,
      dueDate: invoice.due_date,
      status: invoice.status,
      businessName: organisation?.name || 'Hercules OS',
      businessEmail: organisation?.email || '',
      businessPhone: organisation?.phone || '',
      paymentDetails: organisation?.invoice_payment_details || '',
      organisationId,
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

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setSecuredFilter('all')
    setUnpaidOnly(false)
    setSortBy('newest')
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

  const filteredInvoices = invoices
    .filter((invoice) => {
      const searchableText = `
        ${invoice.invoice_number || ''}
        ${invoice.client_name || ''}
        ${invoice.status || ''}
      `.toLowerCase()

      const matchesSearch = searchableText.includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || invoice.status === statusFilter

      const matchesSecured =
        securedFilter === 'all' ||
        (securedFilter === 'secured' && invoice.secured_at) ||
        (securedFilter === 'unsecured' && !invoice.secured_at)

      const matchesUnpaid =
        !unpaidOnly || invoice.status !== 'paid'

      return matchesSearch && matchesStatus && matchesSecured && matchesUnpaid
    })
    .sort((a, b) => {
      const totalA = Number(a.total_amount || a.amount || 0)
      const totalB = Number(b.total_amount || b.amount || 0)

      const createdA = new Date(a.created_at).getTime()
      const createdB = new Date(b.created_at).getTime()

      if (sortBy === 'oldest') return createdA - createdB
      if (sortBy === 'highest') return totalB - totalA
      if (sortBy === 'lowest') return totalA - totalB

      return createdB - createdA
    })

  const filteredTotalValue = filteredInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
    0
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
          Create, edit, secure, filter, download, email and track client invoices
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

      <div className="bg-white border rounded-2xl p-5 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            className="border p-3 rounded-lg md:col-span-2"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border p-3 rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
          </select>

          <select
            className="border p-3 rounded-lg"
            value={securedFilter}
            onChange={(e) => setSecuredFilter(e.target.value)}
          >
            <option value="all">All Security</option>
            <option value="secured">Secured</option>
            <option value="unsecured">Unsecured</option>
          </select>

          <select
            className="border p-3 rounded-lg"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Value</option>
            <option value="lowest">Lowest Value</option>
          </select>

          <button
            className={`border p-3 rounded-lg ${
              unpaidOnly ? 'bg-black text-white' : ''
            }`}
            onClick={() => setUnpaidOnly(!unpaidOnly)}
          >
            Unpaid Only
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
          <p className="text-sm text-gray-500">
            Showing {filteredInvoices.length} of {invoices.length} invoices · Filtered value £{filteredTotalValue.toFixed(2)}
          </p>

          <button
            className="border px-4 py-2 rounded-lg text-sm w-fit"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
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
          {filteredInvoices.map((invoice) => {
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

          {filteredInvoices.length === 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
              No invoices match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}