'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate, formatAppTime, formatAppTimeRange } from '@/lib/formatters'
import { parseOptionalNonNegativeNumber } from '@/lib/numberValidation'
import { getCourseDurationDays } from '@/lib/bookingDates'
import {
  bookingOccursOnDate,
  bookingOverlapsDateRange,
  createDefaultBookingSessions,
  getBookingLegacyDateFieldsFromSessions,
  getBookingSessionForDate,
  getBookingSessionDateSummary,
  getBookingSessionPayload,
  normalizeBookingSessions,
  type BookingSession,
} from '@/lib/bookingSessions'
import { getComputedBookingStatus } from '@/lib/bookingStatus'
import { fetchPaginatedImportRecords } from '@/lib/importCsv'
import { getDefaultBookingContactFromClient } from '@/lib/bookingEmailRecipients'
import ClientPicker from '../bookings/ClientPicker'
import CourseSessionsEditor from '../bookings/CourseSessionsEditor'

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
  const [courseSessions, setCourseSessions] = useState<BookingSession[]>([])
  const [location, setLocation] = useState('')
  const [autoFilledLocation, setAutoFilledLocation] = useState('')
  const [bookingContactName, setBookingContactName] = useState('')
  const [bookingContactEmail, setBookingContactEmail] = useState('')
  const [bookingContactPhone, setBookingContactPhone] = useState('')
  const [autoFilledBookingContact, setAutoFilledBookingContact] = useState(false)
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

    const clientsData = await fetchPaginatedImportRecords<any>(
      async (from, to) =>
        await supabase
          .from('clients')
          .select('*')
          .eq('organisation_id', profile.organisation_id)
          .order('company', { ascending: true })
          .range(from, to)
    )

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

    const monthStart = formatDate(currentYear, currentMonth, 1)
    const monthEndDate = new Date(currentYear, currentMonth + 1, 0)
    const monthEnd = formatDate(
      currentYear,
      currentMonth,
      monthEndDate.getDate()
    )

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*, booking_sessions(*)')
      .eq('organisation_id', profile.organisation_id)
      .lte('date', monthEnd)
      .or(`end_date.gte.${monthStart},end_date.is.null`)
      .order('date', { ascending: true })
      .limit(500)

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
  }, [currentMonth, currentYear])

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
      return bookingOccursOnDate(booking, dateValue)
    })
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

  const syncCourseSessions = (sessions: BookingSession[]) => {
    const selectedCourse = courseTemplates.find((course) => course.id === courseTemplateId)
    const durationDays = getCourseDurationDays(selectedCourse)
    const shouldGenerateTemplateSessions =
      sessions.length === 1 &&
      Boolean(sessions[0]?.session_date) &&
      !date &&
      durationDays > 1
    const normalizedSessions = normalizeBookingSessions({
      booking_sessions:
        shouldGenerateTemplateSessions
          ? createDefaultBookingSessions(
              sessions[0].session_date || '',
              durationDays,
              sessions[0].start_time || startTime,
              sessions[0].end_time || endTime
            )
          : sessions.length > 0
          ? sessions
          : createDefaultBookingSessions(date, 1, startTime, endTime),
    })

    setCourseSessions(normalizedSessions)

    const legacyFields = getBookingLegacyDateFieldsFromSessions(normalizedSessions)
    setDate(legacyFields.date)
    setEndDate(legacyFields.end_date)
    setStartTime(legacyFields.start_time || '')
    setEndTime(legacyFields.end_time || '')
  }

  const setClientAndMaybeLocation = (selectedClientId: string) => {
    const previousAutoFill = autoFilledLocation

    if (!selectedClientId) {
      setClientId('')

      if (previousAutoFill && location === previousAutoFill) {
        setLocation('')
      }

      if (autoFilledBookingContact) {
        setBookingContactName('')
        setBookingContactEmail('')
        setBookingContactPhone('')
        setAutoFilledBookingContact(false)
      }

      setAutoFilledLocation('')
      return
    }

    setClientId(selectedClientId)

    const selectedClient = clients.find((client) => client.id === selectedClientId)
    const selectedAddress = selectedClient?.address || ''

    if (
      selectedAddress &&
      (courseDeliveryType === 'private' || courseDeliveryType === 'public') &&
      (!location.trim() || (previousAutoFill && location === previousAutoFill))
    ) {
      setLocation(selectedAddress)
      setAutoFilledLocation(selectedAddress)
    }

    const contactDefaults = getDefaultBookingContactFromClient(selectedClient)

    if (
      courseDeliveryType === 'private' &&
      (autoFilledBookingContact ||
        (!bookingContactName.trim() &&
          !bookingContactEmail.trim() &&
          !bookingContactPhone.trim()))
    ) {
      setBookingContactName(contactDefaults.name)
      setBookingContactEmail(contactDefaults.email)
      setBookingContactPhone(contactDefaults.phone)
      setAutoFilledBookingContact(true)
    }
  }

  const updateDateWithTemplateDuration = (nextDate: string) => {
    const selectedCourse = courseTemplates.find((course) => course.id === courseTemplateId)
    const durationDays = getCourseDurationDays(selectedCourse)
    const nextSessions = createDefaultBookingSessions(
      nextDate,
      durationDays,
      startTime,
      endTime
    )

    syncCourseSessions(nextSessions)
  }

  const openCreateForm = (dateValue: string) => {
    setSelectedDate(dateValue)
    setDate(dateValue)
    setEndDate(dateValue)
    setCourseSessions(createDefaultBookingSessions(dateValue, 1, startTime, endTime))
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
    setCourseSessions([])
    setLocation('')
    setAutoFilledLocation('')
    setBookingContactName('')
    setBookingContactEmail('')
    setBookingContactPhone('')
    setAutoFilledBookingContact(false)
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
    const templateStartTime = selectedCourse.default_start_time
      ? String(selectedCourse.default_start_time).slice(0, 5)
      : startTime
    const templateEndTime = selectedCourse.default_end_time
      ? String(selectedCourse.default_end_time).slice(0, 5)
      : endTime

    if (date) {
      syncCourseSessions(
        createDefaultBookingSessions(
          date,
          durationDays,
          templateStartTime,
          templateEndTime
        )
      )
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
    const normalizedSessions = normalizeBookingSessions({
      booking_sessions: courseSessions,
    })
    const legacyFields = getBookingLegacyDateFieldsFromSessions(normalizedSessions)

    if (courseDeliveryType === 'private' && !clientId) {
      alert('Private bookings require a client')
      return
    }

    if (!courseName || !legacyFields.date || normalizedSessions.length === 0) {
      alert('Course and at least one course day are required')
      return
    }

    if (normalizedSessions.some((session) => !session.session_date)) {
      alert('Each course day needs a date')
      return
    }

    const parsedPrice = parseOptionalNonNegativeNumber(price, 'Price')

    if (parsedPrice.error) {
      alert(parsedPrice.error)
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const selectedClient = clients.find((client) => client.id === clientId)

    const { data: bookingData, error } = await supabase.from('bookings').insert({
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
      date: legacyFields.date,
      end_date: legacyFields.end_date || legacyFields.date,
      start_time: legacyFields.start_time,
      end_time: legacyFields.end_time,
      location,
      booking_contact_name:
        courseDeliveryType === 'private' ? bookingContactName.trim() || null : null,
      booking_contact_email:
        courseDeliveryType === 'private' ? bookingContactEmail.trim() || null : null,
      booking_contact_phone:
        courseDeliveryType === 'private' ? bookingContactPhone.trim() || null : null,
      price: parsedPrice.value,
      notes,
      status: 'scheduled',
    }).select('id').single()

    if (error) {
      alert(error.message)
      return
    }

    const { error: sessionError } = await supabase.from('booking_sessions').insert(
      getBookingSessionPayload(bookingData.id, organisationId, normalizedSessions)
    )

    if (sessionError) {
      await supabase.from('bookings').delete().eq('id', bookingData.id)
      alert(`Booking was not created because course days could not be saved: ${sessionError.message}`)
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
                      const session = getBookingSessionForDate(booking, dateValue)
                      const sessionStartTime = session?.start_time || booking.start_time

                      return (
                        <Link
                          key={booking.id}
                          href={`/dashboard/bookings/${booking.id}`}
                          className={`border border-transparent border-l-4 rounded-md px-2 py-1.5 text-left block transition ${getBookingAccent(
                            booking
                          )}`}
                        >
                          <p className="text-[11px] font-semibold truncate text-slate-950">
                            {sessionStartTime ? `${getFormattedTime(sessionStartTime)} · ` : ''}
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
                            <p className="text-slate-400">Course days</p>

                            <p className="font-medium text-slate-800 mt-1">
                              {getBookingSessionDateSummary(booking, getFormattedDate)}
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
                      setClientAndMaybeLocation('')
                    } else if (clientId) {
                      const selectedClient = clients.find((client) => client.id === clientId)
                      const contactDefaults =
                        getDefaultBookingContactFromClient(selectedClient)

                      setBookingContactName(contactDefaults.name)
                      setBookingContactEmail(contactDefaults.email)
                      setBookingContactPhone(contactDefaults.phone)
                      setAutoFilledBookingContact(true)
                    }
                  }}
                >
                  <option value="private">Private course</option>
                  <option value="public">Public course</option>
                </select>

                <ClientPicker
                  clients={clients}
                  value={clientId}
                  onChange={setClientAndMaybeLocation}
                  inputClass={inputClass}
                  placeholder={
                    courseDeliveryType === 'public'
                      ? 'Search optional main client...'
                      : 'Search clients...'
                  }
                />

                {courseDeliveryType === 'private' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold text-slate-950">
                      Booking contact
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Booking confirmations and joining instructions for private courses are sent to this contact.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3">
                      <input
                        className={inputClass}
                        placeholder="Booking contact name"
                        value={bookingContactName}
                        onChange={(e) => {
                          setBookingContactName(e.target.value)
                          setAutoFilledBookingContact(false)
                        }}
                      />

                      <input
                        className={inputClass}
                        placeholder="Booking contact email"
                        value={bookingContactEmail}
                        onChange={(e) => {
                          setBookingContactEmail(e.target.value)
                          setAutoFilledBookingContact(false)
                        }}
                      />

                      <input
                        className={inputClass}
                        placeholder="Booking contact phone optional"
                        value={bookingContactPhone}
                        onChange={(e) => {
                          setBookingContactPhone(e.target.value)
                          setAutoFilledBookingContact(false)
                        }}
                      />
                    </div>
                  </div>
                )}

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

                <CourseSessionsEditor
                  sessions={
                    courseSessions.length > 0
                      ? courseSessions
                      : createDefaultBookingSessions(date, 1, startTime, endTime)
                  }
                  onChange={syncCourseSessions}
                  inputClass={inputClass}
                />

                <input
                  className={inputClass}
                  placeholder="Location"
                  list="calendar-location-suggestions"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value)

                    if (autoFilledLocation && e.target.value !== autoFilledLocation) {
                      setAutoFilledLocation('')
                    }
                  }}
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
