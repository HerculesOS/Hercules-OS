'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate } from '@/lib/formatters'
import { getNextInvoiceNumber, isDuplicateInvoiceNumberError } from '@/lib/invoiceNumbers'
import { parseOptionalNonNegativeNumber, parseRequiredPositiveNumber } from '@/lib/numberValidation'
import { fetchPaginatedImportRecords } from '@/lib/importCsv'
import { getComputedInvoiceStatus } from '@/lib/invoiceStatus'
import {
  calculateDefaultInvoiceDueDate,
  getSentInvoiceUpdate,
  normalizeOptionalPoNumber,
} from '@/lib/invoiceWorkflow'
import { getPublicDelegateInvoiceLineItems, type InvoiceLineItem } from '@/lib/publicBookingPricing'
import jsPDF from 'jspdf'

const INVOICES_PAGE_SIZE = 50

const cleanSearchTerm = (value: string) =>
  value.trim().replace(/[%_,]/g, ' ')

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [bookingDelegateLinks, setBookingDelegateLinks] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalInvoices, setTotalInvoices] = useState(0)
  const [matchingInvoices, setMatchingInvoices] = useState(0)
  const [outstandingInvoicesCount, setOutstandingInvoicesCount] = useState(0)
  const [overdueInvoicesCount, setOverdueInvoicesCount] = useState(0)
  const [securedInvoicesCount, setSecuredInvoicesCount] = useState(0)

  const [bookingId, setBookingId] = useState('')
  const [invoiceTargetType, setInvoiceTargetType] = useState('booking_client')
  const [invoiceClientId, setInvoiceClientId] = useState('')
  const [invoiceDelegateId, setInvoiceDelegateId] = useState('')
  const [customRecipientName, setCustomRecipientName] = useState('')
  const [customRecipientEmail, setCustomRecipientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [vatRate, setVatRate] = useState('0')
  const [dueDate, setDueDate] = useState('')
  const [dueDateWasAutoFilled, setDueDateWasAutoFilled] = useState(false)
  const [poNumber, setPoNumber] = useState('')

  const [recipientEmails, setRecipientEmails] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState('')

  const [editingId, setEditingId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editBookingId, setEditBookingId] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editVatRate, setEditVatRate] = useState('0')
  const [editDueDate, setEditDueDate] = useState('')
  const [editPoNumber, setEditPoNumber] = useState('')

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

  const selectBookingForCreate = (
    selectedBookingId: string,
    availableBookings = bookings
  ) => {
    const booking = availableBookings.find(
      (bookingItem) => bookingItem.id === selectedBookingId
    )

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

    if (!booking && dueDateWasAutoFilled) {
      setDueDate('')
      setDueDateWasAutoFilled(false)
      return
    }

    if (booking && (!dueDate || dueDateWasAutoFilled)) {
      setDueDate(calculateDefaultInvoiceDueDate(booking))
      setDueDateWasAutoFilled(true)
    }
  }

  const getMatchingRelatedIds = async (
    searchTerm: string,
    organisationIdValue: string
  ) => {
    const cleanTerm = cleanSearchTerm(searchTerm)

    if (!cleanTerm) {
      return {
        bookingIds: [] as string[],
        clientIds: [] as string[],
        delegateIds: [] as string[],
      }
    }

    const term = `%${cleanTerm}%`

    const [clientsResult, delegatesResult, bookingsResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id')
        .eq('organisation_id', organisationIdValue)
        .or(`company.ilike.${term},name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
        .limit(200),
      supabase
        .from('delegates')
        .select('id')
        .eq('organisation_id', organisationIdValue)
        .or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
        .limit(200),
      supabase
        .from('bookings')
        .select('id')
        .eq('organisation_id', organisationIdValue)
        .or(`course_name.ilike.${term},client_name.ilike.${term},location.ilike.${term},course_delivery_type.ilike.${term},status.ilike.${term}`)
        .limit(200),
    ])

    return {
      bookingIds: (bookingsResult.data || []).map((booking) => booking.id),
      clientIds: (clientsResult.data || []).map((client) => client.id),
      delegateIds: (delegatesResult.data || []).map((delegate) => delegate.id),
    }
  }

  const applyInvoiceFilters = (
    query: any,
    searchTerm: string,
    relatedIds: {
      bookingIds: string[]
      clientIds: string[]
      delegateIds: string[]
    }
  ) => {
    let nextQuery = query

    const today = new Date().toISOString().split('T')[0]

    if (statusFilter === 'overdue') {
      nextQuery = nextQuery
        .not('due_date', 'is', null)
        .lt('due_date', today)
        .not('status', 'in', '(paid,cancelled,canceled,void)')
    } else if (statusFilter === 'draft' || statusFilter === 'sent') {
      nextQuery = nextQuery
        .eq('status', statusFilter)
        .or(`due_date.is.null,due_date.gte.${today}`)
    } else if (statusFilter !== 'all') {
      nextQuery = nextQuery.eq('status', statusFilter)
    }

    if (securedFilter === 'secured') {
      nextQuery = nextQuery.not('secured_at', 'is', null)
    }

    if (securedFilter === 'unsecured') {
      nextQuery = nextQuery.is('secured_at', null)
    }

    if (unpaidOnly) {
      nextQuery = nextQuery.not('status', 'in', '(paid,cancelled,canceled,void)')
    }

    const cleanTerm = cleanSearchTerm(searchTerm)

    if (!cleanTerm) return nextQuery

    const term = `%${cleanTerm}%`
    const filters = [
      `invoice_number.ilike.${term}`,
      `client_name.ilike.${term}`,
      `recipient_name.ilike.${term}`,
      `recipient_email.ilike.${term}`,
      `po_number.ilike.${term}`,
      `status.ilike.${term}`,
      `invoice_target_type.ilike.${term}`,
    ]

    if (relatedIds.bookingIds.length > 0) {
      filters.push(`booking_id.in.(${relatedIds.bookingIds.join(',')})`)
    }

    if (relatedIds.clientIds.length > 0) {
      filters.push(`client_id.in.(${relatedIds.clientIds.join(',')})`)
    }

    if (relatedIds.delegateIds.length > 0) {
      filters.push(`delegate_id.in.(${relatedIds.delegateIds.join(',')})`)
    }

    return nextQuery.or(filters.join(','))
  }

  const load = async (page = currentPage, searchTerm = search) => {
    setLoading(true)

    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single()

    const relatedIds = await getMatchingRelatedIds(
      searchTerm,
      profile.organisation_id
    )
    const from = (page - 1) * INVOICES_PAGE_SIZE
    const to = from + INVOICES_PAGE_SIZE - 1
    let invoicesQuery = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .range(from, to)

    invoicesQuery = applyInvoiceFilters(invoicesQuery, searchTerm, relatedIds)

    if (sortBy === 'oldest') {
      invoicesQuery = invoicesQuery.order('created_at', { ascending: true })
    } else if (sortBy === 'highest') {
      invoicesQuery = invoicesQuery.order('total_amount', { ascending: false })
    } else if (sortBy === 'lowest') {
      invoicesQuery = invoicesQuery.order('total_amount', { ascending: true })
    } else {
      invoicesQuery = invoicesQuery.order('created_at', { ascending: false })
    }

    const { data: invoicesData, count: invoicesCount, error: invoicesError } =
      await invoicesQuery

    if (invoicesError) {
      alert(invoicesError.message)
      setLoading(false)
      return
    }

    const { count: allCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)

    const { count: outstandingCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)
      .not('status', 'in', '(paid,cancelled,canceled,void)')

    const todayString = new Date().toISOString().split('T')[0]
    const { count: overdueCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)
      .not('due_date', 'is', null)
      .lt('due_date', todayString)
      .not('status', 'in', '(paid,cancelled,canceled,void)')

    const { count: securedCount } = await supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)
      .not('secured_at', 'is', null)

    const requestedBookingId = new URLSearchParams(window.location.search).get('bookingId')
    const requestedSearch = new URLSearchParams(window.location.search).get('search')
    const requestedStatus = new URLSearchParams(window.location.search).get('status')
    const invoiceRows = invoicesData || []
    const invoiceIds = invoiceRows.map((invoice) => invoice.id)
    const invoiceBookingIds = invoiceRows
      .map((invoice) => invoice.booking_id)
      .filter(Boolean)
    const bookingIds = Array.from(
      new Set([
        ...invoiceBookingIds,
        requestedBookingId,
      ].filter(Boolean))
    )
    const invoiceClientIds = invoiceRows
      .map((invoice) => invoice.client_id)
      .filter(Boolean)
    const invoiceDelegateIds = invoiceRows
      .map((invoice) => invoice.delegate_id)
      .filter(Boolean)

    const [
      recentBookingsResult,
      relatedBookingsResult,
      bookingDelegateLinksResult,
      directDelegatesResult,
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select('*')
        .eq('organisation_id', profile.organisation_id)
        .order('date', { ascending: false })
        .limit(100),
      bookingIds.length > 0
        ? supabase
            .from('bookings')
            .select('*')
            .eq('organisation_id', profile.organisation_id)
            .in('id', bookingIds)
        : Promise.resolve({ data: [] }),
      invoiceIds.length > 0
        ? supabase
            .from('booking_delegates')
            .select('*')
            .eq('organisation_id', profile.organisation_id)
            .in('invoice_id', invoiceIds)
        : Promise.resolve({ data: [] }),
      invoiceDelegateIds.length > 0
        ? supabase
            .from('delegates')
            .select('*')
            .eq('organisation_id', profile.organisation_id)
            .in('id', invoiceDelegateIds)
        : Promise.resolve({ data: [] }),
    ])
    const linkedDelegateIds = (bookingDelegateLinksResult.data || [])
      .map((link: any) => link.delegate_id)
      .filter(Boolean)
    const allDelegateIds = Array.from(
      new Set([...invoiceDelegateIds, ...linkedDelegateIds])
    )
    const linkedDelegatesResult = allDelegateIds.length > 0
      ? await supabase
          .from('delegates')
          .select('*')
          .eq('organisation_id', profile.organisation_id)
          .in('id', allDelegateIds)
      : { data: [] }
    const bookingRows = Array.from(
      new Map([
        ...(recentBookingsResult.data || []),
        ...(relatedBookingsResult.data || []),
      ].map((booking) => [booking.id, booking])).values()
    )
    const delegateRows = Array.from(
      new Map([
        ...(directDelegatesResult.data || []),
        ...(linkedDelegatesResult.data || []),
      ].map((delegate) => [delegate.id, delegate])).values()
    )
    const delegateClientIds = delegateRows
      .map((delegate) => delegate.client_id)
      .filter(Boolean)
    const bookingClientIds = bookingRows
      .map((booking) => booking.client_id)
      .filter(Boolean)
    const clientIds = Array.from(
      new Set([...invoiceClientIds, ...delegateClientIds, ...bookingClientIds])
    )
    const clientsResult = clientIds.length > 0
      ? await supabase
          .from('clients')
          .select('*')
          .eq('organisation_id', profile.organisation_id)
          .in('id', clientIds)
      : { data: [] }

    setOrganisation(organisationData || null)
    setClients(clientsResult.data || [])
    setDelegates(delegateRows || [])
    setBookingDelegateLinks(bookingDelegateLinksResult.data || [])
    setBookings(bookingRows || [])
    setInvoices(invoicesData || [])
    setMatchingInvoices(invoicesCount || 0)
    setTotalInvoices(allCount || 0)
    setOutstandingInvoicesCount(outstandingCount || 0)
    setOverdueInvoicesCount(overdueCount || 0)
    setSecuredInvoicesCount(securedCount || 0)

    const allowedStatuses = ['all', 'draft', 'sent', 'overdue', 'paid']

    if (requestedBookingId) {
      selectBookingForCreate(requestedBookingId, bookingRows || [])
    }

    if (requestedSearch) {
      setSearch(requestedSearch)
    }

    if (requestedStatus && allowedStatuses.includes(requestedStatus)) {
      setStatusFilter(requestedStatus)
    }

    setLoading(false)
  }

  useEffect(() => {
    load(1, '')
  }, [])

  useEffect(() => {
    if (!organisationId) return

    const timeout = window.setTimeout(() => {
      setCurrentPage(1)
      load(1, search)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [search, statusFilter, securedFilter, unpaidOnly, sortBy, organisationId])

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
    setDueDateWasAutoFilled(false)
    setPoNumber('')
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
    try {
      const data = await fetchPaginatedImportRecords<{ invoice_number: string | null }>(
        async (from, to) =>
          await supabase
            .from('invoices')
            .select('invoice_number')
            .eq('organisation_id', organisationId)
            .range(from, to)
      )

      return data.map((invoice) => invoice.invoice_number)
    } catch {
      return invoices.map((invoice) => invoice.invoice_number)
    }
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
        po_number: normalizeOptionalPoNumber(poNumber),
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
    setCurrentPage(1)
    load(1, search)
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
    setEditPoNumber(invoice.po_number || '')
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditBookingId('')
    setEditAmount('')
    setEditVatRate('0')
    setEditDueDate('')
    setEditPoNumber('')
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
        po_number: normalizeOptionalPoNumber(editPoNumber),
      })
      .eq('id', invoiceId)

    setSavingEdit(false)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    await load(currentPage, search)
  }

  const secureInvoice = async (invoiceId: string) => {
    const confirmSecure = confirm(
      'Secure and lock this invoice? Once secured, invoice details can no longer be edited before sending.'
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

    load(currentPage, search)
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

    load(currentPage, search)
  }

  const markAsSent = async (invoiceId: string) => {
    const invoiceToUpdate = invoices.find((invoice) => invoice.id === invoiceId)

    if (!invoiceToUpdate?.secured_at) {
      alert('Secure this invoice before sending so it cannot be changed after it has been sent.')
      return
    }

    const { error } = await supabase
      .from('invoices')
      .update(getSentInvoiceUpdate(invoiceToUpdate))
      .eq('id', invoiceId)

    if (error) {
      alert(error.message)
      return
    }

    load(currentPage, search)
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

    load(currentPage, search)
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

  const getInvoiceLineItems = (invoice: any): InvoiceLineItem[] => {
    const courseName = getInvoiceCourseName(invoice)
    const linkedDelegates = bookingDelegateLinks
      .filter((link) => link.invoice_id === invoice.id)
      .map((link) => {
        const delegate = getDelegateById(link.delegate_id)

        return {
          ...link,
          full_name: delegate?.full_name || 'Delegate',
        }
      })

    return getPublicDelegateInvoiceLineItems(
      linkedDelegates,
      invoice.id,
      courseName
    )
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
    const invoiceLineItems = getInvoiceLineItems(invoice)
    const displayLineItems =
      invoiceLineItems.length > 0
        ? invoiceLineItems
        : [{ description: courseName, amount: netAmount }]
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
    doc.roundedRect(22, 60, 76, invoice.po_number ? 50 : 42, 3, 3, 'FD')

    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text('INVOICE DETAILS', 28, 69)

    doc.setFontSize(10)
    doc.setTextColor(17, 24, 39)
    doc.text(`Invoice No: ${invoice.invoice_number || invoice.id}`, 28, 78)
    doc.text(`Date: ${invoiceDate}`, 28, 85)
    doc.text(`Due Date: ${getFormattedDate(invoice.due_date)}`, 28, 92)
    doc.text(`Status: ${getComputedInvoiceStatus(invoice)}`, 28, 99)

    if (invoice.po_number) {
      doc.text(`PO No: ${invoice.po_number}`, 28, 106)
    }

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

    const visibleLineItems = displayLineItems.slice(0, 8)
    const hiddenLineItemCount = displayLineItems.length - visibleLineItems.length
    const lineItemHeight = Math.max(
      20,
      visibleLineItems.length * 10 + (hiddenLineItemCount > 0 ? 8 : 0)
    )

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(229, 231, 235)
    doc.rect(22, 144, 166, lineItemHeight, 'D')

    doc.setTextColor(17, 24, 39)
    doc.setFontSize(10)

    visibleLineItems.forEach((lineItem, index) => {
      const y = 154 + index * 10
      const lineNet = Number(lineItem.amount || 0)
      const lineVat = lineNet * (Number(invoice.vat_rate || 0) / 100)
      const lineTotal = lineNet + lineVat
      const descriptionLines = doc.splitTextToSize(lineItem.description, 88)

      doc.text(descriptionLines.slice(0, 1), 28, y)
      doc.text(`£${lineNet.toFixed(2)}`, 128, y)
      doc.text(`£${lineVat.toFixed(2)}`, 150, y)
      doc.text(`£${lineTotal.toFixed(2)}`, 172, y)
    })

    if (hiddenLineItemCount > 0) {
      doc.setFontSize(8)
      doc.setTextColor(107, 114, 128)
      doc.text(
        `+ ${hiddenLineItemCount} more delegate line(s)`,
        28,
        154 + visibleLineItems.length * 10
      )
    }

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
    if (!invoice.secured_at) {
      alert('Secure this invoice before sending so it cannot be changed after it has been sent.')
      return
    }

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
        poNumber: invoice.po_number || '',
        status: getComputedInvoiceStatus(invoice),
        lineItems: getInvoiceLineItems(invoice),
        businessName: organisation?.name || 'Hercules OS',
        businessEmail: organisation?.email || '',
        businessPhone: organisation?.phone || '',
        paymentDetails: organisation?.invoice_payment_details || '',
        organisationId,
        invoiceId: invoice.id,
      }),
    })

    const result = await response.json()

    setSendingId('')

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Email failed')
      return
    }

    await load(currentPage, search)

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

  const pageInvoiceValue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
    0
  )

  const totalPages = Math.max(1, Math.ceil(matchingInvoices / INVOICES_PAGE_SIZE))
  const pageStart = matchingInvoices === 0 ? 0 : (currentPage - 1) * INVOICES_PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * INVOICES_PAGE_SIZE, matchingInvoices)

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)

    setCurrentPage(nextPage)
    load(nextPage, search)
  }

  const getStatusStyle = (status: string) => {
    if (status === 'paid') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    }

    if (status === 'overdue') {
      return 'bg-red-50 text-red-700 border-red-100'
    }

    if (status === 'sent') {
      return 'bg-blue-50 text-blue-700 border-blue-100'
    }

    if (status === 'cancelled' || status === 'canceled' || status === 'void') {
      return 'bg-slate-100 text-slate-700 border-slate-200'
    }

    return 'bg-amber-50 text-amber-700 border-amber-100'
  }

  const getLockStatusStyle = (isLocked: boolean) =>
    isLocked
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-amber-50 text-amber-700 border-amber-100'

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <StatCard
          label="Visible value"
          value={`£${pageInvoiceValue.toFixed(2)}`}
          detail="Current page"
        />

        <StatCard
          label="Invoices"
          value={totalInvoices}
          detail="Total records"
        />

        <StatCard
          label="Outstanding"
          value={outstandingInvoicesCount}
          detail="Not marked paid"
        />

        <StatCard
          label="Overdue"
          value={overdueInvoicesCount}
          detail="Past due and unpaid"
        />

        <StatCard
          label="Secured"
          value={securedInvoicesCount}
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
              <option value="overdue">Overdue</option>
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
              {loading
                ? 'Loading invoices...'
                : `Showing ${pageStart}-${pageEnd} of ${matchingInvoices} matching invoices. Total invoices: ${totalInvoices}. Visible value £${pageInvoiceValue.toFixed(2)}.`}
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
              onChange={(e) => selectBookingForCreate(e.target.value)}
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

                {dueDate && (
                  <p className="mt-2 text-slate-500">
                    Default due date: {getFormattedDate(dueDate)}
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

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              PO number optional
              <input
                className={inputClass}
                placeholder="Purchase order number"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              Due date
              <input
                className={inputClass}
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  setDueDateWasAutoFilled(false)
                }}
              />
              <span className="font-normal text-slate-500">
                Default due date is 30 days from booking/invoice creation or the course start date, whichever comes first.
              </span>
            </label>

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

            <p className="text-xs text-slate-500 mt-1">
              Invoices automatically show as overdue after the due date if unpaid.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {invoices.map((invoice) => {
              const netAmount = Number(invoice.amount || 0)
              const vatAmount = Number(invoice.vat_amount || 0)
              const totalAmount = Number(invoice.total_amount || invoice.amount || 0)
              const savedRecipientEmail = getInvoiceRecipientEmail(invoice)
              const isEditing = editingId === invoice.id
              const isSecured = Boolean(invoice.secured_at)
              const isLocked = isSecured || invoice.status === 'paid'
              const displayStatus = getComputedInvoiceStatus(invoice)
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

                            <span className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getStatusStyle(displayStatus)}`}>
                              {displayStatus}
                            </span>

                            <span className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getDeliveryTypeStyle(deliveryType)}`}>
                              {deliveryType === 'public' ? 'Public' : 'Private'}
                            </span>

                            <span className="border border-slate-200 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                              {getInvoiceTargetLabel(invoice)}
                            </span>

                            <span className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getLockStatusStyle(isLocked)}`}>
                              {isSecured ? 'Secured' : isLocked ? 'Locked' : 'Draft invoice'}
                            </span>
                          </div>

                          <p className="text-sm text-slate-600 mt-1">
                            {getInvoiceRecipientName(invoice)}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            {getInvoiceCourseName(invoice)}
                          </p>

                          <p className="text-xs text-slate-500 mt-1">
                            Due {getFormattedDate(invoice.due_date)}
                          </p>

                          {invoice.po_number && (
                            <p className="text-xs text-slate-500 mt-1">
                              PO {invoice.po_number}
                            </p>
                          )}

                          {!isSecured && invoice.status !== 'paid' && (
                            <p className="text-xs font-medium text-amber-700 mt-2">
                              Secure before sending. Once secured, invoice details can no longer be edited.
                            </p>
                          )}
                        </div>

                        <p className="text-xl font-semibold text-slate-950">
                          £{totalAmount.toFixed(2)}
                        </p>
                      </div>

                      <details className="group mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                        <summary className="cursor-pointer list-none text-xs font-semibold text-slate-700 transition hover:text-slate-950">
                          Invoice details and actions
                        </summary>

                        <div className="mt-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs text-slate-600">
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
                              <p className="text-slate-400">Issue date</p>
                              <p className="font-medium text-slate-800 mt-1">
                                {getFormattedDate(invoice.created_at)}
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-400">PO number</p>
                              <p className="font-medium text-slate-800 mt-1">
                                {invoice.po_number || 'Not set'}
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

                          {getInvoiceLineItems(invoice).length > 0 && (
                            <div className="mt-3 rounded-lg border border-slate-100 bg-white p-3">
                              <p className="text-xs font-semibold text-slate-700">
                                Public delegate lines
                              </p>

                              <div className="mt-2 space-y-1 text-xs text-slate-600">
                                {getInvoiceLineItems(invoice).slice(0, 8).map((lineItem, index) => (
                                  <div
                                    key={`${invoice.id}-line-${index}`}
                                    className="flex items-center justify-between gap-3"
                                  >
                                    <span>{lineItem.description}</span>
                                    <span className="font-medium text-slate-900">
                                      £{Number(lineItem.amount || 0).toFixed(2)}
                                    </span>
                                  </div>
                                ))}

                                {getInvoiceLineItems(invoice).length > 8 && (
                                  <p className="text-slate-500">
                                    + {getInvoiceLineItems(invoice).length - 8} more delegate line(s)
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

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
                              disabled={!isSecured || sendingId === invoice.id}
                              title={
                                isSecured
                                  ? 'Send invoice email'
                                  : 'Secure this invoice before sending.'
                              }
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

                            {!isSecured && invoice.status !== 'paid' && (
                              <button
                                className={buttonPrimary}
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
                                disabled={!isSecured}
                                title={
                                  isSecured
                                    ? 'Mark invoice as sent'
                                    : 'Secure this invoice before marking it as sent.'
                                }
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

                          {!isSecured && invoice.status !== 'paid' && (
                            <p className="text-xs text-amber-700 mt-3">
                              Secure this invoice before sending so it cannot be changed after it has been sent.
                            </p>
                          )}
                        </div>
                      </details>
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

                        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                          PO number optional
                          <input
                            className={inputClass}
                            placeholder="Purchase order number"
                            value={editPoNumber}
                            onChange={(e) => setEditPoNumber(e.target.value)}
                          />
                        </label>

                        <label className="md:col-span-2 flex flex-col gap-1 text-xs font-medium text-slate-600">
                          Due date
                          <input
                            className={inputClass}
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                          />
                          <span className="font-normal text-slate-500">
                            Default due date is 30 days from booking/invoice creation or the course start date, whichever comes first.
                          </span>
                        </label>
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

            {invoices.length === 0 && !loading && (
              <div className="p-6">
                <p className="text-sm font-semibold text-slate-950">
                  No invoices to show
                </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Create an invoice from a booking, or clear the filters to see more records.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href="/dashboard/bookings"
                      className={buttonPrimary}
                    >
                      Create invoice from booking
                    </Link>

                    <button
                      className={buttonSecondary}
                      onClick={clearFilters}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>
              )}
          </div>

          {matchingInvoices > INVOICES_PAGE_SIZE && (
            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  className={buttonSecondary}
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  Previous
                </button>

                <button
                  className={buttonSecondary}
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
