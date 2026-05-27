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
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (status === 'cancelled') return 'bg-red-50 text-red-700 border-red-100'
    return 'bg-blue-50 text-blue-700 border-blue-100'
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

      <h2 className="text-2xl font-semibold tracking-tight text-slate-950 mt-2 break-all">
        {value}
      </h2>

      {detail && (
        <p className="text-xs text-slate-500 mt-1">
          {detail}
        </p>
      )}
    </div>
  )

  const linkedBookingIds = linkedBookings.map((booking) => booking.id)

  const availableBookings = allClientBookings.filter(
    (booking) => !linkedBookingIds.includes(booking.id)
  )

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading delegate profile...
        </div>
      </div>
    )
  }

  if (!delegate) {
    return (
      <div>
        <Link
          href="/dashboard/delegates"
          className="text-sm text-slate-500 hover:text-slate-950"
        >
          ← Back to delegates
        </Link>

        <div className={`${panelClass} mt-4`}>
          <div className="p-4 text-sm text-slate-500">
            Delegate not found.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/delegates"
          className="text-sm text-slate-500 hover:text-slate-950"
        >
          ← Back to delegates
        </Link>

        <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Delegate profile
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
              {delegate.full_name}
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Delegate details, booking history and certificates.
            </p>
          </div>

          {!editing && (
            <button
              className={buttonPrimary}
              onClick={startEditing}
            >
              Edit delegate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Bookings"
          value={linkedBookings.length}
          detail="Linked sessions"
        />

        <StatCard
          label="Certificates"
          value={certificates.length}
          detail="Issued certificates"
        />

        <StatCard
          label="Email"
          value={delegate.email ? 'Set' : 'Missing'}
          detail={delegate.email || 'No email saved'}
        />

        <StatCard
          label="Client"
          value={client?.company || 'Not set'}
          detail="Linked company"
        />
      </div>

      <div className={`${panelClass} mb-4`}>
        <div className={`${panelHeaderClass} flex flex-col md:flex-row md:items-center md:justify-between gap-3`}>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Delegate details
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Learner contact details and linked client.
            </p>
          </div>

          {editing && (
            <div className="flex flex-wrap gap-2">
              <button
                className={buttonSecondary}
                onClick={cancelEditing}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className={buttonPrimary}
                onClick={saveDelegate}
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
                <p className="text-xs text-slate-500">Full name</p>
                <p className="font-medium text-slate-950 mt-1">
                  {delegate.full_name}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Client</p>

                {client ? (
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="font-medium text-slate-950 mt-1 inline-block hover:underline"
                  >
                    {client.company}
                  </Link>
                ) : (
                  <p className="font-medium text-slate-950 mt-1">
                    Not set
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-medium text-slate-950 mt-1 break-all">
                  {delegate.email || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Phone</p>
                <p className="font-medium text-slate-950 mt-1">
                  {delegate.phone || 'Not set'}
                </p>
              </div>

              <div className="md:col-span-2 xl:col-span-4">
                <p className="text-xs text-slate-500">Notes</p>
                <p className="font-medium text-slate-950 mt-1 whitespace-pre-line">
                  {delegate.notes || 'No notes'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                className={`${inputClass} md:col-span-2`}
                value={editClientId}
                onChange={(e) => setEditClientId(e.target.value)}
              >
                <option value="">Select client / company</option>

                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company} - {client.name}
                  </option>
                ))}
              </select>

              <input
                className={inputClass}
                placeholder="Full name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
              />

              <input
                className={inputClass}
                placeholder="Email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />

              <input
                className={inputClass}
                placeholder="Phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />

              <textarea
                className={`${inputClass} min-h-20`}
                placeholder="Notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className={`${panelClass} mb-4`}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Attach to booking
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Add this delegate to another booking for the same client.
          </p>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className={`${inputClass} md:col-span-2`}
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
              className={buttonPrimary}
              onClick={attachToBooking}
              disabled={attaching}
            >
              {attaching ? 'Attaching...' : 'Attach'}
            </button>
          </div>

          {availableBookings.length === 0 && (
            <p className="text-xs text-slate-500 mt-3">
              No available bookings to attach for this client.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className={panelClass}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Booking history
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Sessions this delegate has been linked to.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {linkedBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-4"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="text-sm font-semibold text-slate-950 hover:underline"
                    >
                      {booking.course_name}
                    </Link>

                    <p className="text-xs text-slate-500 mt-1">
                      {booking.date}
                      {booking.start_time ? ` · ${booking.start_time}` : ''}
                    </p>

                    <p className="text-xs text-slate-600 mt-1">
                      {booking.location || 'No location set'}
                    </p>
                  </div>

                  <span className={`border px-2.5 py-1 rounded-md text-xs font-medium w-fit ${getBookingStatusStyle(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <Link
                    href={`/dashboard/bookings/${booking.id}`}
                    className={buttonSecondary}
                  >
                    View booking
                  </Link>

                  <button
                    className={buttonDanger}
                    onClick={() => removeFromBooking(booking.id)}
                  >
                    Remove link
                  </button>
                </div>
              </div>
            ))}

            {linkedBookings.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                No bookings linked to this delegate yet.
              </div>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Certificates
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Certificates issued to this delegate.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="p-4"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {certificate.course_name}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Certificate No: {certificate.certificate_number}
                    </p>

                    <p className="text-xs text-slate-600 mt-1">
                      Issued: {certificate.issue_date}
                    </p>

                    <p className="text-xs text-slate-600 mt-1">
                      Expires: {certificate.expiry_date}
                    </p>
                  </div>

                  <span className={`border px-2.5 py-1 rounded-md text-xs font-medium w-fit ${getCertificateStatusStyle(certificate.status)}`}>
                    {certificate.status}
                  </span>
                </div>
              </div>
            ))}

            {certificates.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                No certificates linked to this delegate yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}