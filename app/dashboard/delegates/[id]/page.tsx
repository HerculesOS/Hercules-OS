'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function DelegateProfilePage() {
  const params = useParams()

  const [profile, setProfile] = useState<any>(null)
  const [delegate, setDelegate] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [bookingLinks, setBookingLinks] = useState<any[]>([])
  const [linkedBookings, setLinkedBookings] = useState<any[]>([])
  const [allClientBookings, setAllClientBookings] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editClientId, setEditClientId] = useState('')
  const [editFullName, setEditFullName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [bookingToAttach, setBookingToAttach] = useState('')
  const [attaching, setAttaching] = useState(false)

  const load = async () => {
    const currentProfile = await getOrCreateAccount()
    const delegateId = params.id as string

    setProfile(currentProfile)

    const { data: delegateData, error: delegateError } = await supabase
      .from('delegates')
      .select('*')
      .eq('id', delegateId)
      .eq('organisation_id', currentProfile.organisation_id)
      .single()

    if (delegateError || !delegateData) {
      setDelegate(null)
      setLoading(false)
      return
    }

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .order('company', { ascending: true })

    let clientData = null

    if (delegateData.client_id) {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', delegateData.client_id)
        .eq('organisation_id', currentProfile.organisation_id)
        .single()

      clientData = data
    }

    const { data: allBookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', delegateData.client_id)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('date', { ascending: false })

    const { data: bookingLinksData } = await supabase
      .from('booking_delegates')
      .select('*')
      .eq('delegate_id', delegateId)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('created_at', { ascending: false })

    const bookingIds = (bookingLinksData || []).map((link) => link.booking_id)

    let linkedBookingsData: any[] = []

    if (bookingIds.length > 0) {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .in('id', bookingIds)
        .eq('organisation_id', currentProfile.organisation_id)
        .order('date', { ascending: false })

      linkedBookingsData = data || []
    }

    const { data: certificatesData } = await supabase
      .from('certificates')
      .select('*')
      .eq('delegate_id', delegateId)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('created_at', { ascending: false })

    setDelegate(delegateData)
    setClient(clientData)
    setClients(clientsData || [])
    setAllClientBookings(allBookingsData || [])
    setBookingLinks(bookingLinksData || [])
    setLinkedBookings(linkedBookingsData)
    setCertificates(certificatesData || [])

    setEditClientId(delegateData.client_id || '')
    setEditFullName(delegateData.full_name || '')
    setEditEmail(delegateData.email || '')
    setEditPhone(delegateData.phone || '')
    setEditNotes(delegateData.notes || '')

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const startEditing = () => {
    setEditClientId(delegate.client_id || '')
    setEditFullName(delegate.full_name || '')
    setEditEmail(delegate.email || '')
    setEditPhone(delegate.phone || '')
    setEditNotes(delegate.notes || '')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditClientId(delegate.client_id || '')
    setEditFullName(delegate.full_name || '')
    setEditEmail(delegate.email || '')
    setEditPhone(delegate.phone || '')
    setEditNotes(delegate.notes || '')
    setEditing(false)
  }

  const saveDelegate = async () => {
    if (!editClientId || !editFullName) {
      alert('Client and delegate name are required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('delegates')
      .update({
        client_id: editClientId,
        full_name: editFullName,
        email: editEmail || null,
        phone: editPhone || null,
        notes: editNotes || null,
      })
      .eq('id', delegate.id)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setEditing(false)
    load()
  }

  const attachToBooking = async () => {
    if (!bookingToAttach) {
      alert('Select a booking first')
      return
    }

    setAttaching(true)

    const { error } = await supabase
      .from('booking_delegates')
      .insert({
        organisation_id: profile.organisation_id,
        client_id: delegate.client_id,
        booking_id: bookingToAttach,
        delegate_id: delegate.id,
      })

    setAttaching(false)

    if (error) {
      if (error.message.includes('duplicate')) {
        alert('This delegate is already attached to that booking.')
        return
      }

      alert(error.message)
      return
    }

    setBookingToAttach('')
    load()
  }

  const removeFromBooking = async (bookingId: string) => {
    const confirmRemove = confirm(
      'Remove this delegate from this booking? Their delegate profile will not be deleted.'
    )

    if (!confirmRemove) return

    const { error } = await supabase
      .from('booking_delegates')
      .delete()
      .eq('delegate_id', delegate.id)
      .eq('booking_id', bookingId)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const getBookingStatusStyle = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700'
    if (status === 'cancelled') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  const getCertificateStatusStyle = (status: string) => {
    if (status === 'revoked') return 'bg-red-100 text-red-700'
    if (status === 'expired') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  const linkedBookingIds = linkedBookings.map((booking) => booking.id)

  const availableBookings = allClientBookings.filter(
    (booking) => !linkedBookingIds.includes(booking.id)
  )

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading delegate profile...
      </div>
    )
  }

  if (!delegate) {
    return (
      <div>
        <Link
          href="/dashboard/delegates"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to delegates
        </Link>

        <div className="bg-white border rounded-2xl p-6 shadow-sm mt-6">
          Delegate not found.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/delegates"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to delegates
        </Link>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">
              {delegate.full_name}
            </h1>

            <p className="text-gray-500 mt-2">
              Delegate profile, booking history and certificates
            </p>
          </div>

          {!editing && (
            <button
              className="bg-black text-white px-4 py-2 rounded-lg"
              onClick={startEditing}
            >
              Edit Delegate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Bookings</p>
          <h2 className="text-3xl font-bold mt-2">{linkedBookings.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Certificates</p>
          <h2 className="text-3xl font-bold mt-2">{certificates.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Email</p>
          <h2 className="text-xl font-bold mt-2 break-all">
            {delegate.email ? 'Set' : 'Missing'}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Client</p>
          <h2 className="text-xl font-bold mt-2">
            {client?.company || 'Not set'}
          </h2>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <h2 className="text-2xl font-semibold">
            Delegate Details
          </h2>

          {editing && (
            <div className="flex flex-wrap gap-3">
              <button
                className="border px-4 py-2 rounded-lg"
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                onClick={saveDelegate}
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
              <p className="text-gray-500">Full name</p>
              <p className="font-medium mt-1">{delegate.full_name}</p>
            </div>

            <div>
              <p className="text-gray-500">Client</p>

              {client ? (
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="font-medium mt-1 inline-block hover:underline"
                >
                  {client.company}
                </Link>
              ) : (
                <p className="font-medium mt-1">Not set</p>
              )}
            </div>

            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium mt-1 break-all">
                {delegate.email || 'Not set'}
              </p>
            </div>

            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-medium mt-1">
                {delegate.phone || 'Not set'}
              </p>
            </div>

            <div className="md:col-span-2 xl:col-span-4">
              <p className="text-gray-500">Notes</p>
              <p className="font-medium mt-1 whitespace-pre-line">
                {delegate.notes || 'No notes'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="border p-3 rounded-lg md:col-span-2"
              value={editClientId}
              onChange={(e) => setEditClientId(e.target.value)}
            >
              <option value="">Select Client / Company</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company} - {client.name}
                </option>
              ))}
            </select>

            <input
              className="border p-3 rounded-lg"
              placeholder="Full name"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
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

            <textarea
              className="border p-3 rounded-lg"
              placeholder="Notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-semibold">
              Attach to Booking
            </h2>

            <p className="text-gray-500 mt-1">
              Add this delegate to another booking for the same client.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="border p-3 rounded-lg md:col-span-2"
            value={bookingToAttach}
            onChange={(e) => setBookingToAttach(e.target.value)}
          >
            <option value="">Select booking</option>

            {availableBookings.map((booking) => (
              <option key={booking.id} value={booking.id}>
                {booking.date} - {booking.course_name}
              </option>
            ))}
          </select>

          <button
            className="bg-black text-white p-3 rounded-lg disabled:bg-gray-400"
            onClick={attachToBooking}
            disabled={attaching}
          >
            {attaching ? 'Attaching...' : 'Attach'}
          </button>
        </div>

        {availableBookings.length === 0 && (
          <p className="text-sm text-gray-500 mt-3">
            No available bookings to attach for this client.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">
            Booking History
          </h2>

          <div className="grid gap-4">
            {linkedBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-gray-50 border rounded-xl p-4"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="font-semibold hover:underline"
                    >
                      {booking.course_name}
                    </Link>

                    <p className="text-sm text-gray-500 mt-1">
                      {booking.date}
                      {booking.start_time ? ` at ${booking.start_time}` : ''}
                    </p>

                    <p className="text-sm text-gray-600 mt-1">
                      {booking.location || 'No location set'}
                    </p>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs w-fit ${getBookingStatusStyle(booking.status)}`}>
                    {booking.status}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <Link
                    href={`/dashboard/bookings/${booking.id}`}
                    className="border px-4 py-2 rounded-lg bg-white"
                  >
                    View Booking
                  </Link>

                  <button
                    className="border border-red-300 text-red-600 px-4 py-2 rounded-lg bg-white"
                    onClick={() => removeFromBooking(booking.id)}
                  >
                    Remove Link
                  </button>
                </div>
              </div>
            ))}

            {linkedBookings.length === 0 && (
              <p className="text-gray-500">
                No bookings linked to this delegate yet.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">
            Certificates
          </h2>

          <div className="grid gap-4">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="bg-gray-50 border rounded-xl p-4"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {certificate.course_name}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      Certificate No: {certificate.certificate_number}
                    </p>

                    <p className="text-sm text-gray-600 mt-1">
                      Issued: {certificate.issue_date}
                    </p>

                    <p className="text-sm text-gray-600 mt-1">
                      Expires: {certificate.expiry_date}
                    </p>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-xs w-fit ${getCertificateStatusStyle(certificate.status)}`}>
                    {certificate.status}
                  </div>
                </div>
              </div>
            ))}

            {certificates.length === 0 && (
              <p className="text-gray-500">
                No certificates linked to this delegate yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}