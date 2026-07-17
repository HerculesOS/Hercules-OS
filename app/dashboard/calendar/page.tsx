'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate, formatAppTime, formatAppTimeRange } from '@/lib/formatters'
import { parseOptionalNonNegativeNumber } from '@/lib/numberValidation'
import { getCourseDurationDays, getDefaultEndDateForDuration } from '@/lib/bookingDates'
import { getComputedBookingStatus } from '@/lib/bookingStatus'

export default function CalendarPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [courseTemplates, setCourseTemplates] = useState<any[]>([])
  const [certificateTemplates, setCertificateTemplates] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [courseDeliveryType, setCourseDeliveryType] = useState('private')
  const [clientId, setClientId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [courseTemplateId, setCourseTemplateId] = useState('')
  const [certificateTemplateId, setCertificateTemplateId] = useState('')
  const [courseName, setCourseName] = useState('')
  const [date, setDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const panelClass =
    'bg-white border border-slate-200 rounded-lg'

  const panelHeaderClass =
    'px-4 py-3 border-b border-slate-200'

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

    const { data: certificateTemplatesData } = await supabase
      .from('certificate_templates')
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
    setCertificateTemplates(certificateTemplatesData || [])
    setBookings(bookingsData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const getFormattedDate = (dateValue: string | null | undefined) => {
    return formatAppDate(dateValue, organisation)
  }

  const getFormattedTime = (timeValue: string | null | undefined) => {
    return formatAppTime(timeValue, organisation)
  }

  const getFormattedTimeRange = (
    startTimeValue: string | null | undefined,
    endTimeValue: string | null | undefined
  ) => {
    return formatAppTimeRange(startTimeValue, endTimeValue, organisation)
  }

  const formatDate = (year: number, month: number, day: number) => {
    const monthValue = String(month + 1).padStart(2, '0')
    const dayValue = String(day).padStart(2, '0')

    return `${year}-${monthValue}-${dayValue}`
  }

  const todayString = formatDate(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  const getBookingsForDate = (dateValue: string) => {
    return bookings.filter((booking) => {
      const bookingStart = booking.date
      const bookingEnd = booking.end_date || booking.date

      return bookingStart <= dateValue && bookingEnd >= dateValue
    })
  }

  const bookingOverlapsDateRange = (
    booking: any,
    rangeStart: string,
    rangeEnd: string
  ) => {
    const bookingStart = booking.date
    const bookingEnd = booking.end_date || booking.date

    if (!bookingStart) return false

    return bookingStart <= rangeEnd && bookingEnd >= rangeStart
  }

  const getClientForBooking = (booking: any) => {
    if (!booking?.client_id) return null

    return clients.find((client) => client.id === booking.client_id)
  }

  const getBookingDeliveryType = (booking: any) => {
    return booking?.course_delivery_type || 'private'
  }

  const getClientDisplayName = (booking: any) => {
    const client = getClientForBooking(booking)

    if (client?.company) return client.company

    if (getBookingDeliveryType(booking) === 'public') {
      return 'Public course'
    }

    return booking.client_name || 'No client'
  }

  const getLocationSuggestions = () => {
    return Array.from(
      new Set(
        bookings
          .map((booking) => String(booking.location || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
  }

  const setClientAndMaybeLocation = (selectedClientId: string) => {
    setClientId(selectedClientId)

    const selectedClient = clients.find((client) => client.id === selectedClientId)

    if (courseDeliveryType === 'private' && !location.trim() && selectedClient?.address) {
      setLocation(selectedClient.address)
    }
  }

  const updateDateWithTemplateDuration = (nextDate: string) => {
    setDate(nextDate)

    const selectedCourse = courseTemplates.find((course) => course.id === courseTemplateId)
    const durationDays = getCourseDurationDays(selectedCourse)

    if (durationDays > 1) {
      setEndDate(getDefaultEndDateForDuration(nextDate, durationDays))
    } else if (!endDate || endDate === date) {
      setEndDate(nextDate)
    }
  }

  const openCreateForm = (dateValue: string) => {
    setSelectedDate(dateValue)
    setDate(dateValue)
    setEndDate(dateValue)
    setShowCreateForm(true)
  }

  const closeCreateForm = () => {
    setShowCreateForm(false)
    setSelectedDate('')
    setCourseDeliveryType('private')
    setClientId('')
    setTrainerId('')
    setCourseTemplateId('')
    setCertificateTemplateId('')
    setCourseName('')
    setDate('')
    setEndDate('')
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

    if (selectedCourse.default_start_time) {
      setStartTime(String(selectedCourse.default_start_time).slice(0, 5))
    }

    if (selectedCourse.default_end_time) {
      setEndTime(String(selectedCourse.default_end_time).slice(0, 5))
    }

    const durationDays = getCourseDurationDays(selectedCourse)

    if (date) {
      setEndDate(getDefaultEndDateForDuration(date, durationDays))
    }

    if (selectedCourse.notes && !notes) {
      setNotes(selectedCourse.notes)
    }

    const matchingCertificateTemplate = certificateTemplates.find(
      (template) => template.course_template_id === templateId
    )

    if (matchingCertificateTemplate && !certificateTemplateId) {
      setCertificateTemplateId(matchingCertificateTemplate.id)
    }
  }

  const createBooking = async () => {
    if (courseDeliveryType === 'private' && !clientId) {
      alert('Private bookings require a client')
      return
    }

    if (!courseName || !date) {
      alert('Course and date are required')
      return
    }

    if (endDate && endDate < date) {
      alert('End date must be on or after the start date')
      return
    }

    const parsedPrice = parseOptionalNonNegativeNumber(price, 'Price')

    if (parsedPrice.error) {
      alert(parsedPrice.error)
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const selectedClient = clients.find((client) => client.id === clientId)

    const { error } = await supabase.from('bookings').insert({
      user_id: userData.user?.id,
      organisation_id: organisationId,
      course_delivery_type: courseDeliveryType,
      client_id: clientId || null,
      trainer_id: trainerId || null,
      certificate_template_id: certificateTemplateId || null,
      client_name:
        courseDeliveryType === 'public' && !selectedClient
          ? 'Public course'
          : selectedClient?.name || null,
      course_name: courseName,
      date,
      end_date: endDate || date,
      start_time: startTime || null,
      end_time: endTime || null,
      location,
      price: parsedPrice.value,
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

  const goToToday = () => {
    setCurrentMonth(today.getMonth())
    setCurrentYear(today.getFullYear())
    setSelectedDate(todayString)
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
    const bookingEnd = booking.end_date || booking.date
    const displayStatus = getComputedBookingStatus(booking)

    return bookingEnd >= todayString && displayStatus !== 'cancelled' && displayStatus !== 'completed'
  })

  const completedBookings = bookings.filter(
    (booking) => getComputedBookingStatus(booking) === 'completed'
  )

  const cancelledBookings = bookings.filter(
    (booking) => getComputedBookingStatus(booking) === 'cancelled'
  )

  const publicBookings = bookings.filter(
    (booking) => getBookingDeliveryType(booking) === 'public'
  )

  const currentMonthBookings = bookings.filter((booking) => {
    const monthStart = formatDate(currentYear, currentMonth, 1)
    const monthEnd = formatDate(currentYear, currentMonth, daysInMonth)

    return bookingOverlapsDateRange(booking, monthStart, monthEnd)
  })

  const selectedDateBookings = selectedDate
    ? getBookingsForDate(selectedDate)
    : []

  const busiestDay = Array.from({ length: daysInMonth }, (_, index) => {
    const dateValue = formatDate(currentYear, currentMonth, index + 1)

    return {
      date: dateValue,
      count: getBookingsForDate(dateValue).length,
    }
  }).sort((a, b) => b.count - a.count)[0]

  const getStatusStyle = (status: string) => {
    if (status === 'completed') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    }

    if (status === 'cancelled') {
      return 'bg-red-50 text-red-700 border-red-100'
    }

    return 'bg-blue-50 text-blue-700 border-blue-100'
  }

  const getDeliveryTypeStyle = (type: string) => {
    if (type === 'public') {
      return 'bg-purple-50 text-purple-700 border-purple-100'
    }

    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  const getBookingAccent = (booking: any) => {
    const deliveryType = getBookingDeliveryType(booking)
    const displayStatus = getComputedBookingStatus(booking)

    if (displayStatus === 'completed') {
      return 'border-l-emerald-500 bg-emerald-50 hover:bg-emerald-100'
    }

    if (displayStatus === 'cancelled') {
      return 'border-l-red-500 bg-red-50 hover:bg-red-100'
    }

    if (deliveryType === 'public') {
      return 'border-l-purple-500 bg-purple-50 hover:bg-purple-100'
    }

    return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100'
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
          Loading calendar...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-950">
        <div className="px-5 py-4 lg:px-6 flex justify-end">
          <div className="flex flex-wrap gap-2">
            <button
              className="border border-slate-200 bg-white text-slate-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 hover:text-slate-950"
              onClick={goToToday}
            >
              Today
            </button>

            <button
              className="bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800"
              onClick={() => openCreateForm(todayString)}
            >
              New booking
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 border-t border-slate-100">
          <div className="p-4 border-b md:border-b-0 md:border-r border-slate-100">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              This month
            </p>

            <p className="text-2xl font-semibold mt-1">
              {monthName}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              {currentYear}
            </p>
          </div>

          <div className="p-4 border-b md:border-b-0 md:border-r border-slate-100">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Month bookings
            </p>

            <p className="text-2xl font-semibold mt-1">
              {currentMonthBookings.length}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Scheduled in view
            </p>
          </div>

          <div className="p-4 border-b md:border-b-0 md:border-r border-slate-100">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Upcoming
            </p>

            <p className="text-2xl font-semibold mt-1">
              {upcomingBookings.length}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Future active bookings
            </p>
          </div>

          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Busiest day
            </p>

            <p className="text-2xl font-semibold mt-1">
              {busiestDay?.count > 0
                ? getFormattedDate(busiestDay.date)
                : 'None'}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              {busiestDay?.count || 0} booking{busiestDay?.count === 1 ? '' : 's'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total bookings"
          value={bookings.length}
          detail="All calendar records"
        />

        <StatCard
          label="Upcoming"
          value={upcomingBookings.length}
          detail="Future active sessions"
        />

        <StatCard
          label="Public courses"
          value={publicBookings.length}
          detail="Open course records"
        />

        <StatCard
          label="Completed"
          value={completedBookings.length}
          detail="Finished sessions"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-8 ${panelClass} overflow-hidden`}>
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                {monthName} {currentYear}
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Click a date number or plus button to create a booking.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className={buttonSecondary}
                onClick={previousMonth}
              >
                ← Previous
              </button>

              <button
                className={buttonSecondary}
                onClick={goToToday}
              >
                Today
              </button>

              <button
                className={buttonSecondary}
                onClick={nextMonth}
              >
                Next →
              </button>
            </div>
          </div>

          <div className="bg-slate-50 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100">
            <div className="py-3 border-r border-slate-100">Sun</div>
            <div className="py-3 border-r border-slate-100">Mon</div>
            <div className="py-3 border-r border-slate-100">Tue</div>
            <div className="py-3 border-r border-slate-100">Wed</div>
            <div className="py-3 border-r border-slate-100">Thu</div>
            <div className="py-3 border-r border-slate-100">Fri</div>
            <div className="py-3">Sat</div>
          </div>

          <div className="grid grid-cols-7 bg-slate-200 gap-px">
            {calendarDays.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-32 bg-slate-50"
                  />
                )
              }

              const dateValue = formatDate(currentYear, currentMonth, day)
              const dayBookings = getBookingsForDate(dateValue)
              const isToday = dateValue === todayString
              const isSelected = dateValue === selectedDate

              return (
                <div
                  key={dateValue}
                  className={`min-h-32 bg-white p-2 transition ${
                    isSelected ? 'ring-2 ring-inset ring-slate-950' : ''
                  } ${isToday ? 'bg-slate-50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <button
                      className={`w-8 h-8 rounded-md text-sm font-semibold transition ${
                        isToday
                          ? 'bg-slate-950 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      onClick={() => openCreateForm(dateValue)}
                    >
                      {day}
                    </button>

                    <button
                      className="w-7 h-7 rounded-md border border-slate-200 text-slate-500 text-sm hover:bg-slate-950 hover:text-white hover:border-slate-950 transition"
                      onClick={() => openCreateForm(dateValue)}
                    >
                      +
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    {dayBookings.slice(0, 3).map((booking) => {
                      const deliveryType = getBookingDeliveryType(booking)

                      return (
                        <Link
                          key={booking.id}
                          href={`/dashboard/bookings/${booking.id}`}
                          className={`border border-transparent border-l-4 rounded-md px-2 py-1.5 text-left block transition ${getBookingAccent(
                            booking
                          )}`}
                        >
                          <p className="text-[11px] font-semibold truncate text-slate-950">
                            {booking.start_time ? `${getFormattedTime(booking.start_time)} · ` : ''}
                            {booking.course_name}
                          </p>

                          <p className="text-[11px] text-slate-600 truncate">
                            {getClientDisplayName(booking)}
                          </p>

                          {deliveryType === 'public' && (
                            <p className="text-[10px] font-medium text-purple-700 mt-0.5">
                              Public
                            </p>
                          )}
                        </Link>
                      )
                    })}

                    {dayBookings.length > 3 && (
                      <button
                        className="text-[11px] text-slate-500 hover:text-slate-950 text-left"
                        onClick={() => {
                          setSelectedDate(dateValue)
                          setShowCreateForm(false)
                        }}
                      >
                        +{dayBookings.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="xl:col-span-4 grid gap-4 h-fit">
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                {showCreateForm ? 'Create booking' : selectedDate ? 'Selected date' : 'Upcoming bookings'}
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                {showCreateForm
                  ? 'Add a private booking or public open course directly from the calendar.'
                  : selectedDate
                    ? 'Bookings for the selected day.'
                    : 'Your next scheduled sessions.'}
              </p>
            </div>

            {!showCreateForm ? (
              <div className="p-4">
                {selectedDate && (
                  <div className="bg-slate-50 text-slate-950 border border-slate-200 rounded-lg p-4 mb-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Selected date
                    </p>

                    <p className="text-lg font-semibold mt-1">
                      {getFormattedDate(selectedDate)}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        className="bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800"
                        onClick={() => openCreateForm(selectedDate)}
                      >
                        Add booking
                      </button>

                      <button
                        className="border border-slate-200 bg-white px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                        onClick={() => setSelectedDate('')}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {(selectedDate ? selectedDateBookings : upcomingBookings.slice(0, 10)).map((booking) => {
                    const deliveryType = getBookingDeliveryType(booking)
                    const displayStatus = getComputedBookingStatus(booking)

                    return (
                      <Link
                        key={booking.id}
                        href={`/dashboard/bookings/${booking.id}`}
                        className="border border-slate-200 bg-white rounded-lg p-4 hover:bg-slate-50 transition block"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {booking.course_name}
                            </p>

                            <p className="text-xs text-slate-500 mt-1">
                              {getClientDisplayName(booking)}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getDeliveryTypeStyle(deliveryType)}`}>
                              {deliveryType === 'public' ? 'Public' : 'Private'}
                            </span>

                            <span className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getStatusStyle(displayStatus)}`}>
                              {displayStatus}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-slate-600">
                          <div>
                            <p className="text-slate-400">Date</p>

                            <p className="font-medium text-slate-800 mt-1">
                              {getFormattedDate(booking.date)}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">Time</p>

                            <p className="font-medium text-slate-800 mt-1">
                              {getFormattedTimeRange(booking.start_time, booking.end_time)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}

                  {(selectedDate ? selectedDateBookings : upcomingBookings).length === 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-500">
                      {selectedDate
                        ? 'No bookings for this date.'
                        : 'No upcoming bookings.'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-3">
                <div className="bg-slate-50 text-slate-950 border border-slate-200 rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Creating booking for
                  </p>

                  <p className="text-lg font-semibold mt-1">
                    {selectedDate ? getFormattedDate(selectedDate) : date}
                  </p>
                </div>

                <select
                  className={inputClass}
                  value={courseDeliveryType}
                  onChange={(e) => {
                    const selectedType = e.target.value

                    setCourseDeliveryType(selectedType)

                    if (selectedType === 'public') {
                      setClientId('')
                    }
                  }}
                >
                  <option value="private">Private course</option>
                  <option value="public">Public course</option>
                </select>

                <select
                  className={inputClass}
                  value={clientId}
                  onChange={(e) => setClientAndMaybeLocation(e.target.value)}
                >
                  <option value="">
                    {courseDeliveryType === 'public'
                      ? 'Optional main client'
                      : 'Select client'}
                  </option>

                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company} - {client.name}
                    </option>
                  ))}
                </select>

                <select
                  className={inputClass}
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                >
                  <option value="">Assign trainer</option>

                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </option>
                  ))}
                </select>

                <select
                  className={inputClass}
                  value={courseTemplateId}
                  onChange={(e) => applyCourseTemplate(e.target.value)}
                >
                  <option value="">Select course template</option>

                  {courseTemplates.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code ? `${course.code} - ` : ''}
                      {course.name}
                    </option>
                  ))}
                </select>

                <select
                  className={inputClass}
                  value={certificateTemplateId}
                  onChange={(e) => setCertificateTemplateId(e.target.value)}
                >
                  <option value="">Use automatic certificate template</option>

                  {certificateTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>

                <input
                  className={inputClass}
                  placeholder="Course name"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />

                <input
                  className={inputClass}
                  type="date"
                  value={date}
                  onChange={(e) => updateDateWithTemplateDuration(e.target.value)}
                />

                <input
                  className={inputClass}
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    className={inputClass}
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />

                  <input
                    className={inputClass}
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>

                <input
                  className={inputClass}
                  placeholder="Location"
                  list="calendar-location-suggestions"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />

                <datalist id="calendar-location-suggestions">
                  {getLocationSuggestions().map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>

                <input
                  className={inputClass}
                  placeholder="Price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />

                <textarea
                  className={`${inputClass} min-h-24`}
                  placeholder="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />

                {courseDeliveryType === 'public' && (
                  <div className="bg-purple-50 border border-purple-100 rounded-md p-3 text-xs text-purple-700">
                    Public courses can have delegates from multiple clients. The main client can be left blank.
                  </div>
                )}

                {courseTemplateId && (
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
                    Course template applied. If a matching certificate template exists, it has been selected automatically.
                  </div>
                )}

                <button
                  className={buttonPrimary}
                  onClick={createBooking}
                >
                  Create booking
                </button>

                <button
                  className={buttonSecondary}
                  onClick={closeCreateForm}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="bg-white text-slate-950 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-semibold">
              Calendar key
            </p>

            <div className="grid gap-3 mt-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-blue-500" />
                Private scheduled booking
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-purple-500" />
                Public open course
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                Completed booking
              </div>

              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-red-500" />
                Cancelled booking
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
