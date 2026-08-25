'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate, formatAppTimeRange } from '@/lib/formatters'
import { createCertificateVerificationId } from '@/lib/certificateVerification'
import { getCourseDurationDays, getDefaultEndDateForDuration } from '@/lib/bookingDates'
import { parseOptionalNonNegativeNumber } from '@/lib/numberValidation'
import { fetchPaginatedImportRecords } from '@/lib/importCsv'
import { getComputedBookingStatus } from '@/lib/bookingStatus'
import { getComputedCertificateStatus } from '@/lib/certificateStatus'
import { getJoiningInstructionDraft } from '@/lib/joiningInstructions'
import {
  getBulkCertificateEmailSummary,
  getBulkCertificateGenerationSummary,
  getRegisterStatus,
  isCertificateEligible,
  normalizeRegisterRow,
  type AttendanceStatus,
  type ResultStatus,
} from '@/lib/attendanceRegister'

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [courseTemplates, setCourseTemplates] = useState<any[]>([])
  const [certificateTemplates, setCertificateTemplates] = useState<any[]>([])
  const [joiningInstructionTemplates, setJoiningInstructionTemplates] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [allClientDelegates, setAllClientDelegates] = useState<any[]>([])
  const [bookingLocations, setBookingLocations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingCertificateTemplate, setSavingCertificateTemplate] = useState(false)
  const [sendingConfirmation, setSendingConfirmation] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [savingJoiningInstructions, setSavingJoiningInstructions] = useState(false)
  const [sendingJoiningInstructions, setSendingJoiningInstructions] = useState(false)
  const [joiningInstructionMessage, setJoiningInstructionMessage] = useState('')

  const [editTrainerId, setEditTrainerId] = useState('')
  const [editCourseTemplateId, setEditCourseTemplateId] = useState('')
  const [editCertificateTemplateId, setEditCertificateTemplateId] = useState('')
  const [editCourseName, setEditCourseName] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [joiningInstructionTemplateId, setJoiningInstructionTemplateId] = useState('')
  const [joiningInstructionSubject, setJoiningInstructionSubject] = useState('')
  const [joiningInstructionBody, setJoiningInstructionBody] = useState('')

  const [recipientEmail, setRecipientEmail] = useState('')

  const [existingDelegateId, setExistingDelegateId] = useState('')
  const [delegateClientId, setDelegateClientId] = useState('')
  const [delegateName, setDelegateName] = useState('')
  const [delegateEmail, setDelegateEmail] = useState('')
  const [delegatePhone, setDelegatePhone] = useState('')
  const [delegateNotes, setDelegateNotes] = useState('')

  const [editingDelegateId, setEditingDelegateId] = useState('')
  const [editDelegateName, setEditDelegateName] = useState('')
  const [editDelegateEmail, setEditDelegateEmail] = useState('')
  const [editDelegatePhone, setEditDelegatePhone] = useState('')
  const [editDelegateNotes, setEditDelegateNotes] = useState('')

  const [selectedDelegateIds, setSelectedDelegateIds] = useState<string[]>([])
  const [certificateIssueDate, setCertificateIssueDate] = useState('')
  const [certificateExpiryDate, setCertificateExpiryDate] = useState('')
  const [creatingCertificates, setCreatingCertificates] = useState(false)
  const [sendingCertificates, setSendingCertificates] = useState(false)
  const [savingRegister, setSavingRegister] = useState(false)
  const [registerMessage, setRegisterMessage] = useState('')

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

  const getDateString = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  const addYearsToDate = (dateString: string, years: number) => {
    const baseDate = dateString ? new Date(dateString) : new Date()
    baseDate.setFullYear(baseDate.getFullYear() + years)

    return getDateString(baseDate)
  }

  const replaceCertificatePlaceholders = (
    text: string,
    values: Record<string, string>
  ) => {
    let output = text || ''

    Object.entries(values).forEach(([key, value]) => {
      output = output.replaceAll(`{{${key}}}`, value || '')
    })

    return output
  }

  const isPublicBooking = () => {
    return booking?.course_delivery_type === 'public'
  }

  const getClientForDelegate = (delegate: any) => {
    if (!delegate?.client_id) return null

    return clients.find((clientItem) => clientItem.id === delegate.client_id)
  }

  const getDelegateClientDisplay = (delegate: any) => {
    const delegateClient = getClientForDelegate(delegate)

    if (delegateClient?.company) return delegateClient.company

    if (delegate.client_id) return 'Client not found'

    return 'No client / individual learner'
  }

  const getBookingClientDisplay = () => {
    if (client?.company) return client.company

    if (booking?.course_delivery_type === 'public') return 'Public course'

    return booking?.client_name || 'No client'
  }

  const getCertificateTemplateFromLists = (
    bookingData: any,
    localCourseTemplates: any[],
    localCertificateTemplates: any[]
  ) => {
    if (!bookingData) return null

    if (bookingData.certificate_template_id) {
      const selectedBookingTemplate = localCertificateTemplates.find(
        (template) => template.id === bookingData.certificate_template_id
      )

      if (selectedBookingTemplate) return selectedBookingTemplate
    }

    const matchedCourseTemplate = localCourseTemplates.find(
      (course) =>
        course.name?.toLowerCase() === bookingData.course_name?.toLowerCase()
    )

    if (matchedCourseTemplate) {
      const courseSpecificTemplate = localCertificateTemplates.find(
        (template) => template.course_template_id === matchedCourseTemplate.id
      )

      if (courseSpecificTemplate) return courseSpecificTemplate
    }

    const defaultTemplate = localCertificateTemplates.find(
      (template) => template.is_default
    )

    return defaultTemplate || localCertificateTemplates[0] || null
  }

  const getCertificateTemplateForBooking = () => {
    return getCertificateTemplateFromLists(
      booking,
      courseTemplates,
      certificateTemplates
    )
  }

  const getDefaultExpiryDate = (issueDate: string) => {
    const template = getCertificateTemplateForBooking()
    const validityYears = Number(template?.validity_years ?? 3)

    return addYearsToDate(issueDate, validityYears)
  }

  const load = async () => {
    const currentProfile = await getOrCreateAccount()
    const bookingId = params.id as string

    setProfile(currentProfile)

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', currentProfile.organisation_id)
      .single()

    const clientsData = await fetchPaginatedImportRecords<any>(
      async (from, to) =>
        await supabase
          .from('clients')
          .select('*')
          .eq('organisation_id', currentProfile.organisation_id)
          .order('company', { ascending: true })
          .range(from, to)
    )

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('organisation_id', currentProfile.organisation_id)
      .single()

    if (bookingError || !bookingData) {
      setBooking(null)
      setLoading(false)
      return
    }

    let clientData = null

    if (bookingData.client_id) {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', bookingData.client_id)
        .eq('organisation_id', currentProfile.organisation_id)
        .single()

      clientData = data
    }

    const { data: trainersData } = await supabase
      .from('trainers')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .order('name', { ascending: true })

    const { data: courseTemplatesData } = await supabase
      .from('course_templates')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .order('name', { ascending: true })

    const { data: certificateTemplatesData } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    const { data: joiningInstructionTemplatesData } = await supabase
      .from('joining_instruction_templates')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .is('archived_at', null)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('created_at', { ascending: false })

    const { data: certificatesData } = await supabase
      .from('certificates')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('created_at', { ascending: false })

    const { data: bookingLocationData } = await supabase
      .from('bookings')
      .select('location')
      .eq('organisation_id', currentProfile.organisation_id)
      .not('location', 'is', null)

    let allClientDelegatesData: any[] = []

    if (bookingData.course_delivery_type === 'public') {
      const { data } = await supabase
        .from('delegates')
        .select('*')
        .eq('organisation_id', currentProfile.organisation_id)
        .order('full_name', { ascending: true })

      allClientDelegatesData = data || []
    } else {
      const { data } = await supabase
        .from('delegates')
        .select('*')
        .eq('client_id', bookingData.client_id)
        .eq('organisation_id', currentProfile.organisation_id)
        .order('full_name', { ascending: true })

      allClientDelegatesData = data || []
    }

    const { data: bookingLinksData } = await supabase
      .from('booking_delegates')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('organisation_id', currentProfile.organisation_id)

    const bookingLinks = bookingLinksData || []
    const bookingLinksByDelegateId = new Map(
      bookingLinks.map((link) => [link.delegate_id, link])
    )

    const delegateIds = bookingLinks.map((link) => link.delegate_id)

    let bookingDelegatesData: any[] = []

    if (delegateIds.length > 0) {
      const { data } = await supabase
        .from('delegates')
        .select('*')
        .in('id', delegateIds)
        .eq('organisation_id', currentProfile.organisation_id)
        .order('full_name', { ascending: true })

      bookingDelegatesData = (data || []).map((delegate) => {
        const link = bookingLinksByDelegateId.get(delegate.id) || {}
        const normalizedRegister = normalizeRegisterRow({
          attendance_status: link.attendance_status,
          result_status: link.result_status,
        })

        return {
          ...delegate,
          booking_delegate_id: link.id,
          attendance_status: normalizedRegister.attendance_status,
          result_status: normalizedRegister.result_status,
          attendance_notes: link.attendance_notes || '',
          register_marked_at: link.register_marked_at || null,
        }
      })
    }

    const selectedTemplate = getCertificateTemplateFromLists(
      bookingData,
      courseTemplatesData || [],
      certificateTemplatesData || []
    )

    setOrganisation(organisationData || null)
    setClients(clientsData || [])
    setBooking(bookingData)
    setClient(clientData)
    setTrainers(trainersData || [])
    setCourseTemplates(courseTemplatesData || [])
    setCertificateTemplates(certificateTemplatesData || [])
    setJoiningInstructionTemplates(joiningInstructionTemplatesData || [])
    setInvoices(invoicesData || [])
    setCertificates(certificatesData || [])
    setBookingLocations(
      Array.from(
        new Set(
          (bookingLocationData || [])
            .map((item) => String(item.location || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b))
    )
    setAllClientDelegates(allClientDelegatesData || [])
    setDelegates(bookingDelegatesData)

    setEditTrainerId(bookingData.trainer_id || '')
    setEditCourseTemplateId('')
    setEditCertificateTemplateId(bookingData.certificate_template_id || '')
    setEditCourseName(bookingData.course_name || '')
    setEditDate(bookingData.date || '')
    setEditEndDate(bookingData.end_date || bookingData.date || '')
    setEditStartTime(bookingData.start_time || '')
    setEditEndTime(bookingData.end_time || '')
    setEditLocation(bookingData.location || '')
    setEditPrice(bookingData.price ? String(bookingData.price) : '')
    setEditNotes(bookingData.notes || '')
    setJoiningInstructionTemplateId(bookingData.joining_instruction_template_id || '')
    setJoiningInstructionSubject(bookingData.joining_instruction_subject || '')
    setJoiningInstructionBody(bookingData.joining_instruction_body || '')
    setRecipientEmail(clientData?.email || '')
    setDelegateClientId(
      bookingData.course_delivery_type === 'public'
        ? ''
        : bookingData.client_id || ''
    )

    if (!certificateIssueDate) {
      const issueDate = bookingData.date || getDateString(new Date())
      const validityYears = Number(selectedTemplate?.validity_years ?? 3)

      setCertificateIssueDate(issueDate)
      setCertificateExpiryDate(addYearsToDate(issueDate, validityYears))
    }

    setLoading(false)
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

  const getFormattedDateRange = () => {
    const start = getFormattedDate(booking?.date)
    const endDateValue = booking?.end_date || booking?.date

    if (!endDateValue || endDateValue === booking?.date) return start

    return `${start} - ${getFormattedDate(endDateValue)}`
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

  const getTrainer = () => {
    return trainers.find((trainer) => trainer.id === booking?.trainer_id)
  }

  const getCertificateForDelegate = (delegate: any) => {
    return certificates.find((certificate) => {
      const matchesDelegateId = certificate.delegate_id === delegate.id

      const matchesOldCertificate =
        !certificate.delegate_id &&
        certificate.booking_id === booking.id &&
        certificate.learner_name?.toLowerCase() === delegate.full_name?.toLowerCase()

      return matchesDelegateId || matchesOldCertificate
    })
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

    const matchingCertificateTemplate = certificateTemplates.find(
      (template) => template.course_template_id === selectedCourse.id
    )

    if (matchingCertificateTemplate && !editCertificateTemplateId) {
      setEditCertificateTemplateId(matchingCertificateTemplate.id)
    }
  }

  const startEditing = () => {
    setEditTrainerId(booking.trainer_id || '')
    setEditCourseTemplateId('')
    setEditCertificateTemplateId(booking.certificate_template_id || '')
    setEditCourseName(booking.course_name || '')
    setEditDate(booking.date || '')
    setEditEndDate(booking.end_date || booking.date || '')
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
    setEditCertificateTemplateId(booking.certificate_template_id || '')
    setEditCourseName(booking.course_name || '')
    setEditDate(booking.date || '')
    setEditEndDate(booking.end_date || booking.date || '')
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

    if (editEndDate && editEndDate < editDate) {
      alert('End date must be on or after the start date')
      return
    }

    const parsedPrice = parseOptionalNonNegativeNumber(editPrice, 'Price')

    if (parsedPrice.error) {
      alert(parsedPrice.error)
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('bookings')
      .update({
        trainer_id: editTrainerId || null,
        certificate_template_id: editCertificateTemplateId || null,
        course_name: editCourseName,
        date: editDate,
        end_date: editEndDate || editDate,
        start_time: editStartTime || null,
        end_time: editEndTime || null,
        location: editLocation,
        price: parsedPrice.value,
        notes: editNotes,
      })
      .eq('id', booking.id)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    setEditing(false)

    const selectedTemplate = certificateTemplates.find(
      (template) => template.id === editCertificateTemplateId
    )

    if (selectedTemplate && certificateIssueDate) {
      const validityYears = Number(selectedTemplate.validity_years ?? 3)
      setCertificateExpiryDate(addYearsToDate(certificateIssueDate, validityYears))
    }

    load()
  }

  const saveCertificateTemplateOnly = async () => {
    setSavingCertificateTemplate(true)

    const { error } = await supabase
      .from('bookings')
      .update({
        certificate_template_id: editCertificateTemplateId || null,
      })
      .eq('id', booking.id)

    setSavingCertificateTemplate(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Certificate template saved for this booking')

    const selectedTemplate = certificateTemplates.find(
      (template) => template.id === editCertificateTemplateId
    )

    if (selectedTemplate && certificateIssueDate) {
      const validityYears = Number(selectedTemplate.validity_years ?? 3)
      setCertificateExpiryDate(addYearsToDate(certificateIssueDate, validityYears))
    }

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
        clientName: getBookingClientDisplay(),
        courseName: booking.course_name,
        date: getFormattedDate(booking.date),
        startTime: getFormattedTimeRange(booking.start_time, null),
        endTime: booking.end_time ? getFormattedTimeRange(booking.end_time, null) : '',
        location: booking.location,
        trainerName: trainer?.name || '',
        businessName: organisation?.name || 'Hercules OS',
        businessEmail: organisation?.email || '',
        businessPhone: organisation?.phone || '',
        organisationId: profile.organisation_id,
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
        clientName: getBookingClientDisplay(),
        courseName: booking.course_name,
        date: getFormattedDate(booking.date),
        startTime: getFormattedTimeRange(booking.start_time, null),
        endTime: booking.end_time ? getFormattedTimeRange(booking.end_time, null) : '',
        location: booking.location,
        trainerName: trainer?.name || '',
        businessName: organisation?.name || 'Hercules OS',
        businessEmail: organisation?.email || '',
        businessPhone: organisation?.phone || '',
        organisationId: profile.organisation_id,
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

  const applyJoiningInstructionTemplate = (templateId: string) => {
    setJoiningInstructionTemplateId(templateId)

    if (!templateId) {
      setJoiningInstructionSubject('')
      setJoiningInstructionBody('')
      return
    }

    const template = joiningInstructionTemplates.find(
      (item) => item.id === templateId
    )

    if (!template) return

    setJoiningInstructionSubject(template.subject || '')
    setJoiningInstructionBody(template.body || '')
  }

  const saveJoiningInstructions = async () => {
    const subjectToSave = joiningInstructionSubjectValue.trim()
    const bodyToSave = joiningInstructionBodyValue.trim()

    if (!subjectToSave || !bodyToSave) {
      alert('Joining instruction subject and body are required')
      return
    }

    setSavingJoiningInstructions(true)

    const { error } = await supabase
      .from('bookings')
      .update({
        joining_instruction_template_id: joiningInstructionTemplateId || null,
        joining_instruction_subject: subjectToSave,
        joining_instruction_body: bodyToSave,
      })
      .eq('id', booking.id)
      .eq('organisation_id', profile.organisation_id)

    setSavingJoiningInstructions(false)

    if (error) {
      alert(error.message)
      return
    }

    setJoiningInstructionMessage('Joining instructions saved.')
    load()
  }

  const sendJoiningInstructions = async () => {
    if (delegates.length === 0) {
      alert('Add delegates before sending joining instructions.')
      return
    }

    const force = booking.joining_instructions_sent_at
      ? confirm('Joining instructions have already been sent for this booking. Send them again?')
      : false

    if (booking.joining_instructions_sent_at && !force) return

    setSendingJoiningInstructions(true)
    setJoiningInstructionMessage('')

    const response = await fetch('/api/send-joining-instructions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId: booking.id,
        organisationId: profile.organisation_id,
        force,
      }),
    })

    const result = await response.json()

    setSendingJoiningInstructions(false)

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Joining instructions failed')
      return
    }

    const summary = result.summary || {}

    if (summary.alreadySent) {
      setJoiningInstructionMessage('Joining instructions were already sent for this booking.')
    } else if (summary.skippedCancelled) {
      setJoiningInstructionMessage('Cancelled bookings are skipped.')
    } else {
      setJoiningInstructionMessage(
        `Sent: ${summary.sent || 0}. Missing email: ${summary.skippedMissingEmail || 0}. Failed: ${summary.failed || 0}.`
      )
    }

    load()
  }

  const createDelegateAndAttach = async () => {
    if (!delegateName) {
      alert('Delegate name is required')
      return
    }

    const selectedClientId = isPublicBooking()
      ? delegateClientId || null
      : booking.client_id

    if (!isPublicBooking() && !selectedClientId) {
      alert('Private bookings require delegates to belong to the booking client.')
      return
    }

    const { data: delegateData, error: delegateError } = await supabase
      .from('delegates')
      .insert({
        organisation_id: profile.organisation_id,
        client_id: selectedClientId,
        booking_id: booking.id,
        full_name: delegateName,
        email: delegateEmail || null,
        phone: delegatePhone || null,
        notes: delegateNotes || null,
      })
      .select('*')
      .single()

    if (delegateError) {
      alert(delegateError.message)
      return
    }

    const { error: linkError } = await supabase
      .from('booking_delegates')
      .insert({
        organisation_id: profile.organisation_id,
        client_id: selectedClientId,
        booking_id: booking.id,
        delegate_id: delegateData.id,
      })

    if (linkError) {
      await supabase
        .from('delegates')
        .delete()
        .eq('id', delegateData.id)
        .eq('organisation_id', profile.organisation_id)

      alert(linkError.message)
      return
    }

    setDelegateClientId(isPublicBooking() ? '' : booking.client_id || '')
    setDelegateName('')
    setDelegateEmail('')
    setDelegatePhone('')
    setDelegateNotes('')

    load()
  }

  const attachExistingDelegate = async () => {
    if (!existingDelegateId) {
      alert('Select a delegate first')
      return
    }

    const selectedDelegate = allClientDelegates.find(
      (delegate) => delegate.id === existingDelegateId
    )

    const { error } = await supabase
      .from('booking_delegates')
      .insert({
        organisation_id: profile.organisation_id,
        client_id: selectedDelegate?.client_id || booking.client_id || null,
        booking_id: booking.id,
        delegate_id: existingDelegateId,
      })

    if (error) {
      if (error.message.includes('duplicate')) {
        alert('This delegate is already attached to this booking.')
        return
      }

      alert(error.message)
      return
    }

    setExistingDelegateId('')
    load()
  }

  const startEditingDelegate = (delegate: any) => {
    setEditingDelegateId(delegate.id)
    setEditDelegateName(delegate.full_name || '')
    setEditDelegateEmail(delegate.email || '')
    setEditDelegatePhone(delegate.phone || '')
    setEditDelegateNotes(delegate.notes || '')
  }

  const cancelEditingDelegate = () => {
    setEditingDelegateId('')
    setEditDelegateName('')
    setEditDelegateEmail('')
    setEditDelegatePhone('')
    setEditDelegateNotes('')
  }

  const saveDelegate = async (delegateId: string) => {
    if (!editDelegateName) {
      alert('Delegate name is required')
      return
    }

    const { error } = await supabase
      .from('delegates')
      .update({
        full_name: editDelegateName,
        email: editDelegateEmail || null,
        phone: editDelegatePhone || null,
        notes: editDelegateNotes || null,
      })
      .eq('id', delegateId)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditingDelegate()
    load()
  }

  const removeDelegateFromBooking = async (delegateId: string) => {
    const confirmRemove = confirm(
      'Remove this delegate from this booking? Their delegate profile will not be deleted.'
    )

    if (!confirmRemove) return

    const { error } = await supabase
      .from('booking_delegates')
      .delete()
      .eq('booking_id', booking.id)
      .eq('delegate_id', delegateId)

    if (error) {
      alert(error.message)
      return
    }

    setSelectedDelegateIds((previous) =>
      previous.filter((id) => id !== delegateId)
    )

    load()
  }

  const toggleDelegateSelection = (delegateId: string) => {
    setSelectedDelegateIds((previous) => {
      if (previous.includes(delegateId)) {
        return previous.filter((id) => id !== delegateId)
      }

      return [...previous, delegateId]
    })
  }

  const selectAllDelegates = () => {
    setSelectedDelegateIds(delegates.map((delegate) => delegate.id))
  }

  const clearSelectedDelegates = () => {
    setSelectedDelegateIds([])
  }

  const updateDelegateRegisterField = (
    delegateId: string,
    field: 'attendance_status' | 'result_status' | 'attendance_notes',
    value: string
  ) => {
    setRegisterMessage('')
    setDelegates((previous) =>
      previous.map((delegate) => {
        if (delegate.id !== delegateId) return delegate

        if (field === 'attendance_status') {
          const attendanceStatus = value as AttendanceStatus
          const nextResultStatus =
            attendanceStatus === 'absent' && delegate.result_status === 'passed'
              ? 'failed'
              : delegate.result_status

          return {
            ...delegate,
            attendance_status: attendanceStatus,
            result_status: nextResultStatus,
          }
        }

        return {
          ...delegate,
          [field]: value,
        }
      })
    )
  }

  const saveRegister = async () => {
    if (delegates.length === 0) {
      setRegisterMessage('Attach delegates before saving the register.')
      return
    }

    setSavingRegister(true)
    setRegisterMessage('')

    const normalizedDelegates = delegates.map((delegate) =>
      normalizeRegisterRow(delegate)
    )

    const normalizedAbsentPassed = delegates.some(
      (delegate) =>
        delegate.attendance_status === 'absent' &&
        delegate.result_status === 'passed'
    )

    const now = new Date().toISOString()

    const results = await Promise.all(
      normalizedDelegates.map((delegate) =>
        supabase
          .from('booking_delegates')
          .update({
            attendance_status: delegate.attendance_status,
            result_status: delegate.result_status,
            attendance_notes: delegate.attendance_notes?.trim() || null,
            register_marked_at: now,
          })
          .eq('booking_id', booking.id)
          .eq('delegate_id', delegate.id)
          .eq('organisation_id', profile.organisation_id)
      )
    )

    const firstError = results.find((result) => result.error)?.error

    setSavingRegister(false)

    if (firstError) {
      setRegisterMessage(firstError.message)
      return
    }

    setDelegates(normalizedDelegates)
    setRegisterMessage(
      normalizedAbsentPassed
        ? 'Register saved. Absent delegates marked as passed were saved as failed.'
        : 'Register saved.'
    )
  }

  const createCertificatesForDelegates = async (
    delegatesToGenerate: any[],
    summary: {
      skippedNotEligible: number
      skippedExistingCertificate: number
    }
  ) => {
    if (!certificateIssueDate || !certificateExpiryDate) {
      alert('Issue date and expiry date are required')
      return false
    }

    if (delegatesToGenerate.length === 0) {
      alert(
        [
          'No certificates created.',
          `Skipped not eligible: ${summary.skippedNotEligible}.`,
          `Skipped already certified: ${summary.skippedExistingCertificate}.`,
        ].join('\n')
      )
      return false
    }

    const selectedTemplate = getCertificateTemplateForBooking()

    if (!selectedTemplate) {
      alert('No certificate template found. Create a default certificate template in Settings first.')
      return false
    }

    setCreatingCertificates(true)

    const { data: userData } = await supabase.auth.getUser()

    const rows = delegatesToGenerate.map((delegate, index) => {
      const certificateNumber = `CERT-${Date.now()}-${String(index + 1).padStart(2, '0')}`

      const placeholderValues = {
        delegate_name: delegate.full_name || '',
        learner_name: delegate.full_name || '',
        course_name: booking.course_name || '',
        issue_date: getFormattedDate(certificateIssueDate) || '',
        expiry_date: getFormattedDate(certificateExpiryDate) || '',
        certificate_number: certificateNumber,
        business_name: organisation?.name || 'Hercules OS',
        trainer_name: getTrainer()?.name || '',
      }

      return {
        user_id: userData.user?.id,
        organisation_id: profile.organisation_id,
        booking_id: booking.id,
        delegate_id: delegate.id,
        certificate_template_id: selectedTemplate.id,
        learner_name: delegate.full_name,
        course_name: booking.course_name,
        issue_date: certificateIssueDate,
        expiry_date: certificateExpiryDate,
        certificate_number: certificateNumber,
        verification_id: createCertificateVerificationId(),
        certificate_title: replaceCertificatePlaceholders(
          selectedTemplate.certificate_title,
          placeholderValues
        ),
        certificate_body: replaceCertificatePlaceholders(
          selectedTemplate.certificate_body,
          placeholderValues
        ),
        certificate_footer: replaceCertificatePlaceholders(
          selectedTemplate.footer_text || '',
          placeholderValues
        ),
        signature_name: selectedTemplate.signature_name || '',
        signature_title: selectedTemplate.signature_title || '',
        status: 'valid',
      }
    })

    const { error } = await supabase.from('certificates').insert(rows)

    setCreatingCertificates(false)

    if (error) {
      alert(error.message)
      return false
    }

    alert(
      [
        `Certificates created: ${rows.length}.`,
        `Skipped not eligible: ${summary.skippedNotEligible}.`,
        `Skipped already certified: ${summary.skippedExistingCertificate}.`,
        `Template: ${selectedTemplate.name}.`,
      ].join('\n')
    )
    load()
    return true
  }

  const createCertificatesForSelectedDelegates = async () => {
    if (selectedDelegateIds.length === 0) {
      alert('Select at least one delegate first')
      return
    }

    const selectedDelegates = delegates.filter((delegate) =>
      selectedDelegateIds.includes(delegate.id)
    )

    const summary = getBulkCertificateGenerationSummary(
      selectedDelegates,
      (delegate) => Boolean(getCertificateForDelegate(delegate))
    )

    await createCertificatesForDelegates(summary.delegatesToGenerate, summary)
  }

  const createCertificatesForEligibleDelegates = async () => {
    const summary = getBulkCertificateGenerationSummary(
      delegates,
      (delegate) => Boolean(getCertificateForDelegate(delegate))
    )

    await createCertificatesForDelegates(summary.delegatesToGenerate, summary)
  }

  const ensureCertificateVerificationId = async (certificate: any) => {
    if (certificate.verification_id) return certificate.verification_id

    const verificationId = createCertificateVerificationId()

    const { data, error } = await supabase
      .from('certificates')
      .update({ verification_id: verificationId })
      .eq('id', certificate.id)
      .eq('organisation_id', profile.organisation_id)
      .select('verification_id')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const savedVerificationId = data?.verification_id || verificationId

    setCertificates((previous) =>
      previous.map((item) =>
        item.id === certificate.id
          ? { ...item, verification_id: savedVerificationId }
          : item
      )
    )

    return savedVerificationId
  }

  const getCertificateRecordHref = (certificate: any) => {
    const searchTerm =
      certificate.certificate_number ||
      certificate.learner_name ||
      certificate.id

    return `/dashboard/certificates?search=${encodeURIComponent(searchTerm)}`
  }

  const downloadCertificatePDF = async (certificate: any, delegate?: any) => {
    const delegateClient = delegate ? getClientForDelegate(delegate) : null

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    const businessName = organisation?.name || 'Training Provider'
    const businessEmail = organisation?.email || ''
    const businessPhone = organisation?.phone || ''
    const learnerName = certificate.learner_name || delegate?.full_name || 'Learner'
    const courseName = certificate.course_name || booking.course_name || 'Training Course'
    const title = certificate.certificate_title || 'Certificate of Completion'
    const body =
      certificate.certificate_body ||
      `This is to certify that ${learnerName} has successfully completed ${courseName}.`
    const footer =
      certificate.certificate_footer ||
      'This certificate can be verified online using the certificate number.'
    const signatureName = certificate.signature_name || businessName
    const signatureTitle = certificate.signature_title || 'Training Provider'
    const issueDate = getFormattedDate(certificate.issue_date)
    const expiryDate = getFormattedDate(certificate.expiry_date)
    const certificateNumber = certificate.certificate_number || 'Not set'

    let verificationId = ''

    try {
      verificationId = await ensureCertificateVerificationId(certificate)
    } catch (error: any) {
      alert(error.message || 'Could not prepare certificate verification link')
      return
    }

    const verificationUrl = `${window.location.origin}/verify/${verificationId}`

    let qrDataUrl = ''

    try {
      qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        width: 240,
      })
    } catch {
      qrDataUrl = ''
    }

    doc.setFillColor(248, 250, 252)
    doc.rect(0, 0, 297, 210, 'F')

    doc.setFillColor(255, 255, 255)
    doc.roundedRect(15, 15, 267, 180, 4, 4, 'F')

    doc.setDrawColor(17, 24, 39)
    doc.setLineWidth(1.2)
    doc.roundedRect(22, 22, 253, 166, 3, 3, 'D')

    doc.setDrawColor(209, 213, 219)
    doc.setLineWidth(0.4)
    doc.roundedRect(28, 28, 241, 154, 2, 2, 'D')

    doc.setTextColor(17, 24, 39)
    doc.setFontSize(16)
    doc.text(businessName, 148.5, 40, { align: 'center' })

    doc.setFontSize(30)
    doc.text(title, 148.5, 63, { align: 'center' })

    doc.setDrawColor(17, 24, 39)
    doc.setLineWidth(0.5)
    doc.line(80, 72, 217, 72)

    doc.setFontSize(13)
    doc.setTextColor(75, 85, 99)
    doc.text('Presented to', 148.5, 86, { align: 'center' })

    doc.setFontSize(28)
    doc.setTextColor(17, 24, 39)
    doc.text(learnerName, 148.5, 103, { align: 'center' })

    doc.setFontSize(12)
    doc.setTextColor(75, 85, 99)
    doc.text(doc.splitTextToSize(body, 190), 148.5, 119, { align: 'center' })

    doc.setFontSize(10)
    doc.setTextColor(55, 65, 81)

    if (delegateClient?.company || client?.company) {
      doc.text(`Client: ${delegateClient?.company || client?.company}`, 45, 142)
    }

    doc.text(`Course: ${courseName}`, 45, 150)
    doc.text(`Issue Date: ${issueDate}`, 45, 158)
    doc.text(`Expiry Date: ${expiryDate}`, 45, 166)
    doc.text(`Certificate No: ${certificateNumber}`, 45, 174)

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 132, 141, 34, 34)
      doc.setFontSize(7)
      doc.setTextColor(107, 114, 128)
      doc.text('Scan to verify', 149, 179, { align: 'center' })
    }

    doc.setDrawColor(17, 24, 39)
    doc.line(198, 153, 255, 153)

    doc.setFontSize(12)
    doc.setTextColor(17, 24, 39)
    doc.text(signatureName, 226.5, 162, { align: 'center' })

    doc.setFontSize(9)
    doc.setTextColor(75, 85, 99)
    doc.text(signatureTitle, 226.5, 169, { align: 'center' })

    doc.setFontSize(8)
    doc.setTextColor(107, 114, 128)
    doc.text(doc.splitTextToSize(footer, 210), 148.5, 186, { align: 'center' })

    if (businessEmail || businessPhone) {
      doc.setFontSize(8)
      doc.text(
        `${businessEmail}${businessEmail && businessPhone ? ' - ' : ''}${businessPhone}`,
        148.5,
        194,
        { align: 'center' }
      )
    }

    doc.setFontSize(6)
    doc.setTextColor(156, 163, 175)
    doc.text(verificationUrl, 148.5, 201, { align: 'center' })

    const safeName = learnerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    doc.save(`${safeName || 'certificate'}-${certificateNumber}.pdf`)
  }

  const sendCertificatesForDelegates = async (
    delegatesToEmail: Array<{ delegate: any; certificate: any }>,
    summary: {
      skippedNotEligible: number
      skippedMissingCertificate: number
      skippedMissingEmail: number
    }
  ) => {
    if (delegatesToEmail.length === 0) {
      alert(
        [
          'No certificate emails sent.',
          `Skipped not eligible: ${summary.skippedNotEligible}.`,
          `Skipped missing certificate: ${summary.skippedMissingCertificate}.`,
          `Skipped missing email: ${summary.skippedMissingEmail}.`,
        ].join('\n')
      )
      return
    }

    setSendingCertificates(true)

    let sentCount = 0
    let failedCount = 0

    for (const { delegate, certificate } of delegatesToEmail) {
      let verificationId = ''

      try {
        verificationId = await ensureCertificateVerificationId(certificate)
      } catch {
        failedCount += 1
        continue
      }

      const verificationUrl =
        `${window.location.origin}/verify/${verificationId}`

      const response = await fetch('/api/send-certificate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: delegate.email,
          learnerName: certificate.learner_name,
          courseName: certificate.course_name,
          issueDate: getFormattedDate(certificate.issue_date),
          expiryDate: getFormattedDate(certificate.expiry_date),
          certificateNumber: certificate.certificate_number,
          verificationUrl,
          businessName: organisation?.name || 'Hercules OS',
          organisationId: profile.organisation_id,
        }),
      })

      if (response.ok) {
        sentCount += 1
      } else {
        failedCount += 1
      }
    }

    setSendingCertificates(false)

    if (failedCount > 0) {
      alert(
        [
          `Certificate emails sent: ${sentCount}.`,
          `Failed: ${failedCount}.`,
          `Skipped not eligible: ${summary.skippedNotEligible}.`,
          `Skipped missing certificate: ${summary.skippedMissingCertificate}.`,
          `Skipped missing email: ${summary.skippedMissingEmail}.`,
        ].join('\n')
      )
      return
    }

    alert(
      [
        `Certificate emails sent: ${sentCount}.`,
        `Skipped not eligible: ${summary.skippedNotEligible}.`,
        `Skipped missing certificate: ${summary.skippedMissingCertificate}.`,
        `Skipped missing email: ${summary.skippedMissingEmail}.`,
      ].join('\n')
    )
  }

  const sendCertificatesToSelectedDelegates = async () => {
    if (selectedDelegateIds.length === 0) {
      alert('Select at least one delegate first')
      return
    }

    const selectedDelegates = delegates.filter((delegate) =>
      selectedDelegateIds.includes(delegate.id)
    )

    const summary = getBulkCertificateEmailSummary(
      selectedDelegates,
      getCertificateForDelegate
    )

    await sendCertificatesForDelegates(summary.delegatesToEmail, summary)
  }

  const sendCertificatesToEligibleDelegates = async () => {
    const summary = getBulkCertificateEmailSummary(
      delegates,
      getCertificateForDelegate
    )

    await sendCertificatesForDelegates(summary.delegatesToEmail, summary)
  }

  const getStatusStyle = (status: string) => {
    if (status === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (status === 'cancelled') return 'bg-red-50 text-red-700 border-red-100'
    return 'bg-blue-50 text-blue-700 border-blue-100'
  }

  const getDeliveryTypeStyle = (type: string) => {
    if (type === 'public') return 'bg-purple-50 text-purple-700 border-purple-100'
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  const getInvoiceStatusStyle = (status: string) => {
    if (status === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    if (status === 'sent') return 'bg-blue-50 text-blue-700 border-blue-100'
    return 'bg-amber-50 text-amber-700 border-amber-100'
  }

  const getCertificateStatusStyle = (status: string) => {
    if (status === 'revoked') return 'bg-red-50 text-red-700 border-red-100'
    if (status === 'expired') return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  }

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading booking...
        </div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div>
        <Link
          href="/dashboard/bookings"
          className="text-sm text-slate-500 hover:text-slate-950"
        >
          ← Back to bookings
        </Link>

        <div className={`${panelClass} mt-4`}>
          <div className="p-4 text-sm text-slate-500">
            Booking not found.
          </div>
        </div>
      </div>
    )
  }

  const trainer = getTrainer()
  const selectedTemplate = getCertificateTemplateForBooking()
  const displayStatus = getComputedBookingStatus(booking)
  const joiningInstructionDraft = getJoiningInstructionDraft(
    {
      ...booking,
      joining_instruction_template_id:
        joiningInstructionTemplateId || booking.joining_instruction_template_id,
      joining_instruction_subject:
        joiningInstructionSubject || booking.joining_instruction_subject,
      joining_instruction_body:
        joiningInstructionBody || booking.joining_instruction_body,
    },
    joiningInstructionTemplates
  )
  const joiningInstructionSubjectValue =
    joiningInstructionSubject || joiningInstructionDraft.subject
  const joiningInstructionBodyValue =
    joiningInstructionBody || joiningInstructionDraft.body

  const selectedDelegates = delegates.filter((delegate) =>
    selectedDelegateIds.includes(delegate.id)
  )

  const selectedWithCertificates = selectedDelegates.filter((delegate) =>
    getCertificateForDelegate(delegate)
  )

  const selectedWithEmail = selectedDelegates.filter((delegate) => delegate.email)
  const selectedEligibleDelegates = selectedDelegates.filter(isCertificateEligible)
  const eligibleDelegates = delegates.filter(isCertificateEligible)
  const bulkGenerationSummary = getBulkCertificateGenerationSummary(
    delegates,
    (delegate) => Boolean(getCertificateForDelegate(delegate))
  )
  const bulkEmailSummary = getBulkCertificateEmailSummary(
    delegates,
    getCertificateForDelegate
  )
  const registerStatus = getRegisterStatus(delegates)

  const registerStatusCopy = {
    not_started: 'Not started',
    in_progress: 'In progress',
    complete: 'Complete',
  }

  const registerStatusClass = {
    not_started: 'bg-slate-50 text-slate-700 border-slate-200',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-100',
    complete: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }

  const linkedDelegateIds = delegates.map((delegate) => delegate.id)

  const availableDelegates = allClientDelegates.filter(
    (delegate) => !linkedDelegateIds.includes(delegate.id)
  )

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/bookings"
          className="text-sm text-slate-500 hover:text-slate-950"
        >
          ← Back to bookings
        </Link>

        <div className="mt-3 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Booking details
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
              {booking.course_name}
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              {getBookingClientDisplay()} · {getFormattedDate(booking.date)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!editing && (
              <button
                className={buttonPrimary}
                onClick={startEditing}
              >
                Edit booking
              </button>
            )}

            <span className={`border px-2.5 py-2 rounded-md text-xs font-medium ${getDeliveryTypeStyle(booking.course_delivery_type || 'private')}`}>
              {booking.course_delivery_type === 'public' ? 'Public course' : 'Private course'}
            </span>

            <span className={`border px-2.5 py-2 rounded-md text-xs font-medium ${getStatusStyle(displayStatus)}`}>
              {displayStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-8 ${panelClass}`}>
          <div className={`${panelHeaderClass} flex flex-col md:flex-row md:items-center md:justify-between gap-3`}>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Booking information
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Core session details and linked client information.
              </p>
            </div>

            {editing && (
              <div className="flex gap-2">
                <button
                  className={buttonSecondary}
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className={buttonPrimary}
                  onClick={saveBooking}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {!editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Course type</p>
                  <p className="font-medium text-slate-950 mt-1">
                    {booking.course_delivery_type === 'public' ? 'Public course' : 'Private course'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Client</p>

                  {client ? (
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="font-medium text-slate-950 mt-1 inline-block hover:underline"
                    >
                      {client.company || booking.client_name}
                    </Link>
                  ) : (
                    <p className="font-medium text-slate-950 mt-1">
                      {getBookingClientDisplay()}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-slate-500">Primary contact</p>
                  <p className="font-medium text-slate-950 mt-1">
                    {client?.name || 'Not set'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Course</p>
                  <p className="font-medium text-slate-950 mt-1">
                    {booking.course_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Trainer</p>
                  <p className="font-medium text-slate-950 mt-1">
                    {trainer?.name || 'Unassigned'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="font-medium text-slate-950 mt-1">
                    {getFormattedDateRange()}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Time</p>
                  <p className="font-medium text-slate-950 mt-1">
                    {getFormattedTimeRange(booking.start_time, booking.end_time)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-medium text-slate-950 mt-1">
                    {booking.location || 'Not set'}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Price</p>
                  <p className="font-medium text-slate-950 mt-1">
                    £{Number(booking.price || 0).toFixed(2)}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs text-slate-500">Certificate template</p>
                  <p className="font-medium text-slate-950 mt-1">
                    {selectedTemplate?.name || 'No template selected'}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {booking.certificate_template_id
                      ? 'Selected specifically for this booking.'
                      : 'Using course-specific/default fallback.'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="font-medium text-slate-950 mt-1 whitespace-pre-line">
                    {booking.notes || 'No notes'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-semibold">
                    Editing delivery details
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    This page is the control centre for course, date, trainer, template, location, price and notes. Delivery type and main client stay locked here to protect delegate, invoice and public-course links.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-md border border-blue-100 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {booking.course_delivery_type === 'public' ? 'Public course' : 'Private course'}
                    </span>

                    <span className="rounded-md border border-blue-100 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {getBookingClientDisplay()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select
                    className={`${inputClass} md:col-span-2`}
                    value={editCourseTemplateId}
                    onChange={(e) => applyCourseTemplate(e.target.value)}
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
                        {template.name}
                        {template.is_default ? ' · Default' : ''}
                        {template.course_template_id
                          ? ` · ${courseTemplates.find((course) => course.id === template.course_template_id)?.name || 'Course-specific'}`
                          : ' · Any course'}
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
                    list="booking-detail-location-suggestions"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                  />

                  <datalist id="booking-detail-location-suggestions">
                    {bookingLocations.map((suggestion) => (
                      <option key={suggestion} value={suggestion} />
                    ))}
                  </datalist>

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

                {editCourseTemplateId && (
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600 mt-4">
                    Course template applied. You can still edit the course name, price, certificate template or notes before saving.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`xl:col-span-4 ${panelClass} h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Actions
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Send emails or update booking status.
            </p>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <input
              className={inputClass}
              placeholder="Recipient email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />

            <button
              className={buttonSecondary}
              onClick={sendBookingConfirmation}
              disabled={sendingConfirmation}
            >
              {sendingConfirmation ? 'Sending...' : 'Send confirmation'}
            </button>

            <button
              className={buttonSecondary}
              onClick={sendBookingReminder}
              disabled={sendingReminder}
            >
              {sendingReminder ? 'Sending...' : 'Send reminder'}
            </button>

            <div className="border-t border-slate-100 pt-3 grid gap-2">
              {displayStatus !== 'scheduled' && (
                <button
                  className={buttonSecondary}
                  onClick={() => updateStatus('scheduled')}
                >
                  Mark scheduled
                </button>
              )}

              {displayStatus !== 'completed' && (
                <button
                  className={buttonSecondary}
                  onClick={() => updateStatus('completed')}
                >
                  Mark completed
                </button>
              )}

              {displayStatus !== 'cancelled' && (
                <button
                  className={buttonSecondary}
                  onClick={() => updateStatus('cancelled')}
                >
                  Cancel booking
                </button>
              )}

              <button
                className={buttonDanger}
                onClick={deleteBooking}
              >
                Delete booking
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`${panelClass} mt-4`}>
        <div className={`${panelHeaderClass} flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3`}>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Joining instructions
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Automatically sends 7 days before the course if not already sent.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/settings/joining-instructions"
              className={buttonSecondary}
            >
              Manage templates
            </Link>

            <button
              className={buttonPrimary}
              onClick={sendJoiningInstructions}
              disabled={sendingJoiningInstructions || delegates.length === 0}
            >
              {sendingJoiningInstructions ? 'Sending...' : 'Send joining instructions'}
            </button>
          </div>
        </div>

        <div className="p-4 grid gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <select
              className={`${inputClass} lg:col-span-2`}
              value={joiningInstructionTemplateId}
              onChange={(event) => applyJoiningInstructionTemplate(event.target.value)}
            >
              <option value="">Use default joining instruction template</option>

              {joiningInstructionTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.is_default ? ' - Default' : ''}
                </option>
              ))}
            </select>

            <button
              className={buttonSecondary}
              onClick={saveJoiningInstructions}
              disabled={savingJoiningInstructions}
            >
              {savingJoiningInstructions ? 'Saving...' : 'Save instructions'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-950">
                Template
              </p>

              <p className="mt-1">
                {joiningInstructionDraft.template?.name || 'Default joining instructions'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-950">
                Last sent
              </p>

              <p className="mt-1">
                {booking.joining_instructions_sent_at
                  ? new Date(booking.joining_instructions_sent_at).toLocaleString()
                  : 'Not sent yet'}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-950">
                Recipients
              </p>

              <p className="mt-1">
                {delegates.filter((delegate) => delegate.email).length} with email,
                {' '}
                {delegates.filter((delegate) => !delegate.email).length} without email
              </p>
            </div>
          </div>

          {joiningInstructionMessage && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
              {joiningInstructionMessage}
            </div>
          )}

          <input
            className={inputClass}
            placeholder="Email subject"
            value={joiningInstructionSubjectValue}
            onChange={(event) => setJoiningInstructionSubject(event.target.value)}
          />

          <textarea
            className={`${inputClass} min-h-72`}
            placeholder="Joining instruction body"
            value={joiningInstructionBodyValue}
            onChange={(event) => setJoiningInstructionBody(event.target.value)}
          />

          <p className="text-xs text-slate-500">
            Placeholders such as {'{{delegate_name}}'}, {'{{course_name}}'}, {'{{booking_date}}'} and {'{{booking_location}}'} are replaced for each delegate.
          </p>
        </div>
      </div>

      <div className={`${panelClass} mt-4`}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Certificate template for this booking
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Choose a certificate template just for this booking. If left automatic, Hercules OS will use the matching course template or default template.
          </p>
        </div>

        <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-3">
          <select
            className={`${inputClass} lg:col-span-3`}
            value={editCertificateTemplateId}
            onChange={(e) => setEditCertificateTemplateId(e.target.value)}
          >
            <option value="">Use automatic certificate template</option>

            {certificateTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.is_default ? ' · Default' : ''}
                {template.course_template_id
                  ? ` · ${courseTemplates.find((course) => course.id === template.course_template_id)?.name || 'Course-specific'}`
                  : ' · Any course'}
              </option>
            ))}
          </select>

          <button
            className={buttonPrimary}
            onClick={saveCertificateTemplateOnly}
            disabled={savingCertificateTemplate}
          >
            {savingCertificateTemplate ? 'Saving...' : 'Save template'}
          </button>

          <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Currently used for certificate creation
            </p>

            <p className="text-sm font-semibold text-slate-950 mt-2">
              {selectedTemplate?.name || 'No template found'}
            </p>

            <p className="text-xs text-slate-500 mt-1">
              {booking.certificate_template_id
                ? 'This template has been manually selected for this booking.'
                : 'This is being chosen automatically from course-specific/default templates.'}
            </p>
          </div>
        </div>
      </div>

      <div className={`${panelClass} mt-4`}>
        <div className={`${panelHeaderClass} flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3`}>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Delegates
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              {isPublicBooking()
                ? 'People attending this public course. Delegates can come from multiple clients.'
                : 'People attending this private client training session.'}
            </p>
          </div>

          <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 w-fit">
            {delegates.length} delegates
          </span>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-950 mb-3">
                Attach existing delegate
              </h3>

              <div className="flex flex-col gap-3">
                <select
                  className={inputClass}
                  value={existingDelegateId}
                  onChange={(e) => setExistingDelegateId(e.target.value)}
                >
                  <option value="">Select existing delegate</option>

                  {availableDelegates.map((delegate) => (
                    <option key={delegate.id} value={delegate.id}>
                      {delegate.full_name}
                      {delegate.email ? ` - ${delegate.email}` : ''}
                      {isPublicBooking() ? ` - ${getDelegateClientDisplay(delegate)}` : ''}
                    </option>
                  ))}
                </select>

                <button
                  className={buttonPrimary}
                  onClick={attachExistingDelegate}
                >
                  Attach to booking
                </button>

                {availableDelegates.length === 0 && (
                  <p className="text-xs text-slate-500">
                    {isPublicBooking()
                      ? 'No unattached delegates available.'
                      : 'No unattached delegates available for this client.'}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-950 mb-3">
                Create new delegate
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {isPublicBooking() && (
                  <select
                    className={`${inputClass} md:col-span-2`}
                    value={delegateClientId}
                    onChange={(e) => setDelegateClientId(e.target.value)}
                  >
                    <option value="">No client / individual learner</option>

                    {clients.map((clientItem) => (
                      <option key={clientItem.id} value={clientItem.id}>
                        {clientItem.company} - {clientItem.name}
                      </option>
                    ))}
                  </select>
                )}

                <input
                  className={inputClass}
                  placeholder="Delegate full name"
                  value={delegateName}
                  onChange={(e) => setDelegateName(e.target.value)}
                />

                <input
                  className={inputClass}
                  placeholder="Email optional"
                  value={delegateEmail}
                  onChange={(e) => setDelegateEmail(e.target.value)}
                />

                <input
                  className={inputClass}
                  placeholder="Phone optional"
                  value={delegatePhone}
                  onChange={(e) => setDelegatePhone(e.target.value)}
                />

                <button
                  className={buttonPrimary}
                  onClick={createDelegateAndAttach}
                >
                  Create & attach
                </button>

                <textarea
                  className={`${inputClass} md:col-span-2 min-h-20`}
                  placeholder="Delegate notes optional"
                  value={delegateNotes}
                  onChange={(e) => setDelegateNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-950">
                    Attendance & Results
                  </h3>

                  <span className={`border px-2.5 py-1 rounded-md text-xs font-medium ${registerStatusClass[registerStatus]}`}>
                    {registerStatusCopy[registerStatus]}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1">
                  Present and passed delegates are eligible for certificates.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {registerMessage && (
                  <span className="text-xs text-slate-500">
                    {registerMessage}
                  </span>
                )}

                <button
                  className={buttonPrimary}
                  onClick={saveRegister}
                  disabled={savingRegister}
                >
                  {savingRegister ? 'Saving...' : 'Save register'}
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {delegates.map((delegate) => {
                const eligible = isCertificateEligible(delegate)
                const certificate = getCertificateForDelegate(delegate)

                return (
                  <div
                    key={`register-${delegate.id}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">
                            {delegate.full_name}
                          </p>

                          {eligible ? (
                            <span className="border bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-1 rounded-md text-xs font-medium">
                              Certificate eligible
                            </span>
                          ) : (
                            <span className="border bg-slate-100 text-slate-600 border-slate-200 px-2 py-1 rounded-md text-xs font-medium">
                              Not eligible
                            </span>
                          )}

                          {certificate && (
                            <span className="border bg-blue-50 text-blue-700 border-blue-100 px-2 py-1 rounded-md text-xs font-medium">
                              Certificate created
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                          {isPublicBooking() ? getDelegateClientDisplay(delegate) : delegate.email || 'No email'}
                        </p>
                      </div>

                      <div className="grid gap-3 xl:min-w-[620px]">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1.5">
                              Attendance
                            </p>

                            <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
                              {[
                                ['not_marked', 'Not marked'],
                                ['present', 'Present'],
                                ['absent', 'Absent'],
                              ].map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    updateDelegateRegisterField(
                                      delegate.id,
                                      'attendance_status',
                                      value
                                    )
                                  }
                                  className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
                                    delegate.attendance_status === value
                                      ? 'bg-slate-950 text-white'
                                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-500 mb-1.5">
                              Result
                            </p>

                            <div className="inline-flex rounded-md border border-slate-200 bg-white p-1">
                              {[
                                ['not_assessed', 'Not assessed'],
                                ['passed', 'Passed'],
                                ['failed', 'Failed'],
                              ].map(([value, label]) => {
                                const disabled =
                                  delegate.attendance_status === 'absent' &&
                                  value === 'passed'

                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                      updateDelegateRegisterField(
                                        delegate.id,
                                        'result_status',
                                        value
                                      )
                                    }
                                    disabled={disabled}
                                    className={`rounded px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:text-slate-300 ${
                                      delegate.result_status === value
                                        ? 'bg-slate-950 text-white'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        <textarea
                          className={`${inputClass} min-h-16`}
                          placeholder="Optional note"
                          value={delegate.attendance_notes || ''}
                          onChange={(e) =>
                            updateDelegateRegisterField(
                              delegate.id,
                              'attendance_notes',
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {delegates.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  Attach delegates before marking attendance and results.
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Certificate actions
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  Select delegates below, then create or email their certificates.
                  Only present and passed delegates can receive new certificates.
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Template: <span className="font-medium text-slate-800">{selectedTemplate?.name || 'No template found'}</span>
                  {selectedTemplate?.validity_years !== undefined
                    ? ` · Validity: ${selectedTemplate.validity_years} year${Number(selectedTemplate.validity_years) === 1 ? '' : 's'}`
                    : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className={buttonSecondary}
                  onClick={selectAllDelegates}
                >
                  Select all
                </button>

                <button
                  className={buttonSecondary}
                  onClick={clearSelectedDelegates}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-950">
                    Bulk certificates
                  </h4>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Only delegates marked present and passed are eligible for certificates.
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {eligibleDelegates.length} eligible - {bulkGenerationSummary.delegatesToGenerate.length} ready to generate - {bulkEmailSummary.delegatesToEmail.length} ready to email
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className={buttonPrimary}
                    onClick={createCertificatesForEligibleDelegates}
                    disabled={creatingCertificates}
                  >
                    {creatingCertificates
                      ? 'Generating...'
                      : 'Generate certificates for eligible delegates'}
                  </button>

                  <button
                    className={buttonSecondary}
                    onClick={sendCertificatesToEligibleDelegates}
                    disabled={sendingCertificates}
                  >
                    {sendingCertificates
                      ? 'Sending...'
                      : 'Email certificates to eligible delegates'}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-500">
                  Issue date
                </label>

                <input
                  className={`${inputClass} w-full mt-1`}
                  type="date"
                  value={certificateIssueDate}
                  onChange={(e) => {
                    setCertificateIssueDate(e.target.value)
                    setCertificateExpiryDate(getDefaultExpiryDate(e.target.value))
                  }}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">
                  Expiry date
                </label>

                <input
                  className={`${inputClass} w-full mt-1`}
                  type="date"
                  value={certificateExpiryDate}
                  onChange={(e) => setCertificateExpiryDate(e.target.value)}
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-md p-3 text-xs text-slate-600">
                <p className="font-medium text-slate-950">
                  {selectedDelegateIds.length} selected
                </p>

                <p>
                  {selectedWithCertificates.length} already certified
                </p>

                <p>
                  {selectedWithEmail.length} with email
                </p>

                <p>
                  {selectedEligibleDelegates.length} certificate eligible
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  className={buttonPrimary}
                  onClick={createCertificatesForSelectedDelegates}
                  disabled={creatingCertificates}
                >
                  {creatingCertificates ? 'Creating...' : 'Create certificates'}
                </button>

                <button
                  className={buttonSecondary}
                  onClick={sendCertificatesToSelectedDelegates}
                  disabled={sendingCertificates}
                >
                  {sendingCertificates ? 'Sending...' : 'Send certificates'}
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {delegates.map((delegate) => {
              const isEditingDelegate = editingDelegateId === delegate.id
              const certificate = getCertificateForDelegate(delegate)
              const isSelected = selectedDelegateIds.includes(delegate.id)

              return (
                <div
                  key={delegate.id}
                  className={isSelected ? 'bg-blue-50 p-4' : 'bg-white p-4'}
                >
                  {!isEditingDelegate ? (
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="flex gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDelegateSelection(delegate.id)}
                          className="mt-1"
                        />

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/delegates/${delegate.id}`}
                              className="text-sm font-semibold text-slate-950 hover:underline"
                            >
                              {delegate.full_name}
                            </Link>

                            {isPublicBooking() && (
                              <span className="border bg-purple-50 text-purple-700 border-purple-100 px-2 py-1 rounded-md text-xs font-medium">
                                {getDelegateClientDisplay(delegate)}
                              </span>
                            )}

                            {certificate ? (
                              <span className="border bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-1 rounded-md text-xs font-medium">
                                Certificate created
                              </span>
                            ) : (
                              <span className="border bg-amber-50 text-amber-700 border-amber-100 px-2 py-1 rounded-md text-xs font-medium">
                                No certificate
                              </span>
                            )}

                            {delegate.email ? (
                              <span className="border bg-blue-50 text-blue-700 border-blue-100 px-2 py-1 rounded-md text-xs font-medium">
                                Email set
                              </span>
                            ) : (
                              <span className="border bg-slate-50 text-slate-700 border-slate-200 px-2 py-1 rounded-md text-xs font-medium">
                                No email
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-600 mt-2 space-y-1">
                            <p>Email: {delegate.email || 'Not set'}</p>

                            {isPublicBooking() && (
                              <p>Client: {getDelegateClientDisplay(delegate)}</p>
                            )}

                            <p>Phone: {delegate.phone || 'Not set'}</p>

                            {certificate && (
                              <>
                                <p>
                                  Certificate No: {certificate.certificate_number}
                                </p>

                                {certificate.certificate_title && (
                                  <p>
                                    Template title: {certificate.certificate_title}
                                  </p>
                                )}
                              </>
                            )}

                            {delegate.notes && (
                              <p>Notes: {delegate.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {certificate && (
                          <>
                            <button
                              className={buttonSecondary}
                              onClick={() => downloadCertificatePDF(certificate, delegate)}
                            >
                              Download certificate
                            </button>

                            <Link
                              href={getCertificateRecordHref(certificate)}
                              className={buttonSecondary}
                            >
                              View certificate record
                            </Link>
                          </>
                        )}

                        <button
                          className={buttonSecondary}
                          onClick={() => startEditingDelegate(delegate)}
                        >
                          Edit
                        </button>

                        <button
                          className={buttonSecondary}
                          onClick={() => removeDelegateFromBooking(delegate.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          className={inputClass}
                          placeholder="Delegate full name"
                          value={editDelegateName}
                          onChange={(e) => setEditDelegateName(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          placeholder="Email"
                          value={editDelegateEmail}
                          onChange={(e) => setEditDelegateEmail(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          placeholder="Phone"
                          value={editDelegatePhone}
                          onChange={(e) => setEditDelegatePhone(e.target.value)}
                        />

                        <textarea
                          className={`${inputClass} min-h-20`}
                          placeholder="Notes"
                          value={editDelegateNotes}
                          onChange={(e) => setEditDelegateNotes(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          className={buttonPrimary}
                          onClick={() => saveDelegate(delegate.id)}
                        >
                          Save delegate
                        </button>

                        <button
                          className={buttonSecondary}
                          onClick={cancelEditingDelegate}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}

            {delegates.length === 0 && (
              <div className="bg-white p-4 text-sm text-slate-500">
                No delegates attached to this booking yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
        <div className={panelClass}>
          <div className={`${panelHeaderClass} flex items-center justify-between gap-3`}>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Invoices
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Invoices linked to this booking.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/invoices?bookingId=${booking.id}`}
                className={buttonPrimary}
              >
                Create invoice
              </Link>

              <Link
                href="/dashboard/invoices"
                className="text-xs font-medium text-slate-500 hover:text-slate-950"
              >
                Manage
              </Link>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {invoice.invoice_number || 'Invoice'}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Due: {getFormattedDate(invoice.due_date)}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-slate-950">
                    £{Number(invoice.total_amount || invoice.amount || 0).toFixed(2)}
                  </p>
                </div>

                <span className={`inline-flex border mt-3 px-2.5 py-1 rounded-md text-xs font-medium ${getInvoiceStatusStyle(invoice.status)}`}>
                  {invoice.status}
                </span>

                <div className="flex flex-wrap gap-2 mt-3">
                  <Link
                    href={`/dashboard/invoices?search=${encodeURIComponent(invoice.id)}`}
                    className={buttonSecondary}
                  >
                    View invoice
                  </Link>
                </div>
              </div>
            ))}

            {invoices.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                No invoices linked to this booking yet.
              </div>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className={`${panelHeaderClass} flex items-center justify-between`}>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Certificates
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Certificates issued from this booking.
              </p>
            </div>

            <Link
              href="/dashboard/certificates"
              className="text-xs font-medium text-slate-500 hover:text-slate-950"
            >
              Manage
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {certificates.map((certificate) => (
              <div
                key={certificate.id}
                className="p-4"
              >
                <p className="text-sm font-semibold text-slate-950">
                  {certificate.learner_name}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  {certificate.certificate_number}
                </p>

                {certificate.certificate_title && (
                  <p className="text-xs text-slate-600 mt-2">
                    {certificate.certificate_title}
                  </p>
                )}

                <p className="text-xs text-slate-600 mt-2">
                  Expires: {getFormattedDate(certificate.expiry_date)}
                </p>

                <span className={`inline-flex border mt-3 px-2.5 py-1 rounded-md text-xs font-medium ${getCertificateStatusStyle(getComputedCertificateStatus(certificate))}`}>
                  {getComputedCertificateStatus(certificate)}
                </span>

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    className={buttonSecondary}
                    onClick={() => downloadCertificatePDF(certificate)}
                  >
                    Download PDF
                  </button>

                  <Link
                    href={getCertificateRecordHref(certificate)}
                    className={buttonSecondary}
                  >
                    View record
                  </Link>
                </div>
              </div>
            ))}

            {certificates.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                No certificates linked to this booking yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
