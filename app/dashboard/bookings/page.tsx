'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate, formatAppTimeRange } from '@/lib/formatters'
import { parseOptionalNonNegativeNumber } from '@/lib/numberValidation'
import { getCourseDurationDays, getDefaultEndDateForDuration } from '@/lib/bookingDates'
import { fetchPaginatedImportRecords } from '@/lib/importCsv'
import { getComputedBookingStatus } from '@/lib/bookingStatus'
import ClientPicker from './ClientPicker'

const BOOKINGS_PAGE_SIZE = 50

const cleanSearchTerm = (value: string) =>
  value.trim().replace(/[%_,]/g, ' ')

const getLocalDateValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getLocalTimeValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [bookingLocations, setBookingLocations] = useState<string[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [courseTemplates, setCourseTemplates] = useState<any[]>([])
  const [certificateTemplates, setCertificateTemplates] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalBookings, setTotalBookings] = useState(0)
  const [matchingBookings, setMatchingBookings] = useState(0)
  const [privateBookingsCount, setPrivateBookingsCount] = useState(0)
  const [publicBookingsCount, setPublicBookingsCount] = useState(0)
  const [scheduledBookingsCount, setScheduledBookingsCount] = useState(0)
  const [cancelledBookingsCount, setCancelledBookingsCount] = useState(0)

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
  const [autoFilledLocation, setAutoFilledLocation] = useState('')
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
  const [editEndDate, setEditEndDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editAutoFilledLocation, setEditAutoFilledLocation] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [search, setSearch] = useState('')
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [trainerFilter, setTrainerFilter] = useState('all')
  const [dateSort, setDateSort] = useState('descending')

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

  const getMatchingIds = async (
    table: 'clients' | 'trainers',
    organisationIdValue: string,
    searchTerm: string
  ) => {
    const cleanTerm = cleanSearchTerm(searchTerm)

    if (!cleanTerm) return []

    const term = `%${cleanTerm}%`
    const searchFilter =
      table === 'clients'
        ? `company.ilike.${term},name.ilike.${term},email.ilike.${term}`
        : `name.ilike.${term},email.ilike.${term}`

    return fetchPaginatedImportRecords<any>(
      async (from, to) =>
        await supabase
          .from(table)
          .select('id')
          .eq('organisation_id', organisationIdValue)
          .or(searchFilter)
          .range(from, to)
    )
  }

  const applyBookingFilters = (
    query: any,
    searchTerm: string,
    matchingClientIds: string[],
    matchingTrainerIds: string[]
  ) => {
    let nextQuery = query

    if (deliveryTypeFilter !== 'all') {
      nextQuery = nextQuery.eq('course_delivery_type', deliveryTypeFilter)
    }

    if (statusFilter === 'completed') {
      const now = new Date()
      const today = getLocalDateValue(now)
      const currentTime = getLocalTimeValue(now)

      nextQuery = nextQuery
        .neq('status', 'cancelled')
        .or(
          [
            'status.eq.completed',
            `end_date.lt.${today}`,
            `and(end_date.is.null,date.lt.${today})`,
            `and(end_date.eq.${today},end_time.lt.${currentTime})`,
            `and(end_date.is.null,date.eq.${today},end_time.lt.${currentTime})`,
          ].join(',')
        )
    } else if (statusFilter !== 'all') {
      nextQuery = nextQuery.eq('status', statusFilter)
    }

    if (trainerFilter !== 'all') {
      nextQuery = nextQuery.eq('trainer_id', trainerFilter)
    }

    const cleanTerm = cleanSearchTerm(searchTerm)

    if (!cleanTerm) return nextQuery

    const term = `%${cleanTerm}%`
    const filters = [
      `course_name.ilike.${term}`,
      `client_name.ilike.${term}`,
      `location.ilike.${term}`,
      `notes.ilike.${term}`,
      `status.ilike.${term}`,
      `course_delivery_type.ilike.${term}`,
    ]

    if (matchingClientIds.length > 0) {
      filters.push(`client_id.in.(${matchingClientIds.join(',')})`)
    }

    if (matchingTrainerIds.length > 0) {
      filters.push(`trainer_id.in.(${matchingTrainerIds.join(',')})`)
    }

    return nextQuery.or(filters.join(','))
  }

  const load = async (page = currentPage, searchTerm = search) => {
    setLoading(true)

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
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    const matchingClients = await getMatchingIds('clients', profile.organisation_id, searchTerm)
    const matchingTrainers = await getMatchingIds('trainers', profile.organisation_id, searchTerm)
    const from = (page - 1) * BOOKINGS_PAGE_SIZE
    const to = from + BOOKINGS_PAGE_SIZE - 1
    let bookingQuery = supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .range(from, to)

    bookingQuery = applyBookingFilters(
      bookingQuery,
      searchTerm,
      matchingClients.map((client) => client.id),
      matchingTrainers.map((trainer) => trainer.id)
    )

    const sortAscending = dateSort === 'ascending'
    const { data: bookingsData, count: bookingsCount, error: bookingsError } =
      await bookingQuery
        .order('date', { ascending: sortAscending })
        .order('created_at', { ascending: sortAscending })

    if (bookingsError) {
      alert(bookingsError.message)
      setLoading(false)
      return
    }

    const { count: allCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)

    const getBookingCount = async (column: string, value: string) => {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', profile.organisation_id)
        .eq(column, value)

      return count || 0
    }

    const locationRows = await fetchPaginatedImportRecords<{ location?: string | null }>(
      async (fromIndex, toIndex) =>
        await supabase
          .from('bookings')
          .select('location')
          .eq('organisation_id', profile.organisation_id)
          .not('location', 'is', null)
          .range(fromIndex, toIndex)
    )

    setOrganisation(organisationData || null)
    setClients(clientsData || [])
    setTrainers(trainersData || [])
    setCourseTemplates(courseTemplatesData || [])
    setCertificateTemplates(certificateTemplatesData || [])
    setBookings(bookingsData || [])
    setBookingLocations(
      locationRows
        .map((row) => String(row.location || '').trim())
        .filter(Boolean)
    )
    setMatchingBookings(bookingsCount || 0)
    setTotalBookings(allCount || 0)
    setPrivateBookingsCount(await getBookingCount('course_delivery_type', 'private'))
    setPublicBookingsCount(await getBookingCount('course_delivery_type', 'public'))
    setScheduledBookingsCount(await getBookingCount('status', 'scheduled'))
    setCancelledBookingsCount(await getBookingCount('status', 'cancelled'))
    setLoading(false)
  }

  useEffect(() => {
    load(1, '')
  }, [])

  useEffect(() => {
    if (!organisationId) return

    const timeout = window.setTimeout(() => {
      setCurrentPage(1)
      load(1, search)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [search, deliveryTypeFilter, statusFilter, trainerFilter, dateSort, organisationId])

  const getFormattedDate = (dateValue: string | null | undefined) => {
    return formatAppDate(dateValue, organisation)
  }

  const getFormattedTimeRange = (
    startTimeValue: string | null | undefined,
    endTimeValue: string | null | undefined
  ) => {
    return formatAppTimeRange(startTimeValue, endTimeValue, organisation)
  }

  const getFormattedDateRange = (booking: any) => {
    const start = getFormattedDate(booking.date)
    const endDateValue = booking.end_date || booking.date

    if (!endDateValue || endDateValue === booking.date) return start

    return `${start} - ${getFormattedDate(endDateValue)}`
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

  const getLocationSuggestions = () => {
    return Array.from(
      new Set(
        bookingLocations
      )
    ).sort((a, b) => a.localeCompare(b))
  }

  const setClientAndMaybeLocation = (selectedClientId: string) => {
    const previousAutoFill = autoFilledLocation

    if (!selectedClientId) {
      setClientId('')

      if (previousAutoFill && location === previousAutoFill) {
        setLocation('')
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
  }

  const setEditClientAndMaybeLocation = (selectedClientId: string) => {
    const previousAutoFill = editAutoFilledLocation

    if (!selectedClientId) {
      setEditClientId('')

      if (previousAutoFill && editLocation === previousAutoFill) {
        setEditLocation('')
      }

      setEditAutoFilledLocation('')
      return
    }

    setEditClientId(selectedClientId)

    const selectedClient = clients.find((client) => client.id === selectedClientId)
    const selectedAddress = selectedClient?.address || ''

    if (
      selectedAddress &&
      (editCourseDeliveryType === 'private' || editCourseDeliveryType === 'public') &&
      (!editLocation.trim() || (previousAutoFill && editLocation === previousAutoFill))
    ) {
      setEditLocation(selectedAddress)
      setEditAutoFilledLocation(selectedAddress)
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

  const updateEditDateWithTemplateDuration = (nextDate: string) => {
    setEditDate(nextDate)

    const selectedCourse = courseTemplates.find((course) => course.id === editCourseTemplateId)
    const durationDays = getCourseDurationDays(selectedCourse)

    if (durationDays > 1) {
      setEditEndDate(getDefaultEndDateForDuration(nextDate, durationDays))
    } else if (!editEndDate || editEndDate === editDate) {
      setEditEndDate(nextDate)
    }
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

    if (selectedCourse.default_start_time) {
      setEditStartTime(String(selectedCourse.default_start_time).slice(0, 5))
    }

    if (selectedCourse.default_end_time) {
      setEditEndTime(String(selectedCourse.default_end_time).slice(0, 5))
    }

    const durationDays = getCourseDurationDays(selectedCourse)

    if (editDate) {
      setEditEndDate(getDefaultEndDateForDuration(editDate, durationDays))
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
    setAutoFilledLocation('')
    setPrice('')
    setNotes('')

    setCurrentPage(1)
    load(1, search)
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
    setEditEndDate(booking.end_date || booking.date || '')
    setEditStartTime(booking.start_time || '')
    setEditEndTime(booking.end_time || '')
    setEditLocation(booking.location || '')
    setEditAutoFilledLocation('')
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
    setEditEndDate('')
    setEditStartTime('')
    setEditEndTime('')
    setEditLocation('')
    setEditAutoFilledLocation('')
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

    if (editEndDate && editEndDate < editDate) {
      alert('End date must be on or after the start date')
      return
    }

    const parsedPrice = parseOptionalNonNegativeNumber(editPrice, 'Price')

    if (parsedPrice.error) {
      alert(parsedPrice.error)
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
        end_date: editEndDate || editDate,
        start_time: editStartTime || null,
        end_time: editEndTime || null,
        location: editLocation,
        price: parsedPrice.value,
        notes: editNotes,
      })
      .eq('id', bookingId)

    setSavingEdit(false)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    load(currentPage, search)
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

    load(currentPage, search)
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

    load(currentPage, search)
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
    setDateSort('descending')
  }

  const estimatedValue = bookings.reduce(
    (sum, booking) => sum + Number(booking.price || 0),
    0
  )

  const totalPages = Math.max(1, Math.ceil(matchingBookings / BOOKINGS_PAGE_SIZE))
  const pageStart = matchingBookings === 0 ? 0 : (currentPage - 1) * BOOKINGS_PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * BOOKINGS_PAGE_SIZE, matchingBookings)

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)

    setCurrentPage(nextPage)
    load(nextPage, search)
  }

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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <StatCard
          label="Total bookings"
          value={totalBookings}
          detail="All bookings recorded"
        />

        <StatCard
          label="Private"
          value={privateBookingsCount}
          detail="Client-specific courses"
        />

        <StatCard
          label="Public"
          value={publicBookingsCount}
          detail="Open courses"
        />

        <StatCard
          label="Scheduled"
          value={scheduledBookingsCount}
          detail="Upcoming or planned"
        />

        <StatCard
          label="Estimated value"
          value={`£${estimatedValue.toFixed(2)}`}
          detail="Visible page value"
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
              <option value="descending">Newest first</option>
              <option value="ascending">Oldest first</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
            <p className="text-xs text-slate-500">
              {loading
                ? 'Loading bookings...'
                : `Showing ${pageStart}-${pageEnd} of ${matchingBookings} matching bookings. Total bookings: ${totalBookings}.`}
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
        <div id="create-booking" className="xl:col-span-4 bg-white border border-slate-200 rounded-lg h-fit">
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
                  setClientAndMaybeLocation('')
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
              list="booking-location-suggestions"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value)
                setAutoFilledLocation('')
              }}
            />

            <datalist id="booking-location-suggestions">
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

            {cancelledBookingsCount > 0 && (
              <p className="text-xs text-slate-500">
                Cancelled: {cancelledBookingsCount}
              </p>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {bookings.map((booking) => {
              const trainer = getTrainerForBooking(booking)
              const client = getClientForBooking(booking)
              const savedClientEmail = client?.email || ''
              const isEditing = editingId === booking.id
              const certificateTemplate = getCertificateTemplateForBooking(booking)
              const bookingDeliveryType = booking.course_delivery_type || 'private'
              const displayStatus = getComputedBookingStatus(booking)

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
                                displayStatus
                              )}`}
                            >
                              {displayStatus}
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

                          <p className="text-xs text-slate-500 mt-1">
                            {getFormattedDateRange(booking)}
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
                            {getFormattedDateRange(booking)}
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

                          {displayStatus !== 'scheduled' && (
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

                          {displayStatus !== 'completed' && (
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

                          {displayStatus !== 'cancelled' && (
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
                              setEditClientAndMaybeLocation('')
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
                        <ClientPicker
                          clients={clients}
                          value={editClientId}
                          onChange={setEditClientAndMaybeLocation}
                          inputClass={inputClass}
                          placeholder={
                            editCourseDeliveryType === 'public'
                              ? 'Search optional main client...'
                              : 'Search clients...'
                          }
                        />

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
                          onChange={(e) => updateEditDateWithTemplateDuration(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          type="date"
                          value={editEndDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
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
                          list="booking-location-suggestions"
                          value={editLocation}
                          onChange={(e) => {
                            setEditLocation(e.target.value)
                            setEditAutoFilledLocation('')
                          }}
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

            {bookings.length === 0 && !loading && (
              <div className="p-6">
                <p className="text-sm font-semibold text-slate-950">
                  No bookings to show
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Create a private booking or public course, or clear the filters to see more records.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <a
                    href="#create-booking"
                    className={buttonPrimary}
                  >
                    Create booking
                  </a>

                  <button
                    className={buttonSecondary}
                    onClick={clearFilters}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {matchingBookings > BOOKINGS_PAGE_SIZE && (
            <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  className={buttonSecondary}
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1 || loading}
                >
                  Previous
                </button>

                <button
                  className={buttonSecondary}
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || loading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
