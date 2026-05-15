'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function CalendarPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [courseTemplates, setCourseTemplates] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

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

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

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

    setClients(clientsData || [])
    setTrainers(trainersData || [])
    setCourseTemplates(courseTemplatesData || [])
    setBookings(bookingsData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const formatDate = (year: number, month: number, day: number) => {
    const monthValue = String(month + 1).padStart(2, '0')
    const dayValue = String(day).padStart(2, '0')

    return `${year}-${monthValue}-${dayValue}`
  }

  const getBookingsForDate = (dateValue: string) => {
    return bookings.filter((booking) => booking.date === dateValue)
  }

  const openCreateForm = (dateValue: string) => {
    setSelectedDate(dateValue)
    setDate(dateValue)
    setShowCreateForm(true)
  }

  const closeCreateForm = () => {
    setShowCreateForm(false)
    setSelectedDate('')
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
  }

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

  const createBooking = async () => {
    if (!clientId || !courseName || !date) {
      alert('Client, course and date are required')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const selectedClient = clients.find((client) => client.id === clientId)

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

    closeCreateForm()
    load()
  }

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
      return
    }

    setCurrentMonth(currentMonth - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
      return
    }

    setCurrentMonth(currentMonth + 1)
  }

  const monthName = new Date(currentYear, currentMonth).toLocaleString(
    'default',
    {
      month: 'long',
    }
  )

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

  const calendarDays = []

  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  const upcomingBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.date)
    const todayDate = new Date()

    todayDate.setHours(0, 0, 0, 0)
    bookingDate.setHours(0, 0, 0, 0)

    return bookingDate >= todayDate && booking.status !== 'cancelled'
  })

  const getStatusStyle = (status: string) => {
    if (status === 'completed') return 'bg-green-100 text-green-700'
    if (status === 'cancelled') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading calendar...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Calendar
        </h1>

        <p className="text-gray-500 mt-1">
          View bookings by date and create new training sessions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Total Bookings</p>
          <h2 className="text-3xl font-bold mt-2">{bookings.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Upcoming</p>
          <h2 className="text-3xl font-bold mt-2">{upcomingBookings.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Current Month</p>
          <h2 className="text-3xl font-bold mt-2">
            {monthName}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <button
              className="border px-4 py-2 rounded-lg"
              onClick={previousMonth}
            >
              ← Previous
            </button>

            <h2 className="text-2xl font-semibold">
              {monthName} {currentYear}
            </h2>

            <button
              className="border px-4 py-2 rounded-lg"
              onClick={nextMonth}
            >
              Next →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-500 mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-28 bg-gray-50 rounded-xl"
                  />
                )
              }

              const dateValue = formatDate(currentYear, currentMonth, day)
              const dayBookings = getBookingsForDate(dateValue)
              const isToday = dateValue === formatDate(
                today.getFullYear(),
                today.getMonth(),
                today.getDate()
              )

              return (
                <div
                  key={dateValue}
                  className={`min-h-28 border rounded-xl p-2 bg-white ${
                    isToday ? 'border-black' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      className={`w-7 h-7 rounded-full text-sm ${
                        isToday
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => openCreateForm(dateValue)}
                    >
                      {day}
                    </button>

                    <button
                      className="text-xs text-gray-400 hover:text-black"
                      onClick={() => openCreateForm(dateValue)}
                    >
                      +
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    {dayBookings.slice(0, 3).map((booking) => (
                      <Link
                        key={booking.id}
                        href={`/dashboard/bookings/${booking.id}`}
                        className="bg-gray-100 hover:bg-gray-200 rounded-lg p-2 text-left block"
                      >
                        <p className="text-xs font-semibold truncate">
                          {booking.course_name}
                        </p>

                        <p className="text-xs text-gray-500 truncate">
                          {booking.client_name}
                        </p>
                      </Link>
                    ))}

                    {dayBookings.length > 3 && (
                      <p className="text-xs text-gray-400">
                        +{dayBookings.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">
            {showCreateForm ? 'Create Booking' : 'Upcoming Bookings'}
          </h2>

          {!showCreateForm ? (
            <div className="flex flex-col gap-4">
              {upcomingBookings.slice(0, 10).map((booking) => (
                <Link
                  key={booking.id}
                  href={`/dashboard/bookings/${booking.id}`}
                  className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition block"
                >
                  <p className="font-semibold">
                    {booking.course_name}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {booking.client_name}
                  </p>

                  <p className="text-sm text-gray-600 mt-2">
                    {booking.date}
                    {booking.start_time ? ` at ${booking.start_time}` : ''}
                  </p>

                  <div className={`mt-3 px-3 py-1 rounded-full text-xs w-fit ${getStatusStyle(booking.status)}`}>
                    {booking.status}
                  </div>
                </Link>
              ))}

              {upcomingBookings.length === 0 && (
                <p className="text-gray-500">
                  No upcoming bookings.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="bg-gray-50 border rounded-xl p-3 text-sm text-gray-600">
                Creating booking for:
                <span className="font-semibold text-gray-900 ml-1">
                  {selectedDate}
                </span>
              </div>

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

              <button
                className="bg-black text-white p-3 rounded-lg"
                onClick={createBooking}
              >
                Create Booking
              </button>

              <button
                className="border p-3 rounded-lg"
                onClick={closeCreateForm}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}