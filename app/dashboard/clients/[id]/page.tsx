'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { fetchPaginatedImportRecords } from '@/lib/importCsv'
import { getComputedBookingStatus } from '@/lib/bookingStatus'
import { getComputedCertificateStatus } from '@/lib/certificateStatus'

const RELATED_PAGE_SIZE = 20

const cleanSearchTerm = (value: string) =>
  value.trim().replace(/[%_,]/g, ' ')

export default function ClientDetailPage() {
  const params = useParams()

  const [profile, setProfile] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [bookingDelegateLinks, setBookingDelegateLinks] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [delegatePage, setDelegatePage] = useState(1)
  const [bookingPage, setBookingPage] = useState(1)
  const [invoicePage, setInvoicePage] = useState(1)
  const [certificatePage, setCertificatePage] = useState(1)
  const [delegateCount, setDelegateCount] = useState(0)
  const [delegateEmailCount, setDelegateEmailCount] = useState(0)
  const [bookingCount, setBookingCount] = useState(0)
  const [upcomingBookingCount, setUpcomingBookingCount] = useState(0)
  const [completedBookingCount, setCompletedBookingCount] = useState(0)
  const [invoiceCount, setInvoiceCount] = useState(0)
  const [unpaidInvoiceCount, setUnpaidInvoiceCount] = useState(0)
  const [totalInvoiceValue, setTotalInvoiceValue] = useState(0)
  const [certificateCount, setCertificateCount] = useState(0)
  const [validCertificateCount, setValidCertificateCount] = useState(0)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editCompany, setEditCompany] = useState('')
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [delegateSearch, setDelegateSearch] = useState('')
  const [delegateName, setDelegateName] = useState('')
  const [delegateEmail, setDelegateEmail] = useState('')
  const [delegatePhone, setDelegatePhone] = useState('')
  const [delegateNotes, setDelegateNotes] = useState('')

  const [editingDelegateId, setEditingDelegateId] = useState('')
  const [editDelegateName, setEditDelegateName] = useState('')
  const [editDelegateEmail, setEditDelegateEmail] = useState('')
  const [editDelegatePhone, setEditDelegatePhone] = useState('')
  const [editDelegateNotes, setEditDelegateNotes] = useState('')

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const buttonDanger =
    'border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-50'

  const panelClass =
    'bg-white border border-slate-200 rounded-lg'

  const panelHeaderClass =
    'px-4 py-3 border-b border-slate-200'

  const getPageRange = (page: number) => {
    const from = (page - 1) * RELATED_PAGE_SIZE
    const to = from + RELATED_PAGE_SIZE - 1

    return { from, to }
  }

  const load = async ({
    nextDelegatePage = delegatePage,
    nextBookingPage = bookingPage,
    nextInvoicePage = invoicePage,
    nextCertificatePage = certificatePage,
    nextDelegateSearch = delegateSearch,
  } = {}) => {
    setLoading(true)

    const currentProfile = await getOrCreateAccount()
    const clientId = params.id as string

    setProfile(currentProfile)

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('organisation_id', currentProfile.organisation_id)
      .single()

    if (clientError || !clientData) {
      setClient(null)
      setLoading(false)
      return
    }

    const { from: delegateFrom, to: delegateTo } = getPageRange(nextDelegatePage)
    const { from: bookingFrom, to: bookingTo } = getPageRange(nextBookingPage)
    const { from: invoiceFrom, to: invoiceTo } = getPageRange(nextInvoicePage)
    const { from: certificateFrom, to: certificateTo } = getPageRange(nextCertificatePage)

    const allBookingRows = await fetchPaginatedImportRecords<{
      id: string
      course_name?: string | null
      date?: string | null
    }>(
      async (from, to) =>
        await supabase
          .from('bookings')
          .select('id, course_name, date')
          .eq('client_id', clientId)
          .eq('organisation_id', currentProfile.organisation_id)
          .range(from, to)
    )

    const allDelegateIds = await fetchPaginatedImportRecords<{ id: string }>(
      async (from, to) =>
        await supabase
          .from('delegates')
          .select('id')
          .eq('client_id', clientId)
          .eq('organisation_id', currentProfile.organisation_id)
          .range(from, to)
    )

    const bookingIds = allBookingRows.map((booking) => booking.id)
    const delegateIds = allDelegateIds.map((delegate) => delegate.id)

    const searchTerm = cleanSearchTerm(nextDelegateSearch)
    let matchingDelegateIds: string[] = []

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      const matchingBookingIds = allBookingRows
        .filter((booking) =>
          `${booking.course_name || ''} ${booking.date || ''}`
            .toLowerCase()
            .includes(lowerSearchTerm)
        )
        .map((booking) => booking.id)

      if (matchingBookingIds.length > 0) {
        const matchingLinks = await fetchPaginatedImportRecords<{
          delegate_id: string | null
        }>(
          async (from, to) =>
            await supabase
              .from('booking_delegates')
              .select('delegate_id')
              .eq('client_id', clientId)
              .eq('organisation_id', currentProfile.organisation_id)
              .in('booking_id', matchingBookingIds)
              .range(from, to)
        )

        matchingDelegateIds = Array.from(
          new Set(
            matchingLinks
              .map((link) => link.delegate_id)
              .filter(Boolean) as string[]
          )
        )
      }
    }

    let delegateQuery = supabase
      .from('delegates')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('full_name', { ascending: true })
      .range(delegateFrom, delegateTo)

    if (searchTerm) {
      const term = `%${searchTerm}%`
      const filters = [
        `full_name.ilike.${term}`,
        `email.ilike.${term}`,
        `phone.ilike.${term}`,
        `notes.ilike.${term}`,
      ]

      if (matchingDelegateIds.length > 0) {
        filters.push(`id.in.(${matchingDelegateIds.join(',')})`)
      }

      delegateQuery = delegateQuery.or(filters.join(','))
    }

    const { data: delegatesData, count: delegatesTotal } = await delegateQuery

    const visibleDelegateIds = (delegatesData || []).map((delegate) => delegate.id)

    let bookingDelegateLinksData: any[] = []

    if (visibleDelegateIds.length > 0) {
      const { data: visibleLinks } = await supabase
        .from('booking_delegates')
        .select('*')
        .in('delegate_id', visibleDelegateIds)
        .eq('client_id', clientId)
        .eq('organisation_id', currentProfile.organisation_id)

      bookingDelegateLinksData = visibleLinks || []
    }

    const { data: bookingsData, count: bookingsTotal } = await supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('date', { ascending: false })
      .range(bookingFrom, bookingTo)

    let invoicesQuery = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organisation_id', currentProfile.organisation_id)
      .order('created_at', { ascending: false })
      .range(invoiceFrom, invoiceTo)

    if (bookingIds.length > 0) {
      invoicesQuery = invoicesQuery.or(
        `client_id.eq.${clientId},booking_id.in.(${bookingIds.join(',')})`
      )
    } else {
      invoicesQuery = invoicesQuery.eq('client_id', clientId)
    }

    const { data: invoicesData, count: invoicesTotal } = await invoicesQuery

    let certificatesData: any[] = []
    let certificatesTotal = 0

    if (delegateIds.length > 0) {
      const certificateResults = await supabase
        .from('certificates')
        .select('*', { count: 'exact' })
        .in('delegate_id', delegateIds)
        .eq('organisation_id', currentProfile.organisation_id)
        .order('created_at', { ascending: false })
        .range(certificateFrom, certificateTo)

      certificatesData = certificateResults.data || []
      certificatesTotal = certificateResults.count || 0
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count: delegatesWithEmailTotal } = await supabase
      .from('delegates')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('organisation_id', currentProfile.organisation_id)
      .not('email', 'is', null)

    const { count: upcomingTotal } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('organisation_id', currentProfile.organisation_id)
      .neq('status', 'cancelled')
      .gte('date', today.toISOString().split('T')[0])

    const { count: completedTotal } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('organisation_id', currentProfile.organisation_id)
      .eq('status', 'completed')

    const invoiceSummary = await fetchPaginatedImportRecords<any>(
      async (from, to) => {
        let summaryQuery = supabase
          .from('invoices')
          .select('amount,total_amount,status')
          .eq('organisation_id', currentProfile.organisation_id)
          .range(from, to)

        if (bookingIds.length > 0) {
          summaryQuery = summaryQuery.or(
            `client_id.eq.${clientId},booking_id.in.(${bookingIds.join(',')})`
          )
        } else {
          summaryQuery = summaryQuery.eq('client_id', clientId)
        }

        return await summaryQuery
      }
    )

    let validCertificateTotal = 0

    if (delegateIds.length > 0) {
      const todayString = today.toISOString().split('T')[0]
      const { count } = await supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .in('delegate_id', delegateIds)
        .eq('organisation_id', currentProfile.organisation_id)
        .eq('status', 'valid')
        .or(`expiry_date.is.null,expiry_date.gte.${todayString}`)

      validCertificateTotal = count || 0
    }

    setClient(clientData)
    setBookings(bookingsData || [])
    setDelegates(delegatesData || [])
    setBookingDelegateLinks(bookingDelegateLinksData || [])
    setInvoices(invoicesData || [])
    setCertificates(certificatesData)
    setDelegateCount(delegatesTotal || 0)
    setDelegateEmailCount(delegatesWithEmailTotal || 0)
    setBookingCount(bookingsTotal || 0)
    setUpcomingBookingCount(upcomingTotal || 0)
    setCompletedBookingCount(completedTotal || 0)
    setInvoiceCount(invoicesTotal || 0)
    setUnpaidInvoiceCount(invoiceSummary.filter((invoice) => invoice.status !== 'paid').length)
    setTotalInvoiceValue(
      invoiceSummary.reduce(
        (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
        0
      )
    )
    setCertificateCount(certificatesTotal)
    setValidCertificateCount(validCertificateTotal)

    setEditCompany(clientData.company || '')
    setEditName(clientData.name || '')
    setEditEmail(clientData.email || '')
    setEditPhone(clientData.phone || '')
    setEditAddress(clientData.address || '')
    setEditNotes(clientData.notes || '')

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!profile?.organisation_id) return

    const timeout = window.setTimeout(() => {
      setDelegatePage(1)
      load({
        nextDelegatePage: 1,
        nextDelegateSearch: delegateSearch,
      })
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [delegateSearch, profile?.organisation_id])

  const startEditing = () => {
    setEditCompany(client.company || '')
    setEditName(client.name || '')
    setEditEmail(client.email || '')
    setEditPhone(client.phone || '')
    setEditAddress(client.address || '')
    setEditNotes(client.notes || '')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditCompany(client.company || '')
    setEditName(client.name || '')
    setEditEmail(client.email || '')
    setEditPhone(client.phone || '')
    setEditAddress(client.address || '')
    setEditNotes(client.notes || '')
    setEditing(false)
  }

  const saveClient = async () => {
    if (!editCompany || !editName) {
      alert('Company and primary contact name are required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('clients')
      .update({
        company: editCompany,
        name: editName,
        email: editEmail,
        phone: editPhone,
        address: editAddress,
        notes: editNotes,
      })
      .eq('id', client.id)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setEditing(false)
    load()
  }

  const addDelegate = async () => {
    if (!delegateName) {
      alert('Delegate name is required')
      return
    }

    const { error } = await supabase.from('delegates').insert({
      organisation_id: profile.organisation_id,
      client_id: client.id,
      booking_id: null,
      full_name: delegateName,
      email: delegateEmail || null,
      phone: delegatePhone || null,
      notes: delegateNotes || null,
    })

    if (error) {
      alert(error.message)
      return
    }

    setDelegateName('')
    setDelegateEmail('')
    setDelegatePhone('')
    setDelegateNotes('')

    setDelegatePage(1)
    load({ nextDelegatePage: 1 })
  }

  const startEditingDelegate = (delegate: any) => {
    setEditingDelegateId(delegate.id)
    setEditDelegateName(delegate.full_name || '')
    setEditDelegateEmail(delegate.email || '')
    setEditDelegatePhone(delegate.phone || '')
    setEditDelegateNotes(delegate.notes || '')
  }

  const cancelEditingDelegate = () => {
    setEditingDelegateId('')
    setEditDelegateName('')
    setEditDelegateEmail('')
    setEditDelegatePhone('')
    setEditDelegateNotes('')
  }

  const saveDelegate = async (delegateId: string) => {
    if (!editDelegateName) {
      alert('Delegate name is required')
      return
    }

    const { error } = await supabase
      .from('delegates')
      .update({
        full_name: editDelegateName,
        email: editDelegateEmail || null,
        phone: editDelegatePhone || null,
        notes: editDelegateNotes || null,
      })
      .eq('id', delegateId)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditingDelegate()
    load({ nextDelegatePage: delegatePage })
  }

  const deleteDelegate = async (delegateId: string) => {
    const confirmDelete = confirm(
      'Are you sure you want to delete this delegate profile? This may also remove their booking links.'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('delegates')
      .delete()
      .eq('id', delegateId)

    if (error) {
      alert(error.message)
      return
    }

    load({ nextDelegatePage: delegatePage })
  }

  const getBookingsForDelegate = (delegate: any) => {
    const links = bookingDelegateLinks.filter(
      (link) => link.delegate_id === delegate.id
    )

    const linkedBookingIds = links.map((link) => link.booking_id)

    return bookings.filter((booking) => linkedBookingIds.includes(booking.id))
  }

  const getCertificatesForDelegate = (delegate: any) => {
    return certificates.filter(
      (certificate) => certificate.delegate_id === delegate.id
    )
  }

  const getBookingForInvoice = (invoice: any) => {
    return bookings.find((booking) => booking.id === invoice.booking_id)
  }

  const getBookingForCertificate = (certificate: any) => {
    return bookings.find((booking) => booking.id === certificate.booking_id)
  }

  const getPageSummary = (page: number, count: number, label: string) => {
    if (count === 0) return `Showing 0 of 0 ${label}`

    const start = (page - 1) * RELATED_PAGE_SIZE + 1
    const end = Math.min(page * RELATED_PAGE_SIZE, count)

    return `Showing ${start}-${end} of ${count} ${label}`
  }

  const getTotalPages = (count: number) =>
    Math.max(1, Math.ceil(count / RELATED_PAGE_SIZE))

  const goToDelegatePage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), getTotalPages(delegateCount))

    setDelegatePage(nextPage)
    load({ nextDelegatePage: nextPage })
  }

  const goToBookingPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), getTotalPages(bookingCount))

    setBookingPage(nextPage)
    load({ nextBookingPage: nextPage })
  }

  const goToInvoicePage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), getTotalPages(invoiceCount))

    setInvoicePage(nextPage)
    load({ nextInvoicePage: nextPage })
  }

  const goToCertificatePage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), getTotalPages(certificateCount))

    setCertificatePage(nextPage)
    load({ nextCertificatePage: nextPage })
  }

  const getBookingStatusStyle = (status: string) => {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (status === 'cancelled') return 'bg-red-50 text-red-700 border-red-100'
    return 'bg-blue-50 text-blue-700 border-blue-100'
  }

  const getInvoiceStatusStyle = (status: string) => {
    if (status === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (status === 'sent') return 'bg-blue-50 text-blue-700 border-blue-100'
    return 'bg-amber-50 text-amber-700 border-amber-100'
  }

  const getCertificateStatusStyle = (status: string) => {
    if (status === 'revoked') return 'bg-red-50 text-red-700 border-red-100'
    if (status === 'expired') return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-emerald-50 text-emerald-700 border-emerald-100'
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

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading company profile...
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div>
        <Link
          href="/dashboard/clients"
          className="text-sm text-slate-500 hover:text-slate-950"
        >
          ← Back to clients
        </Link>

        <div className={`${panelClass} mt-4`}>
          <div className="p-4 text-sm text-slate-500">
            Client not found.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className="text-sm text-slate-500 hover:text-slate-950"
        >
          ← Back to clients
        </Link>

        <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Client profile
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
              {client.company || 'Unnamed company'}
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Company profile, delegates, bookings, invoices and certificates.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!editing && (
              <button
                className={buttonPrimary}
                onClick={startEditing}
              >
                Edit company
              </button>
            )}

            <span className="border border-emerald-100 bg-emerald-50 text-emerald-700 px-2.5 py-2 rounded-md text-xs font-medium">
              Active client
            </span>
          </div>
        </div>
      </div>

      <div className={`${panelClass} mb-4`}>
        <div className={`${panelHeaderClass} flex flex-col md:flex-row md:items-center md:justify-between gap-3`}>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Company details
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Primary contact and company information.
            </p>
          </div>

          {editing && (
            <div className="flex gap-2">
              <button
                className={buttonSecondary}
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className={buttonPrimary}
                onClick={saveClient}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          )}
        </div>

        <div className="p-4">
          {!editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Company</p>
                <p className="font-medium text-slate-950 mt-1">
                  {client.company || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Primary contact</p>
                <p className="font-medium text-slate-950 mt-1">
                  {client.name || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium text-slate-950 mt-1 break-all">
                  {client.email || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="font-medium text-slate-950 mt-1">
                  {client.phone || 'Not set'}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs text-slate-500">Address</p>
                <p className="font-medium text-slate-950 mt-1 whitespace-pre-line">
                  {client.address || 'Not set'}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs text-slate-500">Notes</p>
                <p className="font-medium text-slate-950 mt-1 whitespace-pre-line">
                  {client.notes || 'No notes'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className={inputClass}
                placeholder="Company / school name"
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
              />

              <input
                className={inputClass}
                placeholder="Primary contact name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <input
                className={inputClass}
                placeholder="Primary contact email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />

              <input
                className={inputClass}
                placeholder="Primary contact phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />

              <textarea
                className={`${inputClass} md:col-span-2 min-h-20`}
                placeholder="Address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />

              <textarea
                className={`${inputClass} md:col-span-2 min-h-20`}
                placeholder="Notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
        <StatCard
          label="Bookings"
          value={bookingCount}
          detail="Total sessions"
        />

        <StatCard
          label="Upcoming"
          value={upcomingBookingCount}
          detail="Future sessions"
        />

        <StatCard
          label="Completed"
          value={completedBookingCount}
          detail="Finished sessions"
        />

        <StatCard
          label="Delegates"
          value={delegateCount}
          detail="Learner profiles"
        />

        <StatCard
          label="Invoice value"
          value={`£${totalInvoiceValue.toFixed(2)}`}
          detail="Total invoiced"
        />

        <StatCard
          label="Valid certs"
          value={validCertificateCount}
          detail="Current certificates"
        />
      </div>

      {unpaidInvoiceCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-800">
          This client has {unpaidInvoiceCount} unpaid invoice
          {unpaidInvoiceCount === 1 ? '' : 's'}.
        </div>
      )}

      <div className={`${panelClass} mb-4`}>
        <div className={`${panelHeaderClass} flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3`}>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Delegates
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Learner profiles connected to this company.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700">
              {delegateCount} total
            </span>

            <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700">
              {delegateEmailCount} with email
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-950 mb-3">
              Add delegate
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <input
                className={inputClass}
                placeholder="Delegate full name"
                value={delegateName}
                onChange={(e) => setDelegateName(e.target.value)}
              />

              <input
                className={inputClass}
                placeholder="Email optional"
                value={delegateEmail}
                onChange={(e) => setDelegateEmail(e.target.value)}
              />

              <input
                className={inputClass}
                placeholder="Phone optional"
                value={delegatePhone}
                onChange={(e) => setDelegatePhone(e.target.value)}
              />

              <button
                className={buttonPrimary}
                onClick={addDelegate}
              >
                Add delegate
              </button>

              <textarea
                className={`${inputClass} lg:col-span-4 min-h-20`}
                placeholder="Notes optional"
                value={delegateNotes}
                onChange={(e) => setDelegateNotes(e.target.value)}
              />
            </div>
          </div>

          <input
            className={`${inputClass} w-full mb-4`}
            placeholder="Search delegates by name, email, phone, course or date..."
            value={delegateSearch}
            onChange={(e) => setDelegateSearch(e.target.value)}
          />

          <p className="mb-3 text-xs text-slate-500">
            {getPageSummary(delegatePage, delegateCount, 'delegates')}
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {delegates.map((delegate) => {
              const delegateBookings = getBookingsForDelegate(delegate)
              const delegateCertificates = getCertificatesForDelegate(delegate)
              const isEditingDelegate = editingDelegateId === delegate.id

              return (
                <div
                  key={delegate.id}
                  className="bg-white p-4"
                >
                  {!isEditingDelegate ? (
                    <>
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div>
                          <Link
                            href={`/dashboard/delegates/${delegate.id}`}
                            className="text-sm font-semibold text-slate-950 hover:underline"
                          >
                            {delegate.full_name}
                          </Link>

                          <div className="text-xs text-slate-600 mt-2 space-y-1">
                            <p>Email: {delegate.email || 'Not set'}</p>
                            <p>Phone: {delegate.phone || 'Not set'}</p>

                            {delegate.notes && (
                              <p>Notes: {delegate.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 lg:text-right">
                          <p className="font-medium text-slate-950">
                            {delegateBookings.length} booking
                            {delegateBookings.length === 1 ? '' : 's'}
                          </p>

                          <p className="mt-1">
                            {delegateCertificates.length} certificate
                            {delegateCertificates.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {delegateBookings.length > 0 ? (
                          delegateBookings.slice(0, 3).map((booking) => (
                            <Link
                              key={booking.id}
                              href={`/dashboard/bookings/${booking.id}`}
                              className="border bg-blue-50 text-blue-700 border-blue-100 px-2.5 py-1 rounded-md text-xs font-medium"
                            >
                              {booking.date} - {booking.course_name}
                            </Link>
                          ))
                        ) : (
                          <span className="border bg-amber-50 text-amber-700 border-amber-100 px-2.5 py-1 rounded-md text-xs font-medium">
                            No bookings yet
                          </span>
                        )}

                        {delegateCertificates.length > 0 ? (
                          delegateCertificates.map((certificate) => (
                            <span
                              key={certificate.id}
                              className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getCertificateStatusStyle(
                                getComputedCertificateStatus(certificate)
                              )}`}
                            >
                              Certificate: {getComputedCertificateStatus(certificate)}
                            </span>
                          ))
                        ) : (
                          <span className="border bg-slate-50 text-slate-700 border-slate-200 px-2.5 py-1 rounded-md text-xs font-medium">
                            No certificates yet
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link
                          href={`/dashboard/delegates/${delegate.id}`}
                          className={buttonPrimary}
                        >
                          View profile
                        </Link>

                        <button
                          className={buttonSecondary}
                          onClick={() => startEditingDelegate(delegate)}
                        >
                          Edit
                        </button>

                        <button
                          className={buttonDanger}
                          onClick={() => deleteDelegate(delegate.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          className={inputClass}
                          placeholder="Delegate full name"
                          value={editDelegateName}
                          onChange={(e) => setEditDelegateName(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          placeholder="Email"
                          value={editDelegateEmail}
                          onChange={(e) => setEditDelegateEmail(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          placeholder="Phone"
                          value={editDelegatePhone}
                          onChange={(e) => setEditDelegatePhone(e.target.value)}
                        />

                        <textarea
                          className={`${inputClass} min-h-20`}
                          placeholder="Notes"
                          value={editDelegateNotes}
                          onChange={(e) => setEditDelegateNotes(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          className={buttonPrimary}
                          onClick={() => saveDelegate(delegate.id)}
                        >
                          Save delegate
                        </button>

                        <button
                          className={buttonSecondary}
                          onClick={cancelEditingDelegate}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}

            {delegates.length === 0 && (
              <div className="bg-white p-4 text-sm text-slate-500">
                No delegates found for this company.
              </div>
            )}
          </div>

          {delegateCount > RELATED_PAGE_SIZE && (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Page {delegatePage} of {getTotalPages(delegateCount)}
              </p>

              <div className="flex gap-2">
                <button
                  className={buttonSecondary}
                  onClick={() => goToDelegatePage(delegatePage - 1)}
                  disabled={delegatePage <= 1}
                >
                  Previous
                </button>

                <button
                  className={buttonSecondary}
                  onClick={() => goToDelegatePage(delegatePage + 1)}
                  disabled={delegatePage >= getTotalPages(delegateCount)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={panelClass}>
          <div className={`${panelHeaderClass} flex items-center justify-between`}>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Bookings
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Recent bookings for this client.
              </p>
            </div>

            <Link
              href="/dashboard/bookings"
              className="text-xs font-medium text-slate-500 hover:text-slate-950"
            >
              Manage
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {bookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/dashboard/bookings/${booking.id}`}
                className="block p-4 hover:bg-slate-50 transition"
              >
                <p className="text-sm font-semibold text-slate-950">
                  {booking.course_name}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {booking.date}
                  {booking.start_time ? ` · ${booking.start_time}` : ''}
                </p>

                <p className="text-xs text-slate-600 mt-1">
                  {booking.location || 'No location set'}
                </p>

                <span className={`inline-flex border mt-3 px-2.5 py-1 rounded-md text-xs font-medium ${getBookingStatusStyle(getComputedBookingStatus(booking))}`}>
                  {getComputedBookingStatus(booking)}
                </span>
              </Link>
            ))}

            {bookings.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                No bookings for this company yet.
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              {getPageSummary(bookingPage, bookingCount, 'bookings')}
            </p>

            {bookingCount > RELATED_PAGE_SIZE && (
              <div className="mt-3 flex gap-2">
                <button
                  className={buttonSecondary}
                  onClick={() => goToBookingPage(bookingPage - 1)}
                  disabled={bookingPage <= 1}
                >
                  Previous
                </button>

                <button
                  className={buttonSecondary}
                  onClick={() => goToBookingPage(bookingPage + 1)}
                  disabled={bookingPage >= getTotalPages(bookingCount)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className={`${panelHeaderClass} flex items-center justify-between`}>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Invoices
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Invoices created from this client’s bookings.
              </p>
            </div>

            <Link
              href="/dashboard/invoices"
              className="text-xs font-medium text-slate-500 hover:text-slate-950"
            >
              Manage
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {invoices.map((invoice) => {
              const booking = getBookingForInvoice(invoice)

              return (
                <div
                  key={invoice.id}
                  className="p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {invoice.invoice_number || 'Invoice'}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {booking?.course_name || 'Booking'}
                      </p>
                    </div>

                    <p className="text-sm font-semibold text-slate-950">
                      £{Number(invoice.total_amount || invoice.amount || 0).toFixed(2)}
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 mt-2">
                    Due: {invoice.due_date || 'Not set'}
                  </p>

                  <span className={`inline-flex border mt-3 px-2.5 py-1 rounded-md text-xs font-medium ${getInvoiceStatusStyle(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
              )
            })}

            {invoices.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                No invoices for this company yet.
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              {getPageSummary(invoicePage, invoiceCount, 'invoices')}
            </p>

            {invoiceCount > RELATED_PAGE_SIZE && (
              <div className="mt-3 flex gap-2">
                <button
                  className={buttonSecondary}
                  onClick={() => goToInvoicePage(invoicePage - 1)}
                  disabled={invoicePage <= 1}
                >
                  Previous
                </button>

                <button
                  className={buttonSecondary}
                  onClick={() => goToInvoicePage(invoicePage + 1)}
                  disabled={invoicePage >= getTotalPages(invoiceCount)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className={`${panelHeaderClass} flex items-center justify-between`}>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Certificates
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Certificates issued to this client’s delegates.
              </p>
            </div>

            <Link
              href="/dashboard/certificates"
              className="text-xs font-medium text-slate-500 hover:text-slate-950"
            >
              Manage
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {certificates.map((certificate) => {
              const booking = getBookingForCertificate(certificate)

              return (
                <div
                  key={certificate.id}
                  className="p-4"
                >
                  <p className="text-sm font-semibold text-slate-950">
                    {certificate.learner_name}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {certificate.course_name || booking?.course_name}
                  </p>

                  <p className="text-xs text-slate-600 mt-2">
                    Expires: {certificate.expiry_date}
                  </p>

                  <span className={`inline-flex border mt-3 px-2.5 py-1 rounded-md text-xs font-medium ${getCertificateStatusStyle(getComputedCertificateStatus(certificate))}`}>
                    {getComputedCertificateStatus(certificate)}
                  </span>
                </div>
              )
            })}

            {certificates.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                No certificates for this company yet.
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <p className="text-xs text-slate-500">
              {getPageSummary(certificatePage, certificateCount, 'certificates')}
            </p>

            {certificateCount > RELATED_PAGE_SIZE && (
              <div className="mt-3 flex gap-2">
                <button
                  className={buttonSecondary}
                  onClick={() => goToCertificatePage(certificatePage - 1)}
                  disabled={certificatePage <= 1}
                >
                  Previous
                </button>

                <button
                  className={buttonSecondary}
                  onClick={() => goToCertificatePage(certificatePage + 1)}
                  disabled={certificatePage >= getTotalPages(certificateCount)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
