'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

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

  const load = async () => {
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

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', clientId)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('date', { ascending: false })

    const { data: delegatesData } = await supabase
      .from('delegates')
      .select('*')
      .eq('client_id', clientId)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('full_name', { ascending: true })

    const { data: bookingDelegateLinksData } = await supabase
      .from('booking_delegates')
      .select('*')
      .eq('client_id', clientId)
      .eq('organisation_id', currentProfile.organisation_id)

    const bookingIds = (bookingsData || []).map((booking) => booking.id)
    const delegateIds = (delegatesData || []).map((delegate) => delegate.id)

    let invoicesData: any[] = []
    let certificatesData: any[] = []

    if (bookingIds.length > 0) {
      const { data: invoiceResults } = await supabase
        .from('invoices')
        .select('*')
        .in('booking_id', bookingIds)
        .eq('organisation_id', currentProfile.organisation_id)
        .order('created_at', { ascending: false })

      invoicesData = invoiceResults || []
    }

    if (delegateIds.length > 0) {
      const { data: certificateResults } = await supabase
        .from('certificates')
        .select('*')
        .in('delegate_id', delegateIds)
        .eq('organisation_id', currentProfile.organisation_id)
        .order('created_at', { ascending: false })

      certificatesData = certificateResults || []
    }

    setClient(clientData)
    setBookings(bookingsData || [])
    setDelegates(delegatesData || [])
    setBookingDelegateLinks(bookingDelegateLinksData || [])
    setInvoices(invoicesData)
    setCertificates(certificatesData)

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

    load()
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
    load()
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

    load()
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

  const totalInvoiceValue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
    0
  )

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status !== 'paid'
  )

  const validCertificates = certificates.filter(
    (certificate) => certificate.status === 'valid'
  )

  const upcomingBookings = bookings.filter((booking) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const bookingDate = new Date(booking.date)
    bookingDate.setHours(0, 0, 0, 0)

    return bookingDate >= today && booking.status !== 'cancelled'
  })

  const completedBookings = bookings.filter(
    (booking) => booking.status === 'completed'
  )

  const delegatesWithEmail = delegates.filter((delegate) => delegate.email)

  const filteredDelegates = delegates.filter((delegate) => {
    const delegateBookings = getBookingsForDelegate(delegate)

    const bookingText = delegateBookings
      .map((booking) => `${booking.course_name} ${booking.date}`)
      .join(' ')

    const searchableText = `
      ${delegate.full_name || ''}
      ${delegate.email || ''}
      ${delegate.phone || ''}
      ${delegate.notes || ''}
      ${bookingText}
    `.toLowerCase()

    return searchableText.includes(delegateSearch.toLowerCase())
  })

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
          value={bookings.length}
          detail="Total sessions"
        />

        <StatCard
          label="Upcoming"
          value={upcomingBookings.length}
          detail="Future sessions"
        />

        <StatCard
          label="Completed"
          value={completedBookings.length}
          detail="Finished sessions"
        />

        <StatCard
          label="Delegates"
          value={delegates.length}
          detail="Learner profiles"
        />

        <StatCard
          label="Invoice value"
          value={`£${totalInvoiceValue.toFixed(2)}`}
          detail="Total invoiced"
        />

        <StatCard
          label="Valid certs"
          value={validCertificates.length}
          detail="Current certificates"
        />
      </div>

      {unpaidInvoices.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 text-sm text-amber-800">
          This client has {unpaidInvoices.length} unpaid invoice
          {unpaidInvoices.length === 1 ? '' : 's'}.
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
              {delegates.length} total
            </span>

            <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700">
              {delegatesWithEmail.length} with email
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

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {filteredDelegates.map((delegate) => {
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
                                certificate.status
                              )}`}
                            >
                              Certificate: {certificate.status}
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

            {filteredDelegates.length === 0 && (
              <div className="bg-white p-4 text-sm text-slate-500">
                No delegates found for this company.
              </div>
            )}
          </div>
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
            {bookings.slice(0, 10).map((booking) => (
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

                <span className={`inline-flex border mt-3 px-2.5 py-1 rounded-md text-xs font-medium ${getBookingStatusStyle(booking.status)}`}>
                  {booking.status}
                </span>
              </Link>
            ))}

            {bookings.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                No bookings for this company yet.
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
            {invoices.slice(0, 10).map((invoice) => {
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
            {certificates.slice(0, 10).map((certificate) => {
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

                  <span className={`inline-flex border mt-3 px-2.5 py-1 rounded-md text-xs font-medium ${getCertificateStatusStyle(certificate.status)}`}>
                    {certificate.status}
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
        </div>
      </div>
    </div>
  )
}