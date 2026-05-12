'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')

  const [clientId, setClientId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [courseName, setCourseName] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: trainersData } = await supabase
      .from('trainers')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('date', { ascending: true })

    setClients(clientsData || [])
    setTrainers(trainersData || [])
    setBookings(bookingsData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const addBooking = async () => {
    if (!clientId || !courseName || !date) {
      alert('Client, course and date are required')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const selectedClient = clients.find((c) => c.id === clientId)

    await supabase.from('bookings').insert({
      user_id: userData.user?.id,
      organisation_id: organisationId,
      client_id: clientId,
      trainer_id: trainerId || null,
      client_name: selectedClient?.name,
      course_name: courseName,
      date,
      start_time: startTime || null,
      end_time: endTime || null,
      location,
      price: price ? Number(price) : null,
      notes,
      status: 'scheduled',
    })

    setClientId('')
    setTrainerId('')
    setCourseName('')
    setDate('')
    setStartTime('')
    setEndTime('')
    setLocation('')
    setPrice('')
    setNotes('')

    load()
  }

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: string
  ) => {
    await supabase
      .from('bookings')
      .update({
        status: newStatus,
      })
      .eq('id', bookingId)

    load()
  }

const deleteBooking = async (bookingId: string) => {
  const confirmDelete = confirm(
    'Are you sure you want to delete this booking? This cannot be undone.'
  )

  if (!confirmDelete) return

  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId)

  if (error) {
    alert(`Could not delete booking: ${error.message}`)
    console.error(error)
    return
  }

  load()
} 

  const scheduledBookings = bookings.filter(
    (booking) => booking.status === 'scheduled'
  )

  const completedBookings = bookings.filter(
    (booking) => booking.status === 'completed'
  )

  const cancelledBookings = bookings.filter(
    (booking) => booking.status === 'cancelled'
  )

  const estimatedValue = bookings.reduce(
    (sum, booking) => sum + Number(booking.price || 0),
    0
  )

  const getStatusStyle = (status: string) => {
    if (status === 'completed') {
      return 'bg-green-100 text-green-700'
    }

    if (status === 'cancelled') {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-blue-100 text-blue-700'
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Bookings
        </h1>

        <p className="text-gray-500 mt-1">
          Schedule, manage and complete training sessions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Total Bookings</p>
          <h2 className="text-3xl font-bold mt-2">
            {bookings.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Scheduled</p>
          <h2 className="text-3xl font-bold mt-2">
            {scheduledBookings.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Completed</p>
          <h2 className="text-3xl font-bold mt-2">
            {completedBookings.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Estimated Value</p>
          <h2 className="text-3xl font-bold mt-2">
            £{estimatedValue.toFixed(2)}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create booking form */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Create Booking
          </h2>

          <div className="flex flex-col gap-3">
            <select
              className="border p-3 rounded-lg"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select Client</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company} - {client.name}
                </option>
              ))}
            </select>

            <select
              className="border p-3 rounded-lg"
              value={trainerId}
              onChange={(e) => setTrainerId(e.target.value)}
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
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                className="border p-3 rounded-lg"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />

              <input
                className="border p-3 rounded-lg"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <input
              className="border p-3 rounded-lg"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <textarea
              className="border p-3 rounded-lg"
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button
              className="bg-black text-white p-3 rounded-lg"
              onClick={addBooking}
            >
              Create Booking
            </button>
          </div>
        </div>

        {/* Booking list */}
        <div className="lg:col-span-2 grid gap-4">
          {bookings.map((booking) => {
            const trainer = trainers.find(
              (t) => t.id === booking.trainer_id
            )

            return (
              <div
                key={booking.id}
                className="bg-white border rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {booking.course_name}
                    </h2>

                    <p className="text-gray-500 mt-1">
                      {booking.client_name}
                    </p>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                      booking.status
                    )}`}
                  >
                    {booking.status}
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600 space-y-1">
                  <p>Date: {booking.date}</p>
                  <p>
                    Time: {booking.start_time || 'Not set'} -{' '}
                    {booking.end_time || 'Not set'}
                  </p>
                  <p>
                    Location: {booking.location || 'Not set'}
                  </p>
                  <p>
                    Trainer: {trainer?.name || 'Unassigned'}
                  </p>
                  <p>
                    Price: £{Number(booking.price || 0).toFixed(2)}
                  </p>

                  {booking.notes && (
                    <p>Notes: {booking.notes}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 mt-5">
                  {booking.status !== 'scheduled' && (
                    <button
                      className="border px-4 py-2 rounded-lg"
                      onClick={() =>
                        updateBookingStatus(
                          booking.id,
                          'scheduled'
                        )
                      }
                    >
                      Mark Scheduled
                    </button>
                  )}

                  {booking.status !== 'completed' && (
                    <button
                      className="border px-4 py-2 rounded-lg"
                      onClick={() =>
                        updateBookingStatus(
                          booking.id,
                          'completed'
                        )
                      }
                    >
                      Mark Completed
                    </button>
                  )}

                  {booking.status !== 'cancelled' && (
                    <button
                      className="border px-4 py-2 rounded-lg"
                      onClick={() =>
                        updateBookingStatus(
                          booking.id,
                          'cancelled'
                        )
                      }
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
                    onClick={() => deleteBooking(booking.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}

          {bookings.length === 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
              No bookings yet. Create your first training session.
            </div>
          )}

          {cancelledBookings.length > 0 && (
            <div className="text-sm text-gray-500">
              Cancelled bookings: {cancelledBookings.length}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}