'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate, formatAppTimeRange } from '@/lib/formatters'

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [courseTemplates, setCourseTemplates] = useState<any[]>([])
  const [certificateTemplates, setCertificateTemplates] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')

  const [courseDeliveryType, setCourseDeliveryType] = useState('private')
  const [clientId, setClientId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [courseTemplateId, setCourseTemplateId] = useState('')
  const [certificateTemplateId, setCertificateTemplateId] = useState('')
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

  const [editCourseDeliveryType, setEditCourseDeliveryType] = useState('private')
  const [editClientId, setEditClientId] = useState('')
  const [editTrainerId, setEditTrainerId] = useState('')
  const [editCourseTemplateId, setEditCourseTemplateId] = useState('')
  const [editCertificateTemplateId, setEditCertificateTemplateId] = useState('')
  const [editCourseName, setEditCourseName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [search, setSearch] = useState('')
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trainerFilter, setTrainerFilter] = useState('all')
  const [dateSort, setDateSort] = useState('ascending')

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

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
      .order('is_default', { ascending: false })
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
  }

  useEffect(() => {
    load()
  }, [])

  const getFormattedDate = (dateValue: string | null | undefined) => {
    return formatAppDate(dateValue, organisation)
  }

  const getFormattedTimeRange = (
    startTimeValue: string | null | undefined,
    endTimeValue: string | null | undefined
  ) => {
    return formatAppTimeRange(startTimeValue, endTimeValue, organisation)
  }

  const getCertificateTemplateLabel = (template: any) => {
    const linkedCourse = courseTemplates.find(
      (course) => course.id === template.course_template_id
    )

    const parts = [
      template.name,
      template.is_default ? 'Default' : '',
      linkedCourse ? linkedCourse.name : 'Any course',
    ].filter(Boolean)

    return parts.join(' · ')
  }

  const findMatchingCertificateTemplateForCourse = (courseTemplateIdValue: string) => {
    if (!courseTemplateIdValue) return null

    return certificateTemplates.find(
      (template) => template.course_template_id === courseTemplateIdValue
    )
  }

  const getCertificateTemplateForBooking = (booking: any) => {
    if (!booking?.certificate_template_id) return null

    return certificateTemplates.find(
      (template) => template.id === booking.certificate_template_id
    )
  }

  const getClientForBooking = (booking: any) => {
    if (!booking?.client_id) return null

    return clients.find((client) => client.id === booking.client_id)
  }

  const getBookingClientDisplay = (booking: any) => {
    const client = getClientForBooking(booking)

    if (client?.company) return client.company

    if (booking.course_delivery_type === 'public') return 'Public course'

    return booking.client_name || 'No client'
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

    const matchingCertificateTemplate =
      findMatchingCertificateTemplateForCourse(templateId)

    if (matchingCertificateTemplate && !certificateTemplateId) {
      setCertificateTemplateId(matchingCertificateTemplate.id)
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

    const matchingCertificateTemplate =
      findMatchingCertificateTemplateForCourse(templateId)

    if (matchingCertificateTemplate && !editCertificateTemplateId) {
      setEditCertificateTemplateId(matchingCertificateTemplate.id)
    }
  }

  const addBooking = async () => {
    if (courseDeliveryType === 'private' && !clientId) {
      alert('Private bookings require a client')
      return
    }

    if (!courseName || !date) {
      alert('Course and date are required')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const selectedClient = clients.find((c) => c.id === clientId)

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

    setCourseDeliveryType('private')
    setClientId('')
    setTrainerId('')
    setCourseTemplateId('')
    setCertificateTemplateId('')
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
    setEditCourseDeliveryType(booking.course_delivery_type || 'private')
    setEditClientId(booking.client_id || '')
    setEditTrainerId(booking.trainer_id || '')
    setEditCourseTemplateId('')
    setEditCertificateTemplateId(booking.certificate_template_id || '')
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
    setEditCourseDeliveryType('private')
    setEditClientId('')
    setEditTrainerId('')
    setEditCourseTemplateId('')
    setEditCertificateTemplateId('')
    setEditCourseName('')
    setEditDate('')
    setEditStartTime('')
    setEditEndTime('')
    setEditLocation('')
    setEditPrice('')
    setEditNotes('')
  }

  const saveBookingEdit = async (bookingId: string) => {
    if (editCourseDeliveryType === 'private' && !editClientId) {
      alert('Private bookings require a client')
      return
    }

    if (!editCourseName || !editDate) {
      alert('Course and date are required')
      return
    }

    setSavingEdit(true)

    const selectedClient = clients.find((c) => c.id === editClientId)

    const { error } = await supabase
      .from('bookings')
      .update({
        course_delivery_type: editCourseDeliveryType,
        client_id: editClientId || null,
        trainer_id: editTrainerId || null,
        certificate_template_id: editCertificateTemplateId || null,
        client_name:
          editCourseDeliveryType === 'public' && !selectedClient
            ? 'Public course'
            : selectedClient?.name || null,
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
        clientName: booking.client_name || getBookingClientDisplay(booking),
        courseName: booking.course_name,
        date: getFormattedDate(booking.date),
        startTime: getFormattedTimeRange(booking.start_time, null),
        endTime: booking.end_time ? getFormattedTimeRange(booking.end_time, null) : '',
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
        clientName: booking.client_name || getBookingClientDisplay(booking),
        courseName: booking.course_name,
        date: getFormattedDate(booking.date),
        startTime: getFormattedTimeRange(booking.start_time, null),
        endTime: booking.end_time ? getFormattedTimeRange(booking.end_time, null) : '',
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
    setDeliveryTypeFilter('all')
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

  const publicBookings = bookings.filter(
    (booking) => booking.course_delivery_type === 'public'
  )

  const privateBookings = bookings.filter(
    (booking) => (booking.course_delivery_type || 'private') === 'private'
  )

  const estimatedValue = bookings.reduce(
    (sum, booking) => sum + Number(booking.price || 0),
    0
  )

  const filteredBookings = bookings
    .filter((booking) => {
      const trainer = getTrainerForBooking(booking)
      const client = getClientForBooking(booking)
      const certificateTemplate = getCertificateTemplateForBooking(booking)
      const bookingDeliveryType = booking.course_delivery_type || 'private'

      const searchableText = `
        ${booking.client_name || ''}
        ${client?.company || ''}
        ${client?.name || ''}
        ${client?.email || ''}
        ${bookingDeliveryType}
        ${booking.course_name || ''}
        ${booking.location || ''}
        ${booking.notes || ''}
        ${booking.date || ''}
        ${getFormattedDate(booking.date)}
        ${getFormattedTimeRange(booking.start_time, booking.end_time)}
        ${trainer?.name || ''}
        ${certificateTemplate?.name || ''}
        ${booking.status || ''}
      `.toLowerCase()

      const matchesSearch = searchableText.includes(search.toLowerCase())

      const matchesDeliveryType =
        deliveryTypeFilter === 'all' || bookingDeliveryType === deliveryTypeFilter

      const matchesStatus =
        statusFilter === 'all' || booking.status === statusFilter

      const matchesTrainer =
        trainerFilter === 'all' || booking.trainer_id === trainerFilter

      return matchesSearch && matchesDeliveryType && matchesStatus && matchesTrainer
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

  return (
    <div>
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bookings
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
            Training bookings
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Schedule private client sessions or public open courses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <StatCard
          label="Total bookings"
          value={bookings.length}
          detail="All bookings recorded"
        />

        <StatCard
          label="Private"
          value={privateBookings.length}
          detail="Client-specific courses"
        />

        <StatCard
          label="Public"
          value={publicBookings.length}
          detail="Open courses"
        />

        <StatCard
          label="Scheduled"
          value={scheduledBookings.length}
          detail="Upcoming or planned"
        />

        <StatCard
          label="Estimated value"
          value={`£${estimatedValue.toFixed(2)}`}
          detail="Booking revenue"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg mb-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-950">
            Filters
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Search and sort bookings by client, course, delivery type, trainer, certificate template or status.
          </p>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input
              className={`${inputClass} md:col-span-2`}
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className={inputClass}
              value={deliveryTypeFilter}
              onChange={(e) => setDeliveryTypeFilter(e.target.value)}
            >
              <option value="all">All courses</option>
              <option value="private">Private only</option>
              <option value="public">Public only</option>
            </select>

            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              className={inputClass}
              value={trainerFilter}
              onChange={(e) => setTrainerFilter(e.target.value)}
            >
              <option value="all">All trainers</option>

              {trainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name}
                </option>
              ))}
            </select>

            <select
              className={inputClass}
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value)}
            >
              <option value="ascending">Oldest first</option>
              <option value="descending">Newest first</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
            <p className="text-xs text-slate-500">
              Showing {filteredBookings.length} of {bookings.length} bookings · {privateBookings.length} private · {publicBookings.length} public
            </p>

            <button
              className={buttonSecondary}
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-lg h-fit">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-950">
              Create booking
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Choose whether this is a private client course or a public open course.
            </p>
          </div>

          <div className="p-4 flex flex-col gap-3">
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
              onChange={(e) => setClientId(e.target.value)}
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
                  {getCertificateTemplateLabel(template)}
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
              onChange={(e) => setDate(e.target.value)}
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
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

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
              onClick={addBooking}
            >
              Create booking
            </button>
          </div>
        </div>

        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Booking list
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Manage existing bookings and client communication.
              </p>
            </div>

            {cancelledBookings.length > 0 && (
              <p className="text-xs text-slate-500">
                Cancelled: {cancelledBookings.length}
              </p>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {filteredBookings.map((booking) => {
              const trainer = getTrainerForBooking(booking)
              const client = getClientForBooking(booking)
              const savedClientEmail = client?.email || ''
              const isEditing = editingId === booking.id
              const certificateTemplate = getCertificateTemplateForBooking(booking)
              const bookingDeliveryType = booking.course_delivery_type || 'private'

              return (
                <div
                  key={booking.id}
                  className="p-4"
                >
                  {!isEditing ? (
                    <>
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-950">
                              {booking.course_name}
                            </h3>

                            <span
                              className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getStatusStyle(
                                booking.status
                              )}`}
                            >
                              {booking.status}
                            </span>

                            <span
                              className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getDeliveryTypeStyle(
                                bookingDeliveryType
                              )}`}
                            >
                              {bookingDeliveryType === 'public'
                                ? 'Public'
                                : 'Private'}
                            </span>
                          </div>

                          <p className="text-sm text-slate-600 mt-1">
                            {getBookingClientDisplay(booking)}
                          </p>

                          {client?.name && (
                            <p className="text-xs text-slate-500 mt-1">
                              Primary contact: {client.name}
                            </p>
                          )}

                          <p className="text-xs text-slate-500 mt-1">
                            Certificate template:{' '}
                            <span className="font-medium text-slate-700">
                              {certificateTemplate?.name || 'Automatic'}
                            </span>
                          </p>
                        </div>

                        <Link
                          href={`/dashboard/bookings/${booking.id}`}
                          className={buttonPrimary}
                        >
                          View booking
                        </Link>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4 text-xs text-slate-600">
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

                        <div>
                          <p className="text-slate-400">Trainer</p>
                          <p className="font-medium text-slate-800 mt-1">
                            {trainer?.name || 'Unassigned'}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-400">Price</p>
                          <p className="font-medium text-slate-800 mt-1">
                            £{Number(booking.price || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {(booking.location || booking.notes) && (
                        <div className="mt-3 text-xs text-slate-600">
                          {booking.location && (
                            <p>
                              <span className="text-slate-400">Location:</span> {booking.location}
                            </p>
                          )}

                          {booking.notes && (
                            <p className="mt-1">
                              <span className="text-slate-400">Notes:</span> {booking.notes}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <input
                          className={`${inputClass} w-full`}
                          placeholder={
                            savedClientEmail ||
                            (bookingDeliveryType === 'public'
                              ? 'Recipient email for public course'
                              : 'Recipient email')
                          }
                          value={recipientEmails[booking.id] || ''}
                          onChange={(e) =>
                            setRecipientEmails((previous) => ({
                              ...previous,
                              [booking.id]: e.target.value,
                            }))
                          }
                        />

                        {savedClientEmail && (
                          <p className="text-xs text-slate-500 mt-2">
                            Leave blank to send to saved client email: {savedClientEmail}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3">
                          <button
                            className={buttonSecondary}
                            onClick={() => sendBookingConfirmation(booking)}
                            disabled={sendingId === booking.id}
                          >
                            {sendingId === booking.id
                              ? 'Sending...'
                              : 'Send confirmation'}
                          </button>

                          <button
                            className={buttonSecondary}
                            onClick={() => sendBookingReminder(booking)}
                            disabled={remindingId === booking.id}
                          >
                            {remindingId === booking.id
                              ? 'Sending...'
                              : 'Send reminder'}
                          </button>

                          <button
                            className={buttonSecondary}
                            onClick={() => startEditing(booking)}
                          >
                            Edit
                          </button>

                          {booking.status !== 'scheduled' && (
                            <button
                              className={buttonSecondary}
                              onClick={() =>
                                updateBookingStatus(
                                  booking.id,
                                  'scheduled'
                                )
                              }
                            >
                              Mark scheduled
                            </button>
                          )}

                          {booking.status !== 'completed' && (
                            <button
                              className={buttonSecondary}
                              onClick={() =>
                                updateBookingStatus(
                                  booking.id,
                                  'completed'
                                )
                              }
                            >
                              Mark completed
                            </button>
                          )}

                          {booking.status !== 'cancelled' && (
                            <button
                              className={buttonSecondary}
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
                            className="border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-50"
                            onClick={() => deleteBooking(booking.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-950">
                          Edit booking
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          Update session type, client, details and certificate template.
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                          Course type
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            className={
                              editCourseDeliveryType === 'private'
                                ? buttonPrimary
                                : buttonSecondary
                            }
                            onClick={() => setEditCourseDeliveryType('private')}
                          >
                            Private
                          </button>

                          <button
                            type="button"
                            className={
                              editCourseDeliveryType === 'public'
                                ? buttonPrimary
                                : buttonSecondary
                            }
                            onClick={() => {
                              setEditCourseDeliveryType('public')
                              setEditClientId('')
                            }}
                          >
                            Public
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 mt-2">
                          Private courses require one client. Public courses can have delegates from multiple clients.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select
                          className={inputClass}
                          value={editClientId}
                          onChange={(e) => setEditClientId(e.target.value)}
                        >
                          <option value="">
                            {editCourseDeliveryType === 'public'
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
                          value={editTrainerId}
                          onChange={(e) => setEditTrainerId(e.target.value)}
                        >
                          <option value="">Assign trainer</option>

                          {trainers.map((trainer) => (
                            <option key={trainer.id} value={trainer.id}>
                              {trainer.name}
                            </option>
                          ))}
                        </select>

                        <select
                          className={`${inputClass} md:col-span-2`}
                          value={editCourseTemplateId}
                          onChange={(e) => applyEditCourseTemplate(e.target.value)}
                        >
                          <option value="">Apply course template</option>

                          {courseTemplates.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.code ? `${course.code} - ` : ''}
                              {course.name}
                            </option>
                          ))}
                        </select>

                        <select
                          className={`${inputClass} md:col-span-2`}
                          value={editCertificateTemplateId}
                          onChange={(e) => setEditCertificateTemplateId(e.target.value)}
                        >
                          <option value="">Use automatic certificate template</option>

                          {certificateTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {getCertificateTemplateLabel(template)}
                            </option>
                          ))}
                        </select>

                        <input
                          className={inputClass}
                          placeholder="Course name"
                          value={editCourseName}
                          onChange={(e) => setEditCourseName(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          type="time"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          type="time"
                          value={editEndTime}
                          onChange={(e) => setEditEndTime(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          placeholder="Location"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          placeholder="Price"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                        />

                        <textarea
                          className={`${inputClass} md:col-span-2 min-h-24`}
                          placeholder="Notes"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      </div>

                      {editCourseDeliveryType === 'public' && (
                        <div className="bg-purple-50 border border-purple-100 rounded-md p-3 text-xs text-purple-700 mt-4">
                          Public courses can have delegates from multiple clients. The main client can be left blank.
                        </div>
                      )}

                      {editCourseTemplateId && (
                        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600 mt-4">
                          Course template applied. If a matching certificate template exists, it has been selected automatically.
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          className={buttonPrimary}
                          onClick={() => saveBookingEdit(booking.id)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? 'Saving...' : 'Save changes'}
                        </button>

                        <button
                          className={buttonSecondary}
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
              <div className="p-6 text-sm text-slate-500">
                No bookings match your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}