'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function ClientDetailPage() {
  const params = useParams()

  const [client, setClient] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editName, setEditName] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()

    const clientId = params.id as string

    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('organisation_id', profile.organisation_id)
      .single()

    if (clientError) {
      console.error(clientError)
      setLoading(false)
      return
    }

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', clientId)
      .eq('organisation_id', profile.organisation_id)
      .order('date', { ascending: false })

    const bookingIds = (bookingsData || []).map((booking) => booking.id)

    let invoicesData: any[] = []
    let certificatesData: any[] = []

    if (bookingIds.length > 0) {
      const { data: invoiceResults } = await supabase
        .from('invoices')
        .select('*')
        .in('booking_id', bookingIds)
        .eq('organisation_id', profile.organisation_id)
        .order('created_at', { ascending: false })

      const { data: certificateResults } = await supabase
        .from('certificates')
        .select('*')
        .in('booking_id', bookingIds)
        .eq('organisation_id', profile.organisation_id)
        .order('created_at', { ascending: false })

      invoicesData = invoiceResults || []
      certificatesData = certificateResults || []
    }

    setClient(clientData)
    setBookings(bookingsData || [])
    setInvoices(invoicesData)
    setCertificates(certificatesData)

    setEditName(clientData.name || '')
    setEditCompany(clientData.company || '')
    setEditEmail(clientData.email || '')
    setEditPhone(clientData.phone || '')

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const startEditing = () => {
    setEditName(client.name || '')
    setEditCompany(client.company || '')
    setEditEmail(client.email || '')
    setEditPhone(client.phone || '')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditName(client.name || '')
    setEditCompany(client.company || '')
    setEditEmail(client.email || '')
    setEditPhone(client.phone || '')
    setEditing(false)
  }

  const saveClient = async () => {
    if (!editName || !editCompany) {
      alert('Contact name and company are required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('clients')
      .update({
        name: editName,
        company: editCompany,
        email: editEmail,
        phone: editPhone,
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

  const getBookingForInvoice = (invoice: any) => {
    return bookings.find((booking) => booking.id === invoice.booking_id)
  }

  const getBookingForCertificate = (certificate: any) => {
    return bookings.find((booking) => booking.id === certificate.booking_id)
  }

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
        Loading client profile...
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
              {client.company}
            </h1>

            <p className="text-gray-500 mt-2">
              {client.name}
            </p>
          </div>

          <div className="flex gap-3">
            {!editing && (
              <button
                className="bg-black text-white px-4 py-2 rounded-lg"
                onClick={startEditing}
              >
                Edit Client
              </button>
            )}

            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm w-fit">
              Active Client
            </div>
          </div>
        </div>
      </div>

      {/* Client Info / Edit Form */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-semibold">
            Client Details
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm text-gray-700">
            <div>
              <p className="text-gray-500">Company</p>
              <p className="font-medium mt-1">{client.company || 'Not set'}</p>
            </div>

            <div>
              <p className="text-gray-500">Contact</p>
              <p className="font-medium mt-1">{client.name || 'Not set'}</p>
            </div>

            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium mt-1">{client.email || 'Not set'}</p>
            </div>

            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-medium mt-1">{client.phone || 'Not set'}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="border p-3 rounded-lg"
              placeholder="Company"
              value={editCompany}
              onChange={(e) => setEditCompany(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Contact name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Phone"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Bookings</p>
          <h2 className="text-3xl font-bold mt-2">{bookings.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Invoice Value</p>
          <h2 className="text-3xl font-bold mt-2">
            £{totalInvoiceValue.toFixed(2)}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Unpaid Invoices</p>
          <h2 className="text-3xl font-bold mt-2">
            {unpaidInvoices.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Valid Certificates</p>
          <h2 className="text-3xl font-bold mt-2">
            {validCertificates.length}
          </h2>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Bookings */}
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
            {bookings.slice(0, 8).map((booking) => (
              <div
                key={booking.id}
                className="bg-gray-50 p-4 rounded-xl"
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
              </div>
            ))}

            {bookings.length === 0 && (
              <p className="text-gray-500">
                No bookings for this client yet.
              </p>
            )}
          </div>
        </div>

        {/* Invoices */}
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
            {invoices.slice(0, 8).map((invoice) => {
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
                No invoices for this client yet.
              </p>
            )}
          </div>
        </div>

        {/* Certificates */}
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
            {certificates.slice(0, 8).map((certificate) => {
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
                No certificates for this client yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}