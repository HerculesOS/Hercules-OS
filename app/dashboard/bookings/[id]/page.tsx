'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [booking, setBooking] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [trainers, setTrainers] = useState<any[]>([])
  const [courseTemplates, setCourseTemplates] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendingConfirmation, setSendingConfirmation] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)

  const [editTrainerId, setEditTrainerId] = useState('')
  const [editCourseTemplateId, setEditCourseTemplateId] = useState('')
  const [editCourseName, setEditCourseName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [recipientEmail, setRecipientEmail] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()
    const bookingId = params.id as string

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single()

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('organisation_id', profile.organisation_id)
      .single()

    if (bookingError) {
      console.error(bookingError)
      setLoading(false)
      return
    }

    let clientData = null

    if (bookingData?.client_id) {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', bookingData.client_id)
        .eq('organisation_id', profile.organisation_id)
        .single()

      clientData = data
    }

    const { data: trainersData } = await supabase
      .from('trainers')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('name', { ascending: true })

    const { data: courseTemplatesData } = await supabase
      .from('course_templates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('name', { ascending: true })

    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

    const { data: certificatesData } = await supabase
      .from('certificates')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

    setOrganisation(organisationData || null)
    setBooking(bookingData)
    setClient(clientData)
    setTrainers(trainersData || [])
    setCourseTemplates(courseTemplatesData || [])
    setInvoices(invoicesData || [])
    setCertificates(certificatesData || [])

    setEditTrainerId(bookingData.trainer_id || '')
    setEditCourseTemplateId('')
    setEditCourseName(bookingData.course_name || '')
    setEditDate(bookingData.date || '')
    setEditStartTime(bookingData.start_time || '')
    setEditEndTime(bookingData.end_time || '')
    setEditLocation(bookingData.location || '')
    setEditPrice(bookingData.price ? String(bookingData.price) : '')
    setEditNotes(bookingData.notes || '')
    setRecipientEmail(clientData?.email || '')

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const getTrainer = () => {
    return trainers.find((trainer) => trainer.id === booking?.trainer_id)
  }

  const applyCourseTemplate = (templateId: string) => {
    setEditCourseTemplateId(templateId)

    const selectedCourse = courseTemplates.find(
      (course) => course.id === templateId
    )

    if (!selectedCourse) return

    setEditCourseName(selectedCourse.name || '')

    if (selectedCourse.default_price) {
      setEditPrice(String(selectedCourse.default_price))
    }

    if (selectedCourse.notes && !editNotes) {
      setEditNotes(selectedCourse.notes)
    }
  }

  const startEditing = () => {
    setEditTrainerId(booking.trainer_id || '')
    setEditCourseTemplateId('')
    setEditCourseName(booking.course_name || '')
    setEditDate(booking.date || '')
    setEditStartTime(booking.start_time || '')
    setEditEndTime(booking.end_time || '')
    setEditLocation(booking.location || '')
    setEditPrice(booking.price ? String(booking.price) : '')
    setEditNotes(booking.notes || '')
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
    setEditTrainerId(booking.trainer_id || '')
    setEditCourseTemplateId('')
    setEditCourseName(booking.course_name || '')
    setEditDate(booking.date || '')
    setEditStartTime(booking.start_time || '')
    setEditEndTime(booking.end_time || '')
    setEditLocation(booking.location || '')
    setEditPrice(booking.price ? String(booking.price) : '')
    setEditNotes(booking.notes || '')
  }

  const saveBooking = async () => {
    if (!editCourseName || !editDate) {
      alert('Course name and date are required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('bookings')
      .update({
        trainer_id: editTrainerId || null,
        course_name: editCourseName,
        date: editDate,
        start_time: editStartTime || null,
        end_time: editEndTime || null,
        location: editLocation,
        price: editPrice ? Number(editPrice) : null,
        notes: editNotes,
      })
      .eq('id', booking.id)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setEditing(false)
    load()
  }

  const updateStatus = async (status: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', booking.id)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const deleteBooking = async () => {
    const confirmDelete = confirm(
      'Are you sure you want to delete this booking? This cannot be undone.'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', booking.id)

    if (error) {
      alert(error.message)
      return
    }

    router.push('/dashboard/bookings')
  }

  const sendBookingConfirmation = async () => {
    if (!recipientEmail) {
      alert('Enter a recipient email first')
      return
    }

    const trainer = getTrainer()

    setSendingConfirmation(true)

    const response = await fetch('/api/send-booking-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
        clientName: booking.client_name,
        courseName: booking.course_name,
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        location: booking.location,
        trainerName: trainer?.name || '',
        businessName: organisation?.name || 'Hercules OS',
        businessEmail: organisation?.email || '',
        businessPhone: organisation?.phone || '',
      }),
    })

    const result = await response.json()

    setSendingConfirmation(false)

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Email failed')
      return
    }

    alert('Booking confirmation sent')
  }

  const sendBookingReminder = async () => {
    if (!recipientEmail) {
      alert('Enter a recipient email first')
      return
    }

    const trainer = getTrainer()

    setSendingReminder(true)

    const response = await fetch('/api/send-booking-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
        clientName: booking.client_name,
        courseName: booking.course_name,
        date: booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        location: booking.location,
        trainerName: trainer?.name || '',
        businessName: organisation?.name || 'Hercules OS',
        businessEmail: organisation?.email || '',
        businessPhone: organisation?.phone || '',
      }),
    })

    const result = await response.json()

    setSendingReminder(false)

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Reminder email failed')
      return
    }

    alert('Booking reminder sent')
  }

  const getStatusStyle = (status: string) => {
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
        Loading booking...
      </div>
    )
  }

  if (!booking) {
    return (
      <div>
        <Link
          href="/dashboard/bookings"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to bookings
        </Link>

        <div className="bg-white border rounded-2xl p-6 shadow-sm mt-6">
          Booking not found.
        </div>
      </div>
    )
  }

  const trainer = getTrainer()

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/bookings"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to bookings
        </Link>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">
              {booking.course_name}
            </h1>

            <p className="text-gray-500 mt-2">
              {client?.company || booking.client_name} · {booking.date}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {!editing && (
              <button
                className="bg-black text-white px-4 py-2 rounded-lg"
                onClick={startEditing}
              >
                Edit Booking
              </button>
            )}

            <div className={`px-4 py-2 rounded-full text-sm w-fit ${getStatusStyle(booking.status)}`}>
              {booking.status}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <h2 className="text-2xl font-semibold">
              Booking Details
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
                  onClick={saveBooking}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
              <div>
                <p className="text-gray-500">Client</p>

                {client ? (
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="font-medium mt-1 inline-block hover:underline"
                  >
                    {client.company || booking.client_name}
                  </Link>
                ) : (
                  <p className="font-medium mt-1">{booking.client_name}</p>
                )}
              </div>

              <div>
                <p className="text-gray-500">Primary contact</p>
                <p className="font-medium mt-1">{client?.name || 'Not set'}</p>
              </div>

              <div>
                <p className="text-gray-500">Course</p>
                <p className="font-medium mt-1">{booking.course_name}</p>
              </div>

              <div>
                <p className="text-gray-500">Trainer</p>
                <p className="font-medium mt-1">{trainer?.name || 'Unassigned'}</p>
              </div>

              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium mt-1">{booking.date}</p>
              </div>

              <div>
                <p className="text-gray-500">Time</p>
                <p className="font-medium mt-1">
                  {booking.start_time || 'Not set'} - {booking.end_time || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium mt-1">{booking.location || 'Not set'}</p>
              </div>

              <div>
                <p className="text-gray-500">Price</p>
                <p className="font-medium mt-1">
                  £{Number(booking.price || 0).toFixed(2)}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-gray-500">Notes</p>
                <p className="font-medium mt-1 whitespace-pre-line">
                  {booking.notes || 'No notes'}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  className="border p-3 rounded-lg md:col-span-2"
                  value={editCourseTemplateId}
                  onChange={(e) => applyCourseTemplate(e.target.value)}
                >
                  <option value="">Apply Course Template</option>

                  {courseTemplates.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ? `${course.code} - ` : ''}
                      {course.name}
                    </option>
                  ))}
                </select>

                <select
                  className="border p-3 rounded-lg"
                  value={editTrainerId}
                  onChange={(e) => setEditTrainerId(e.target.value)}
                >
                  <option value="">Assign Trainer</option>

                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </option>
                  ))}
                </select>

                <input
                  className="border p-3 rounded-lg"
                  placeholder="Course name"
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                />

                <input
                  className="border p-3 rounded-lg"
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />

                <input
                  className="border p-3 rounded-lg"
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                />

                <input
                  className="border p-3 rounded-lg"
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                />

                <input
                  className="border p-3 rounded-lg"
                  placeholder="Location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                />

                <input
                  className="border p-3 rounded-lg"
                  placeholder="Price"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />

                <textarea
                  className="border p-3 rounded-lg md:col-span-2"
                  placeholder="Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>

              {editCourseTemplateId && (
                <div className="bg-gray-50 border rounded-xl p-3 text-sm text-gray-600 mt-4">
                  Course template applied. You can still edit the course name, price or notes before saving.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">
            Actions
          </h2>

          <div className="flex flex-col gap-3">
            <input
              className="border p-3 rounded-lg"
              placeholder="Recipient email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />

            <button
              className="border px-4 py-2 rounded-lg disabled:bg-gray-100"
              onClick={sendBookingConfirmation}
              disabled={sendingConfirmation}
            >
              {sendingConfirmation ? 'Sending...' : 'Send Confirmation'}
            </button>

            <button
              className="border px-4 py-2 rounded-lg disabled:bg-gray-100"
              onClick={sendBookingReminder}
              disabled={sendingReminder}
            >
              {sendingReminder ? 'Sending...' : 'Send Reminder'}
            </button>

            {booking.status !== 'scheduled' && (
              <button
                className="border px-4 py-2 rounded-lg"
                onClick={() => updateStatus('scheduled')}
              >
                Mark Scheduled
              </button>
            )}

            {booking.status !== 'completed' && (
              <button
                className="border px-4 py-2 rounded-lg"
                onClick={() => updateStatus('completed')}
              >
                Mark Completed
              </button>
            )}

            {booking.status !== 'cancelled' && (
              <button
                className="border px-4 py-2 rounded-lg"
                onClick={() => updateStatus('cancelled')}
              >
                Cancel Booking
              </button>
            )}

            <button
              className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
              onClick={deleteBooking}
            >
              Delete Booking
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">
              Invoices
            </h2>

            <Link
              href="/dashboard/invoices"
              className="text-sm text-gray-500 hover:text-black"
            >
              Manage invoices
            </Link>
          </div>

          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-gray-50 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {invoice.invoice_number || 'Invoice'}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      Due: {invoice.due_date || 'Not set'}
                    </p>
                  </div>

                  <p className="font-semibold">
                    £{Number(invoice.total_amount || invoice.amount || 0).toFixed(2)}
                  </p>
                </div>

                <div className={`mt-3 px-3 py-1 rounded-full text-xs w-fit ${getInvoiceStatusStyle(invoice.status)}`}>
                  {invoice.status}
                </div>
              </div>
            ))}

            {invoices.length === 0 && (
              <p className="text-gray-500">
                No invoices linked to this booking yet.
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
              Manage certificates
            </Link>
          </div>

          <div className="grid gap-4">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="bg-gray-50 rounded-xl p-4"
              >
                <p className="font-semibold">
                  {certificate.learner_name}
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  {certificate.certificate_number}
                </p>

                <p className="text-sm text-gray-600 mt-2">
                  Expires: {certificate.expiry_date}
                </p>

                <div className={`mt-3 px-3 py-1 rounded-full text-xs w-fit ${getCertificateStatusStyle(certificate.status)}`}>
                  {certificate.status}
                </div>
              </div>
            ))}

            {certificates.length === 0 && (
              <p className="text-gray-500">
                No certificates linked to this booking yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}