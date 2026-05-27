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
    if (status === 'completed') return 'bg-green-100 text-green-700'
    if (status === 'cancelled') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  const getInvoiceStatusStyle = (status: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-700'
    if (status === 'sent') return 'bg-blue-100 text-blue-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  const getCertificateStatusStyle = (status: string) => {
    if (status === 'revoked') return 'bg-red-100 text-red-700'
    if (status === 'expired') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading company profile...
      </div>
    )
  }

  if (!client) {
    return (
      <div>
        <Link
          href="/dashboard/clients"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to clients
        </Link>

        <div className="bg-white border rounded-2xl p-6 shadow-sm mt-6">
          Client not found.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/clients"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to clients
        </Link>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">
              {client.company || 'Unnamed company'}
            </h1>

            <p className="text-gray-500 mt-2">
              Company profile, delegates, bookings, invoices and certificates
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!editing && (
              <button
                className="bg-black text-white px-4 py-2 rounded-lg"
                onClick={startEditing}
              >
                Edit Company
              </button>
            )}

            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm w-fit">
              Active Client
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <h2 className="text-2xl font-semibold">
            Company Details
          </h2>

          {editing && (
            <div className="flex gap-3">
              <button
                className="border px-4 py-2 rounded-lg"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                onClick={saveClient}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-sm text-gray-700">
            <div>
              <p className="text-gray-500">Company</p>
              <p className="font-medium mt-1">{client.company || 'Not set'}</p>
            </div>

            <div>
              <p className="text-gray-500">Primary contact</p>
              <p className="font-medium mt-1">{client.name || 'Not set'}</p>
            </div>

            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium mt-1 break-all">{client.email || 'Not set'}</p>
            </div>

            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-medium mt-1">{client.phone || 'Not set'}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-gray-500">Address</p>
              <p className="font-medium mt-1 whitespace-pre-line">
                {client.address || 'Not set'}
              </p>
            </div>

            <div className="md:col-span-2">
              <p className="text-gray-500">Notes</p>
              <p className="font-medium mt-1 whitespace-pre-line">
                {client.notes || 'No notes'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="border p-3 rounded-lg"
              placeholder="Company / school name"
              value={editCompany}
              onChange={(e) => setEditCompany(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Primary contact name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Primary contact email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Primary contact phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />

            <textarea
              className="border p-3 rounded-lg md:col-span-2"
              placeholder="Address"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />

            <textarea
              className="border p-3 rounded-lg md:col-span-2"
              placeholder="Notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Bookings</p>
          <h2 className="text-3xl font-bold mt-2">{bookings.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Upcoming</p>
          <h2 className="text-3xl font-bold mt-2">{upcomingBookings.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Completed</p>
          <h2 className="text-3xl font-bold mt-2">{completedBookings.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Delegates</p>
          <h2 className="text-3xl font-bold mt-2">{delegates.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Invoice Value</p>
          <h2 className="text-3xl font-bold mt-2">
            £{totalInvoiceValue.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Valid Certs</p>
          <h2 className="text-3xl font-bold mt-2">
            {validCertificates.length}
          </h2>
        </div>
      </div>

      {unpaidInvoices.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 mb-8 text-yellow-800">
          This client has {unpaidInvoices.length} unpaid invoice
          {unpaidInvoices.length === 1 ? '' : 's'}.
        </div>
      )}

      <div className="bg-white border rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-semibold">
              Delegates
            </h2>

            <p className="text-gray-500 mt-1">
              Learner profiles connected to this company
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-700">
              {delegates.length} total
            </div>

            <div className="bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-700">
              {delegatesWithEmail.length} with email
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border rounded-2xl p-5 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            Add Delegate
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <input
              className="border p-3 rounded-lg"
              placeholder="Delegate full name"
              value={delegateName}
              onChange={(e) => setDelegateName(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Email optional"
              value={delegateEmail}
              onChange={(e) => setDelegateEmail(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Phone optional"
              value={delegatePhone}
              onChange={(e) => setDelegatePhone(e.target.value)}
            />

            <button
              className="bg-black text-white p-3 rounded-lg"
              onClick={addDelegate}
            >
              Add Delegate
            </button>

            <textarea
              className="border p-3 rounded-lg lg:col-span-4"
              placeholder="Notes optional"
              value={delegateNotes}
              onChange={(e) => setDelegateNotes(e.target.value)}
            />
          </div>
        </div>

        <input
          className="border p-3 rounded-lg w-full mb-5"
          placeholder="Search delegates by name, email, phone, course or date..."
          value={delegateSearch}
          onChange={(e) => setDelegateSearch(e.target.value)}
        />

        <div className="grid gap-4">
          {filteredDelegates.map((delegate) => {
            const delegateBookings = getBookingsForDelegate(delegate)
            const delegateCertificates = getCertificatesForDelegate(delegate)
            const isEditingDelegate = editingDelegateId === delegate.id

            return (
              <div
                key={delegate.id}
                className="bg-gray-50 border rounded-xl p-4"
              >
                {!isEditingDelegate ? (
                  <>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div>
                        <Link
                          href={`/dashboard/delegates/${delegate.id}`}
                          className="font-semibold hover:underline"
                        >
                          {delegate.full_name}
                        </Link>

                        <div className="text-sm text-gray-600 mt-2 space-y-1">
                          <p>Email: {delegate.email || 'Not set'}</p>
                          <p>Phone: {delegate.phone || 'Not set'}</p>

                          {delegate.notes && (
                            <p>Notes: {delegate.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 lg:text-right">
                        <p className="font-medium text-gray-900">
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
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs"
                          >
                            {booking.date} - {booking.course_name}
                          </Link>
                        ))
                      ) : (
                        <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs">
                          No bookings yet
                        </div>
                      )}

                      {delegateCertificates.length > 0 ? (
                        delegateCertificates.map((certificate) => (
                          <div
                            key={certificate.id}
                            className={`px-3 py-1 rounded-full text-xs ${getCertificateStatusStyle(
                              certificate.status
                            )}`}
                          >
                            Certificate: {certificate.status}
                          </div>
                        ))
                      ) : (
                        <div className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs">
                          No certificates yet
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <Link
                        href={`/dashboard/delegates/${delegate.id}`}
                        className="bg-black text-white px-4 py-2 rounded-lg"
                      >
                        View Profile
                      </Link>

                      <button
                        className="border px-4 py-2 rounded-lg bg-white"
                        onClick={() => startEditingDelegate(delegate)}
                      >
                        Edit
                      </button>

                      <button
                        className="border border-red-300 text-red-600 px-4 py-2 rounded-lg bg-white"
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
                        className="border p-3 rounded-lg"
                        placeholder="Delegate full name"
                        value={editDelegateName}
                        onChange={(e) => setEditDelegateName(e.target.value)}
                      />

                      <input
                        className="border p-3 rounded-lg"
                        placeholder="Email"
                        value={editDelegateEmail}
                        onChange={(e) => setEditDelegateEmail(e.target.value)}
                      />

                      <input
                        className="border p-3 rounded-lg"
                        placeholder="Phone"
                        value={editDelegatePhone}
                        onChange={(e) => setEditDelegatePhone(e.target.value)}
                      />

                      <textarea
                        className="border p-3 rounded-lg"
                        placeholder="Notes"
                        value={editDelegateNotes}
                        onChange={(e) => setEditDelegateNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        className="bg-black text-white px-4 py-2 rounded-lg"
                        onClick={() => saveDelegate(delegate.id)}
                      >
                        Save Delegate
                      </button>

                      <button
                        className="border px-4 py-2 rounded-lg bg-white"
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
            <div className="bg-gray-50 border rounded-xl p-4 text-gray-500">
              No delegates found for this company.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">
              Bookings
            </h2>

            <Link
              href="/dashboard/bookings"
              className="text-sm text-gray-500 hover:text-black"
            >
              Manage
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {bookings.slice(0, 10).map((booking) => (
              <Link
                key={booking.id}
                href={`/dashboard/bookings/${booking.id}`}
                className="bg-gray-50 p-4 rounded-xl hover:bg-gray-100 transition block"
              >
                <p className="font-semibold">{booking.course_name}</p>

                <p className="text-sm text-gray-500 mt-1">
                  {booking.date}
                  {booking.start_time ? ` at ${booking.start_time}` : ''}
                </p>

                <p className="text-sm text-gray-600 mt-1">
                  {booking.location || 'No location set'}
                </p>

                <div className={`mt-3 px-3 py-1 rounded-full text-xs w-fit ${getBookingStatusStyle(booking.status)}`}>
                  {booking.status}
                </div>

                <p className="text-xs text-gray-400 mt-3">
                  View booking →
                </p>
              </Link>
            ))}

            {bookings.length === 0 && (
              <p className="text-gray-500">
                No bookings for this company yet.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">
              Invoices
            </h2>

            <Link
              href="/dashboard/invoices"
              className="text-sm text-gray-500 hover:text-black"
            >
              Manage
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {invoices.slice(0, 10).map((invoice) => {
              const booking = getBookingForInvoice(invoice)

              return (
                <div
                  key={invoice.id}
                  className="bg-gray-50 p-4 rounded-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {invoice.invoice_number || 'Invoice'}
                      </p>

                      <p className="text-sm text-gray-500 mt-1">
                        {booking?.course_name || 'Booking'}
                      </p>
                    </div>

                    <p className="font-semibold">
                      £{Number(invoice.total_amount || invoice.amount || 0).toFixed(2)}
                    </p>
                  </div>

                  <p className="text-sm text-gray-600 mt-2">
                    Due: {invoice.due_date || 'Not set'}
                  </p>

                  <div className={`mt-3 px-3 py-1 rounded-full text-xs w-fit ${getInvoiceStatusStyle(invoice.status)}`}>
                    {invoice.status}
                  </div>
                </div>
              )
            })}

            {invoices.length === 0 && (
              <p className="text-gray-500">
                No invoices for this company yet.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">
              Certificates
            </h2>

            <Link
              href="/dashboard/certificates"
              className="text-sm text-gray-500 hover:text-black"
            >
              Manage
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {certificates.slice(0, 10).map((certificate) => {
              const booking = getBookingForCertificate(certificate)

              return (
                <div
                  key={certificate.id}
                  className="bg-gray-50 p-4 rounded-xl"
                >
                  <p className="font-semibold">
                    {certificate.learner_name}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {certificate.course_name || booking?.course_name}
                  </p>

                  <p className="text-sm text-gray-600 mt-2">
                    Expires: {certificate.expiry_date}
                  </p>

                  <div className={`mt-3 px-3 py-1 rounded-full text-xs w-fit ${getCertificateStatusStyle(certificate.status)}`}>
                    {certificate.status}
                  </div>
                </div>
              )
            })}

            {certificates.length === 0 && (
              <p className="text-gray-500">
                No certificates for this company yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}