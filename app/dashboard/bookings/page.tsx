'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [courseTemplates, setCourseTemplates] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')

  const [clientId, setClientId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [courseTemplateId, setCourseTemplateId] = useState('')
  const [courseName, setCourseName] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  const [recipientEmails, setRecipientEmails] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState('')
  const [remindingId, setRemindingId] = useState('')

  const [editingId, setEditingId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [editClientId, setEditClientId] = useState('')
  const [editTrainerId, setEditTrainerId] = useState('')
  const [editCourseTemplateId, setEditCourseTemplateId] = useState('')
  const [editCourseName, setEditCourseName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trainerFilter, setTrainerFilter] = useState('all')
  const [dateSort, setDateSort] = useState('ascending')

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

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('date', { ascending: true })

    setOrganisation(organisationData || null)
    setClients(clientsData || [])
    setTrainers(trainersData || [])
    setCourseTemplates(courseTemplatesData || [])
    setBookings(bookingsData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const applyCourseTemplate = (templateId: string) => {
    setCourseTemplateId(templateId)

    const selectedCourse = courseTemplates.find(
      (course) => course.id === templateId
    )

    if (!selectedCourse) return

    setCourseName(selectedCourse.name || '')

    if (selectedCourse.default_price) {
      setPrice(String(selectedCourse.default_price))
    }

    if (selectedCourse.notes && !notes) {
      setNotes(selectedCourse.notes)
    }
  }

  const applyEditCourseTemplate = (templateId: string) => {
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

  const addBooking = async () => {
    if (!clientId || !courseName || !date) {
      alert('Client, course and date are required')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const selectedClient = clients.find((c) => c.id === clientId)

    const { error } = await supabase.from('bookings').insert({
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

    if (error) {
      alert(error.message)
      return
    }

    setClientId('')
    setTrainerId('')
    setCourseTemplateId('')
    setCourseName('')
    setDate('')
    setStartTime('')
    setEndTime('')
    setLocation('')
    setPrice('')
    setNotes('')

    load()
  }

  const startEditing = (booking: any) => {
    setEditingId(booking.id)
    setEditClientId(booking.client_id || '')
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

  const cancelEditing = () => {
    setEditingId('')
    setEditClientId('')
    setEditTrainerId('')
    setEditCourseTemplateId('')
    setEditCourseName('')
    setEditDate('')
    setEditStartTime('')
    setEditEndTime('')
    setEditLocation('')
    setEditPrice('')
    setEditNotes('')
  }

  const saveBookingEdit = async (bookingId: string) => {
    if (!editClientId || !editCourseName || !editDate) {
      alert('Client, course and date are required')
      return
    }

    setSavingEdit(true)

    const selectedClient = clients.find((c) => c.id === editClientId)

    const { error } = await supabase
      .from('bookings')
      .update({
        client_id: editClientId,
        trainer_id: editTrainerId || null,
        client_name: selectedClient?.name,
        course_name: editCourseName,
        date: editDate,
        start_time: editStartTime || null,
        end_time: editEndTime || null,
        location: editLocation,
        price: editPrice ? Number(editPrice) : null,
        notes: editNotes,
      })
      .eq('id', bookingId)

    setSavingEdit(false)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    load()
  }

  const updateBookingStatus = async (
    bookingId: string,
    newStatus: string
  ) => {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: newStatus,
      })
      .eq('id', bookingId)

    if (error) {
      alert(error.message)
      return
    }

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
      return
    }

    load()
  }

  const getClientForBooking = (booking: any) => {
    return clients.find((client) => client.id === booking.client_id)
  }

  const getTrainerForBooking = (booking: any) => {
    return trainers.find((trainer) => trainer.id === booking.trainer_id)
  }

  const getRecipientEmailForBooking = (booking: any) => {
    const client = getClientForBooking(booking)
    return recipientEmails[booking.id] || client?.email || ''
  }

  const sendBookingConfirmation = async (booking: any) => {
    const trainer = getTrainerForBooking(booking)
    const recipientEmail = getRecipientEmailForBooking(booking)

    if (!recipientEmail) {
      alert('Enter a recipient email first')
      return
    }

    setSendingId(booking.id)

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
        organisationId,
      }),
    })

    const result = await response.json()

    setSendingId('')

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Email failed')
      return
    }

    alert('Booking confirmation sent')

    setRecipientEmails((previous) => ({
      ...previous,
      [booking.id]: '',
    }))
  }

  const sendBookingReminder = async (booking: any) => {
    const trainer = getTrainerForBooking(booking)
    const recipientEmail = getRecipientEmailForBooking(booking)

    if (!recipientEmail) {
      alert('Enter a recipient email first')
      return
    }

    setRemindingId(booking.id)

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
        organisationId,
      }),
    })

    const result = await response.json()

    setRemindingId('')

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Reminder email failed')
      return
    }

    alert('Booking reminder sent')

    setRecipientEmails((previous) => ({
      ...previous,
      [booking.id]: '',
    }))
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTrainerFilter('all')
    setDateSort('ascending')
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

  const filteredBookings = bookings
    .filter((booking) => {
      const trainer = getTrainerForBooking(booking)
      const client = getClientForBooking(booking)

      const searchableText = `
        ${booking.client_name || ''}
        ${client?.company || ''}
        ${client?.name || ''}
        ${client?.email || ''}
        ${booking.course_name || ''}
        ${booking.location || ''}
        ${booking.notes || ''}
        ${booking.date || ''}
        ${trainer?.name || ''}
        ${booking.status || ''}
      `.toLowerCase()

      const matchesSearch = searchableText.includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || booking.status === statusFilter

      const matchesTrainer =
        trainerFilter === 'all' || booking.trainer_id === trainerFilter

      return matchesSearch && matchesStatus && matchesTrainer
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()

      if (dateSort === 'descending') {
        return dateB - dateA
      }

      return dateA - dateB
    })

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
          Schedule, edit, filter, confirm and remind clients about training sessions
        </p>
      </div>

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

      <div className="bg-white border rounded-2xl p-5 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="border p-3 rounded-lg md:col-span-2"
            placeholder="Search by company, contact, course, date, trainer, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border p-3 rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            className="border p-3 rounded-lg"
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
          >
            <option value="all">All Trainers</option>

            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.name}
              </option>
            ))}
          </select>

          <select
            className="border p-3 rounded-lg"
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value)}
          >
            <option value="ascending">Oldest First</option>
            <option value="descending">Newest First</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {filteredBookings.length} of {bookings.length} bookings
          </p>

          <button
            className="border px-4 py-2 rounded-lg text-sm"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

            <select
              className="border p-3 rounded-lg"
              value={courseTemplateId}
              onChange={(e) => applyCourseTemplate(e.target.value)}
            >
              <option value="">Select Course Template</option>

              {courseTemplates.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code ? `${course.code} - ` : ''}
                  {course.name}
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

            {courseTemplateId && (
              <div className="bg-gray-50 border rounded-xl p-3 text-sm text-gray-600">
                Course template applied. You can still edit the course name, price or notes before saving.
              </div>
            )}

            <button
              className="bg-black text-white p-3 rounded-lg"
              onClick={addBooking}
            >
              Create Booking
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 grid gap-4">
          {filteredBookings.map((booking) => {
            const trainer = getTrainerForBooking(booking)
            const client = getClientForBooking(booking)
            const savedClientEmail = client?.email || ''
            const isEditing = editingId === booking.id

            return (
              <div
                key={booking.id}
                className="bg-white border rounded-2xl p-5 shadow-sm"
              >
                {!isEditing ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {booking.course_name}
                        </h2>

                        <p className="text-gray-500 mt-1">
                          {client?.company || booking.client_name}
                        </p>

                        {client?.name && (
                          <p className="text-sm text-gray-400 mt-1">
                            Primary contact: {client.name}
                          </p>
                        )}
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

                      {savedClientEmail && (
                        <p>Client Email: {savedClientEmail}</p>
                      )}

                      {booking.notes && (
                        <p>Notes: {booking.notes}</p>
                      )}
                    </div>

                    <div className="mt-5 flex flex-col gap-3">
                      <input
                        className="border p-3 rounded-lg"
                        placeholder={savedClientEmail || 'Recipient email'}
                        value={recipientEmails[booking.id] || ''}
                        onChange={(e) =>
                          setRecipientEmails((previous) => ({
                            ...previous,
                            [booking.id]: e.target.value,
                          }))
                        }
                      />

                      {savedClientEmail && (
                        <p className="text-sm text-gray-500">
                          Leave blank to send to saved client email.
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/dashboard/bookings/${booking.id}`}
                          className="bg-black text-white px-4 py-2 rounded-lg"
                        >
                          View Booking
                        </Link>

                        <button
                          className="border px-4 py-2 rounded-lg disabled:bg-gray-100"
                          onClick={() => sendBookingConfirmation(booking)}
                          disabled={sendingId === booking.id}
                        >
                          {sendingId === booking.id
                            ? 'Sending...'
                            : 'Send Confirmation'}
                        </button>

                        <button
                          className="border px-4 py-2 rounded-lg disabled:bg-gray-100"
                          onClick={() => sendBookingReminder(booking)}
                          disabled={remindingId === booking.id}
                        >
                          {remindingId === booking.id
                            ? 'Sending...'
                            : 'Send Reminder'}
                        </button>

                        <button
                          className="border px-4 py-2 rounded-lg"
                          onClick={() => startEditing(booking)}
                        >
                          Edit
                        </button>

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
                  </>
                ) : (
                  <>
                    <div className="mb-5">
                      <h2 className="text-xl font-semibold">
                        Edit Booking
                      </h2>

                      <p className="text-gray-500 mt-1">
                        Update training session details
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        className="border p-3 rounded-lg"
                        value={editClientId}
                        onChange={(e) => setEditClientId(e.target.value)}
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

                      <select
                        className="border p-3 rounded-lg md:col-span-2"
                        value={editCourseTemplateId}
                        onChange={(e) => applyEditCourseTemplate(e.target.value)}
                      >
                        <option value="">Apply Course Template</option>

                        {courseTemplates.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.code ? `${course.code} - ` : ''}
                            {course.name}
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

                    <div className="flex flex-wrap gap-3 mt-5">
                      <button
                        className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                        onClick={() => saveBookingEdit(booking.id)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>

                      <button
                        className="border px-4 py-2 rounded-lg"
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

          {filteredBookings.length === 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
              No bookings match your filters.
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