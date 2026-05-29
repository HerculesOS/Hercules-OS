'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate } from '@/lib/formatters'
import { getNextInvoiceNumber, isDuplicateInvoiceNumberError } from '@/lib/invoiceNumbers'
import { parseOptionalNonNegativeNumber, parseRequiredPositiveNumber } from '@/lib/numberValidation'
import jsPDF from 'jspdf'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [bookingDelegateLinks, setBookingDelegateLinks] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')

  const [bookingId, setBookingId] = useState('')
  const [invoiceTargetType, setInvoiceTargetType] = useState('booking_client')
  const [invoiceClientId, setInvoiceClientId] = useState('')
  const [invoiceDelegateId, setInvoiceDelegateId] = useState('')
  const [customRecipientName, setCustomRecipientName] = useState('')
  const [customRecipientEmail, setCustomRecipientEmail] = useState('')
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

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const panelClass =
    'bg-white border border-slate-200 rounded-lg'

  const panelHeaderClass =
    'px-4 py-3 border-b border-slate-200'

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
      .order('company', { ascending: true })

    const { data: delegatesData } = await supabase
      .from('delegates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('full_name', { ascending: true })

    const { data: bookingDelegateLinksData } = await supabase
      .from('booking_delegates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('date', { ascending: false })

    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

    setOrganisation(organisationData || null)
    setClients(clientsData || [])
    setDelegates(delegatesData || [])
    setBookingDelegateLinks(bookingDelegateLinksData || [])
    setBookings(bookingsData || [])
    setInvoices(invoicesData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const getFormattedDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return 'Not set'

    const dateOnly = String(dateValue).split('T')[0]

    return formatAppDate(dateOnly, organisation)
  }

  const getBookingDeliveryType = (booking: any) => {
    return booking?.course_delivery_type || 'private'
  }

  const getClientById = (clientId: string | null | undefined) => {
    if (!clientId) return null
    return clients.find((client) => client.id === clientId)
  }

  const getDelegateById = (delegateId: string | null | undefined) => {
    if (!delegateId) return null
    return delegates.find((delegate) => delegate.id === delegateId)
  }

  const getBookingById = (id: string | null | undefined) => {
    if (!id) return null
    return bookings.find((booking) => booking.id === id)
  }

  const getClientForBooking = (booking: any) => {
    if (!booking?.client_id) return null
    return clients.find((client) => client.id === booking.client_id)
  }

  const getBookingClientName = (booking: any) => {
    const client = getClientForBooking(booking)

    if (client?.company) return client.company

    if (getBookingDeliveryType(booking) === 'public') return 'Public course'

    return booking?.client_name || 'No client'
  }

  const getBookingDelegates = (selectedBookingId: string) => {
    const delegateIds = bookingDelegateLinks
      .filter((link) => link.booking_id === selectedBookingId)
      .map((link) => link.delegate_id)

    return delegates.filter((delegate) => delegateIds.includes(delegate.id))
  }

  const getPublicBookingClientOptions = (selectedBooking: any) => {
    if (!selectedBooking) return []

    const bookingDelegates = getBookingDelegates(selectedBooking.id)
    const clientIds = new Set<string>()

    if (selectedBooking.client_id) {
      clientIds.add(selectedBooking.client_id)
    }

    bookingDelegates.forEach((delegate) => {
      if (delegate.client_id) {
        clientIds.add(delegate.client_id)
      }
    })

    return Array.from(clientIds)
      .map((id) => getClientById(id))
      .filter(Boolean)
  }

  const getDelegatesForSelectedBooking = () => {
    if (!bookingId) return []
    return getBookingDelegates(bookingId)
  }

  const getBookingOptionLabel = (booking: any) => {
    const dateText = getFormattedDate(booking.date)
    const clientText = getBookingClientName(booking)
    const courseText = booking.course_name || 'No course'
    const priceText = booking.price
      ? ` · £${Number(booking.price).toFixed(2)}`
      : ''
    const deliveryText = getBookingDeliveryType(booking) === 'public'
      ? 'Public'
      : 'Private'

    return `${dateText} · ${deliveryText} · ${clientText} · ${courseText}${priceText}`
  }

  const selectedBooking = getBookingById(bookingId)
  const selectedBookingDeliveryType = getBookingDeliveryType(selectedBooking)

  const resetCreateForm = () => {
    setBookingId('')
    setInvoiceTargetType('booking_client')
    setInvoiceClientId('')
    setInvoiceDelegateId('')
    setCustomRecipientName('')
    setCustomRecipientEmail('')
    setAmount('')
    setVatRate('0')
    setDueDate('')
  }

  const getInvoiceRecipientForCreate = () => {
    const booking = selectedBooking

    if (!booking) {
      return null
    }

    if (invoiceTargetType === 'booking_client') {
      const client = getClientForBooking(booking)

      if (!client) return null

      return {
        type: 'booking_client',
        clientId: client.id,
        delegateId: null,
        name: client.company || client.name || booking.client_name || 'Client',
        email: client.email || '',
      }
    }

    if (invoiceTargetType === 'client') {
      const client = getClientById(invoiceClientId)

      if (!client) return null

      return {
        type: 'client',
        clientId: client.id,
        delegateId: null,
        name: client.company || client.name || 'Client',
        email: client.email || '',
      }
    }

    if (invoiceTargetType === 'delegate') {
      const delegate = getDelegateById(invoiceDelegateId)

      if (!delegate) return null

      return {
        type: 'delegate',
        clientId: delegate.client_id || null,
        delegateId: delegate.id,
        name: delegate.full_name || 'Delegate',
        email: delegate.email || '',
      }
    }

    if (invoiceTargetType === 'custom') {
      if (!customRecipientName) return null

      return {
        type: 'custom',
        clientId: null,
        delegateId: null,
        name: customRecipientName,
        email: customRecipientEmail || '',
      }
    }

    return null
  }

  const loadExistingInvoiceNumbers = async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('organisation_id', organisationId)

    if (error) {
      return invoices.map((invoice) => invoice.invoice_number)
    }

    return (data || []).map((invoice) => invoice.invoice_number)
  }

  const createInvoice = async () => {
    if (!bookingId) {
      alert('Booking is required')
      return
    }

    const recipient = getInvoiceRecipientForCreate()

    if (!recipient) {
      alert('Choose who this invoice is for')
      return
    }

    const parsedAmount = parseRequiredPositiveNumber(amount, 'Amount')
    const parsedVatRate = parseOptionalNonNegativeNumber(vatRate, 'VAT rate')

    if (parsedAmount.error || parsedVatRate.error) {
      alert(parsedAmount.error || parsedVatRate.error)
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const net = parsedAmount.value || 0
    const numericVatRate = parsedVatRate.value || 0
    const vat = net * (numericVatRate / 100)
    const total = net + vat

    let error: any = null

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existingInvoiceNumbers = await loadExistingInvoiceNumbers()
      const invoiceNumber = getNextInvoiceNumber(existingInvoiceNumbers)

      const { error: insertError } = await supabase.from('invoices').insert({
        user_id: userData.user?.id,
        organisation_id: organisationId,
        booking_id: bookingId,
        client_id: recipient.clientId,
        delegate_id: recipient.delegateId,
        invoice_target_type: recipient.type,
        recipient_name: recipient.name,
        recipient_email: recipient.email,
        client_name: recipient.name,
        invoice_number: invoiceNumber,
        amount: net,
        vat_rate: numericVatRate,
        vat_amount: vat,
        total_amount: total,
        due_date: dueDate || null,
        status: 'draft',
      })

      error = insertError

      if (!error || !isDuplicateInvoiceNumberError(error)) {
        break
      }
    }

    if (error) {
      alert(error.message)
      return
    }

    resetCreateForm()
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

    const parsedAmount = parseRequiredPositiveNumber(editAmount, 'Amount')
    const parsedVatRate = parseOptionalNonNegativeNumber(editVatRate, 'VAT rate')

    if (parsedAmount.error || parsedVatRate.error) {
      alert(parsedAmount.error || parsedVatRate.error)
      return
    }

    setSavingEdit(true)

    const net = parsedAmount.value || 0
    const numericVatRate = parsedVatRate.value || 0
    const vat = net * (numericVatRate / 100)
    const total = net + vat

    const { error } = await supabase
      .from('invoices')
      .update({
        amount: net,
        vat_rate: numericVatRate,
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

  const getInvoiceRecipientName = (invoice: any) => {
    if (invoice.recipient_name) return invoice.recipient_name

    const booking = getBookingById(invoice.booking_id)
    const client = booking ? getClientForBooking(booking) : null

    return client?.company || invoice.client_name || 'No recipient'
  }

  const getInvoiceRecipientEmail = (invoice: any) => {
    if (invoice.recipient_email) return invoice.recipient_email

    const booking = getBookingById(invoice.booking_id)
    const client = booking ? getClientForBooking(booking) : null

    return client?.email || ''
  }

  const getInvoiceTargetLabel = (invoice: any) => {
    if (invoice.invoice_target_type === 'delegate') return 'Delegate'
    if (invoice.invoice_target_type === 'client') return 'Client'
    if (invoice.invoice_target_type === 'custom') return 'Custom'
    return 'Booking client'
  }

  const getInvoiceCourseName = (invoice: any) => {
    const booking = getBookingById(invoice.booking_id)
    return booking?.course_name || 'Training course delivery'
  }

  const getInvoiceBookingLabel = (invoice: any) => {
    const booking = getBookingById(invoice.booking_id)

    if (!booking) return 'Booking not found'

    return getBookingOptionLabel(booking)
  }

  const generateInvoicePDF = (invoice: any) => {
    const doc = new jsPDF()

    const netAmount = Number(invoice.amount || 0)
    const vatAmount = Number(invoice.vat_amount || 0)
    const totalAmount = Number(invoice.total_amount || invoice.amount || 0)

    const businessName = organisation?.name || 'Training Provider'
    const businessEmail = organisation?.email || ''
    const businessPhone = organisation?.phone || ''
    const paymentDetails = organisation?.invoice_payment_details || ''

    const courseName = getInvoiceCourseName(invoice)
    const billTo = getInvoiceRecipientName(invoice)

    const invoiceDate = invoice.created_at
      ? getFormattedDate(invoice.created_at)
      : getFormattedDate(new Date().toISOString())

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
    doc.text(businessName, 188, 26, { align: 'right' })

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
    doc.roundedRect(22, 60, 76, 42, 3, 3, 'FD')

    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text('INVOICE DETAILS', 28, 69)

    doc.setFontSize(10)
    doc.setTextColor(17, 24, 39)
    doc.text(`Invoice No: ${invoice.invoice_number || invoice.id}`, 28, 78)
    doc.text(`Date: ${invoiceDate}`, 28, 85)
    doc.text(`Due Date: ${getFormattedDate(invoice.due_date)}`, 28, 92)
    doc.text(`Status: ${invoice.status || 'draft'}`, 28, 99)

    doc.setFillColor(249, 250, 251)
    doc.setDrawColor(229, 231, 235)
    doc.roundedRect(112, 60, 76, 42, 3, 3, 'FD')

    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text('BILL TO', 118, 69)

    doc.setFontSize(12)
    doc.setTextColor(17, 24, 39)
    doc.text(billTo || 'Recipient', 118, 80)

    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text(getInvoiceTargetLabel(invoice), 118, 89)

    doc.setFillColor(17, 24, 39)
    doc.roundedRect(22, 132, 166, 12, 2, 2, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.text('Description', 28, 140)
    doc.text('Net', 128, 140)
    doc.text('VAT', 150, 140)
    doc.text('Total', 172, 140)

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(229, 231, 235)
    doc.rect(22, 144, 166, 20, 'D')

    doc.setTextColor(17, 24, 39)
    doc.setFontSize(10)

    const descriptionLines = doc.splitTextToSize(courseName, 88)
    doc.text(descriptionLines, 28, 156)

    doc.text(`£${netAmount.toFixed(2)}`, 128, 156)
    doc.text(`£${vatAmount.toFixed(2)}`, 150, 156)
    doc.text(`£${totalAmount.toFixed(2)}`, 172, 156)

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

    doc.setDrawColor(229, 231, 235)
    doc.line(22, 265, 188, 265)

    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text('Generated by Hercules OS', 22, 274)
    doc.text('Thank you for your business.', 188, 274, { align: 'right' })

    doc.save(`${invoice.invoice_number || 'invoice'}.pdf`)
  }

  const sendInvoiceEmail = async (invoice: any) => {
    const recipientEmail =
      recipientEmails[invoice.id] || getInvoiceRecipientEmail(invoice)

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
        recipientName: getInvoiceRecipientName(invoice),
        clientName: getInvoiceRecipientName(invoice),
        courseName: getInvoiceCourseName(invoice),
        amount: invoice.amount,
        vatAmount: invoice.vat_amount,
        totalAmount: invoice.total_amount || invoice.amount,
        dueDate: getFormattedDate(invoice.due_date),
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

  const publicInvoices = invoices.filter((invoice) => {
    const booking = getBookingById(invoice.booking_id)
    return getBookingDeliveryType(booking) === 'public'
  })

  const filteredInvoices = invoices
    .filter((invoice) => {
      const booking = getBookingById(invoice.booking_id)

      const invoiceClient = invoice.client_id
        ? getClientById(invoice.client_id)
        : null

      const bookingClient = booking?.client_id
        ? getClientById(booking.client_id)
        : null

      const delegate = invoice.delegate_id
        ? getDelegateById(invoice.delegate_id)
        : null

      const delegateClient = delegate?.client_id
        ? getClientById(delegate.client_id)
        : null

      const searchableText = `
        ${invoice.invoice_number || ''}
        ${invoice.client_name || ''}
        ${invoice.recipient_name || ''}
        ${invoice.recipient_email || ''}
        ${invoiceClient?.company || ''}
        ${invoiceClient?.name || ''}
        ${invoiceClient?.email || ''}
        ${bookingClient?.company || ''}
        ${bookingClient?.name || ''}
        ${bookingClient?.email || ''}
        ${delegateClient?.company || ''}
        ${delegateClient?.name || ''}
        ${delegateClient?.email || ''}
        ${delegate?.full_name || ''}
        ${delegate?.email || ''}
        ${booking?.course_name || ''}
        ${booking?.date || ''}
        ${booking ? getFormattedDate(booking.date) : ''}
        ${invoice.due_date || ''}
        ${getFormattedDate(invoice.due_date)}
        ${booking?.client_name || ''}
        ${booking?.course_delivery_type || ''}
        ${invoice.status || ''}
        ${invoice.invoice_target_type || ''}
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
      return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    }

    if (status === 'sent') {
      return 'bg-blue-50 text-blue-700 border-blue-100'
    }

    return 'bg-amber-50 text-amber-700 border-amber-100'
  }

  const getDeliveryTypeStyle = (type: string) => {
    if (type === 'public') {
      return 'bg-purple-50 text-purple-700 border-purple-100'
    }

    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  const StatCard = ({
    label,
    value,
    detail,
  }: {
    label: string
    value: string | number
    detail?: string
  }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h2 className="text-2xl font-semibold tracking-tight text-slate-950 mt-2">
        {value}
      </h2>

      {detail && (
        <p className="text-xs text-slate-500 mt-1">
          {detail}
        </p>
      )}
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Invoices
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
            Client invoices
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Create invoices for private bookings, public-course clients, individual delegates or custom recipients.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <StatCard
          label="Total value"
          value={`£${totalRevenue.toFixed(2)}`}
          detail="All invoice value"
        />

        <StatCard
          label="Invoices"
          value={invoices.length}
          detail="Total records"
        />

        <StatCard
          label="Outstanding"
          value={unpaidInvoices.length}
          detail="Not marked paid"
        />

        <StatCard
          label="Public invoices"
          value={publicInvoices.length}
          detail="From public courses"
        />

        <StatCard
          label="Secured"
          value={securedInvoices.length}
          detail="Locked invoices"
        />
      </div>

      <div className={`${panelClass} mb-4`}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Filters
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Search by recipient, company, delegate, course, invoice number or status.
          </p>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              className={`${inputClass} md:col-span-2`}
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
            </select>

            <select
              className={inputClass}
              value={securedFilter}
              onChange={(e) => setSecuredFilter(e.target.value)}
            >
              <option value="all">All security</option>
              <option value="secured">Secured</option>
              <option value="unsecured">Unsecured</option>
            </select>

            <select
              className={inputClass}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest value</option>
              <option value="lowest">Lowest value</option>
            </select>

            <button
              className={unpaidOnly ? buttonPrimary : buttonSecondary}
              onClick={() => setUnpaidOnly(!unpaidOnly)}
            >
              Unpaid only
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
            <p className="text-xs text-slate-500">
              Showing {filteredInvoices.length} of {invoices.length} invoices · Filtered value £{filteredTotalValue.toFixed(2)}
            </p>

            <button
              className={buttonSecondary}
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-4 ${panelClass} h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Create invoice
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Choose a booking, then choose who should receive the invoice.
            </p>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <select
              className={inputClass}
              value={bookingId}
              onChange={(e) => {
                const selectedBookingId = e.target.value
                const booking = getBookingById(selectedBookingId)

                setBookingId(selectedBookingId)
                setInvoiceClientId('')
                setInvoiceDelegateId('')
                setCustomRecipientName('')
                setCustomRecipientEmail('')

                if (booking?.course_delivery_type === 'public' && !booking.client_id) {
                  setInvoiceTargetType('client')
                } else {
                  setInvoiceTargetType('booking_client')
                }

                if (booking?.price && !amount) {
                  setAmount(String(booking.price))
                }
              }}
            >
              <option value="">Select booking</option>

              {bookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {getBookingOptionLabel(booking)}
                </option>
              ))}
            </select>

            {selectedBooking && (
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
                <p className="font-medium text-slate-950">
                  {selectedBooking.course_name}
                </p>

                <p className="mt-1">
                  {getFormattedDate(selectedBooking.date)} · {selectedBookingDeliveryType === 'public' ? 'Public course' : 'Private course'}
                </p>

                {selectedBookingDeliveryType === 'public' && (
                  <p className="mt-2 text-purple-700">
                    Public course selected. You can invoice a company/client, an individual delegate, or a custom recipient.
                  </p>
                )}
              </div>
            )}

            {selectedBooking && (
              <>
                <select
                  className={inputClass}
                  value={invoiceTargetType}
                  onChange={(e) => {
                    setInvoiceTargetType(e.target.value)
                    setInvoiceClientId('')
                    setInvoiceDelegateId('')
                    setCustomRecipientName('')
                    setCustomRecipientEmail('')
                  }}
                >
                  {selectedBooking.client_id && (
                    <option value="booking_client">Booking client</option>
                  )}

                  {selectedBookingDeliveryType === 'public' && (
                    <>
                      <option value="client">Client/company on course</option>
                      <option value="delegate">Individual delegate</option>
                      <option value="custom">Custom recipient</option>
                    </>
                  )}

                  {selectedBookingDeliveryType !== 'public' && (
                    <option value="custom">Custom recipient</option>
                  )}
                </select>

                {invoiceTargetType === 'client' && (
                  <select
                    className={inputClass}
                    value={invoiceClientId}
                    onChange={(e) => setInvoiceClientId(e.target.value)}
                  >
                    <option value="">Select client/company</option>

                    {getPublicBookingClientOptions(selectedBooking).map((client: any) => (
                      <option key={client.id} value={client.id}>
                        {client.company} - {client.name}
                      </option>
                    ))}
                  </select>
                )}

                {invoiceTargetType === 'delegate' && (
                  <select
                    className={inputClass}
                    value={invoiceDelegateId}
                    onChange={(e) => {
                      const delegateId = e.target.value
                      const delegate = getDelegateById(delegateId)

                      setInvoiceDelegateId(delegateId)

                      if (delegate?.email) {
                        setCustomRecipientEmail(delegate.email)
                      }
                    }}
                  >
                    <option value="">Select delegate</option>

                    {getDelegatesForSelectedBooking().map((delegate) => (
                      <option key={delegate.id} value={delegate.id}>
                        {delegate.full_name}
                        {delegate.email ? ` - ${delegate.email}` : ''}
                      </option>
                    ))}
                  </select>
                )}

                {invoiceTargetType === 'custom' && (
                  <>
                    <input
                      className={inputClass}
                      placeholder="Recipient name"
                      value={customRecipientName}
                      onChange={(e) => setCustomRecipientName(e.target.value)}
                    />

                    <input
                      className={inputClass}
                      placeholder="Recipient email optional"
                      value={customRecipientEmail}
                      onChange={(e) => setCustomRecipientEmail(e.target.value)}
                    />
                  </>
                )}
              </>
            )}

            <input
              className={inputClass}
              placeholder="Net amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="VAT rate %"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
            />

            <input
              className={inputClass}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
              <p>
                VAT: £
                {(Number(amount || 0) * (Number(vatRate || 0) / 100)).toFixed(2)}
              </p>

              <p className="font-semibold text-slate-950 mt-1">
                Total: £
                {(
                  Number(amount || 0) +
                  Number(amount || 0) * (Number(vatRate || 0) / 100)
                ).toFixed(2)}
              </p>
            </div>

            <button
              className={buttonPrimary}
              onClick={createInvoice}
            >
              Create invoice
            </button>
          </div>
        </div>

        <div className={`xl:col-span-8 ${panelClass}`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Invoice list
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Manage invoice records, payments and client communication.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredInvoices.map((invoice) => {
              const netAmount = Number(invoice.amount || 0)
              const vatAmount = Number(invoice.vat_amount || 0)
              const totalAmount = Number(invoice.total_amount || invoice.amount || 0)
              const savedRecipientEmail = getInvoiceRecipientEmail(invoice)
              const isEditing = editingId === invoice.id
              const isLocked = Boolean(invoice.secured_at) || invoice.status === 'paid'
              const booking = getBookingById(invoice.booking_id)
              const deliveryType = getBookingDeliveryType(booking)

              return (
                <div
                  key={invoice.id}
                  className="p-4"
                >
                  {!isEditing ? (
                    <>
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-950">
                              {invoice.invoice_number || 'Invoice'}
                            </h3>

                            <span className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getStatusStyle(invoice.status)}`}>
                              {invoice.status}
                            </span>

                            <span className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getDeliveryTypeStyle(deliveryType)}`}>
                              {deliveryType === 'public' ? 'Public' : 'Private'}
                            </span>

                            <span className="border border-slate-200 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                              {getInvoiceTargetLabel(invoice)}
                            </span>

                            {invoice.secured_at && (
                              <span className="border border-slate-200 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                Secured
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-slate-600 mt-1">
                            {getInvoiceRecipientName(invoice)}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            {getInvoiceCourseName(invoice)}
                          </p>
                        </div>

                        <p className="text-xl font-semibold text-slate-950">
                          £{totalAmount.toFixed(2)}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4 text-xs text-slate-600">
                        <div>
                          <p className="text-slate-400">Net</p>
                          <p className="font-medium text-slate-800 mt-1">
                            £{netAmount.toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">VAT</p>
                          <p className="font-medium text-slate-800 mt-1">
                            £{vatAmount.toFixed(2)}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Due date</p>
                          <p className="font-medium text-slate-800 mt-1">
                            {getFormattedDate(invoice.due_date)}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Recipient email</p>
                          <p className="font-medium text-slate-800 mt-1 break-all">
                            {savedRecipientEmail || 'Not set'}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mt-3">
                        Booking: {getInvoiceBookingLabel(invoice)}
                      </p>

                      <div className="mt-4">
                        <input
                          className={`${inputClass} w-full`}
                          placeholder={savedRecipientEmail || 'Recipient email'}
                          value={recipientEmails[invoice.id] || ''}
                          onChange={(e) =>
                            setRecipientEmails((previous) => ({
                              ...previous,
                              [invoice.id]: e.target.value,
                            }))
                          }
                        />

                        {savedRecipientEmail && (
                          <p className="text-xs text-slate-500 mt-2">
                            Leave blank to send to saved recipient email.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          className={buttonPrimary}
                          onClick={() => generateInvoicePDF(invoice)}
                        >
                          Download PDF
                        </button>

                        <button
                          className={buttonSecondary}
                          onClick={() => sendInvoiceEmail(invoice)}
                          disabled={sendingId === invoice.id}
                        >
                          {sendingId === invoice.id ? 'Sending...' : 'Send email'}
                        </button>

                        {!isLocked && (
                          <button
                            className={buttonSecondary}
                            onClick={() => startEditing(invoice)}
                          >
                            Edit
                          </button>
                        )}

                        {!invoice.secured_at && invoice.status !== 'paid' && (
                          <button
                            className={buttonSecondary}
                            onClick={() => secureInvoice(invoice.id)}
                          >
                            Secure invoice
                          </button>
                        )}

                        {invoice.status !== 'draft' && !invoice.secured_at && invoice.status !== 'paid' && (
                          <button
                            className={buttonSecondary}
                            onClick={() => markAsDraft(invoice.id)}
                          >
                            Mark draft
                          </button>
                        )}

                        {invoice.status === 'draft' && (
                          <button
                            className={buttonSecondary}
                            onClick={() => markAsSent(invoice.id)}
                          >
                            Mark sent
                          </button>
                        )}

                        {invoice.status !== 'paid' && (
                          <button
                            className={buttonSecondary}
                            onClick={() => markAsPaid(invoice.id)}
                          >
                            Mark paid
                          </button>
                        )}
                      </div>

                      {isLocked && (
                        <p className="text-xs text-slate-500 mt-3">
                          This invoice is locked because it is secured or paid.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-950">
                          Edit invoice
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          Update invoice totals and due date. Booking and recipient are kept the same.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select
                          className={`${inputClass} md:col-span-2`}
                          value={editBookingId}
                          disabled
                          onChange={() => {}}
                        >
                          <option value="">Select booking</option>

                          {bookings.map((booking) => (
                            <option key={booking.id} value={booking.id}>
                              {getBookingOptionLabel(booking)}
                            </option>
                          ))}
                        </select>

                        <input
                          className={inputClass}
                          placeholder="Net amount"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          placeholder="VAT rate %"
                          value={editVatRate}
                          onChange={(e) => setEditVatRate(e.target.value)}
                        />

                        <input
                          className={`${inputClass} md:col-span-2`}
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                        />
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-md p-3 mt-4 text-xs text-slate-600">
                        <p>
                          New VAT: £
                          {(Number(editAmount || 0) * (Number(editVatRate || 0) / 100)).toFixed(2)}
                        </p>

                        <p className="font-semibold text-slate-950 mt-1">
                          New total: £
                          {(
                            Number(editAmount || 0) +
                            Number(editAmount || 0) * (Number(editVatRate || 0) / 100)
                          ).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          className={buttonPrimary}
                          onClick={() => saveInvoiceEdit(invoice.id)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? 'Saving...' : 'Save changes'}
                        </button>

                        <button
                          className={buttonSecondary}
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
              <div className="p-6 text-sm text-slate-500">
                No invoices match your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
