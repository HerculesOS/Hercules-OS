'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate, formatAppTimeRange } from '@/lib/formatters'
import { createCertificateVerificationId } from '@/lib/certificateVerification'

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
  const [organisation, setOrganisation] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [allClientDelegates, setAllClientDelegates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingCertificateTemplate, setSavingCertificateTemplate] = useState(false)
  const [sendingConfirmation, setSendingConfirmation] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)

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

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .order('company', { ascending: true })

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

    const delegateIds = (bookingLinksData || []).map((link) => link.delegate_id)

    let bookingDelegatesData: any[] = []

    if (delegateIds.length > 0) {
      const { data } = await supabase
        .from('delegates')
        .select('*')
        .in('id', delegateIds)
        .eq('organisation_id', currentProfile.organisation_id)
        .order('full_name', { ascending: true })

      bookingDelegatesData = data || []
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
    setInvoices(invoicesData || [])
    setCertificates(certificatesData || [])
    setAllClientDelegates(allClientDelegatesData || [])
    setDelegates(bookingDelegatesData)

    setEditTrainerId(bookingData.trainer_id || '')
    setEditCourseTemplateId('')
    setEditCertificateTemplateId(bookingData.certificate_template_id || '')
    setEditCourseName(bookingData.course_name || '')
    setEditDate(bookingData.date || '')
    setEditStartTime(bookingData.start_time || '')
    setEditEndTime(bookingData.end_time || '')
    setEditLocation(bookingData.location || '')
    setEditPrice(bookingData.price ? String(bookingData.price) : '')
    setEditNotes(bookingData.notes || '')
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
        certificate_template_id: editCertificateTemplateId || null,
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

  const createCertificatesForSelectedDelegates = async () => {
    if (selectedDelegateIds.length === 0) {
      alert('Select at least one delegate first')
      return
    }

    if (!certificateIssueDate || !certificateExpiryDate) {
      alert('Issue date and expiry date are required')
      return
    }

    const selectedDelegates = delegates.filter((delegate) =>
      selectedDelegateIds.includes(delegate.id)
    )

    const delegatesWithoutCertificates = selectedDelegates.filter(
      (delegate) => !getCertificateForDelegate(delegate)
    )

    if (delegatesWithoutCertificates.length === 0) {
      alert('All selected delegates already have certificates.')
      return
    }

    const selectedTemplate = getCertificateTemplateForBooking()

    if (!selectedTemplate) {
      alert('No certificate template found. Create a default certificate template in Settings first.')
      return
    }

    setCreatingCertificates(true)

    const { data: userData } = await supabase.auth.getUser()

    const rows = delegatesWithoutCertificates.map((delegate, index) => {
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
      return
    }

    alert(`Created ${rows.length} certificate${rows.length === 1 ? '' : 's'} using "${selectedTemplate.name}".`)
    load()
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

  const sendCertificatesToSelectedDelegates = async () => {
    if (selectedDelegateIds.length === 0) {
      alert('Select at least one delegate first')
      return
    }

    const selectedDelegates = delegates.filter((delegate) =>
      selectedDelegateIds.includes(delegate.id)
    )

    const sendableDelegates = selectedDelegates.filter((delegate) => {
      const certificate = getCertificateForDelegate(delegate)
      return certificate && delegate.email
    })

    if (sendableDelegates.length === 0) {
      alert('Selected delegates need both an email address and a certificate before sending.')
      return
    }

    setSendingCertificates(true)

    let sentCount = 0
    let failedCount = 0

    for (const delegate of sendableDelegates) {
      const certificate = getCertificateForDelegate(delegate)

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
      alert(`Sent ${sentCount}. Failed ${failedCount}.`)
      return
    }

    alert(`Certificate email sent to ${sentCount} delegate${sentCount === 1 ? '' : 's'}.`)
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

  const selectedDelegates = delegates.filter((delegate) =>
    selectedDelegateIds.includes(delegate.id)
  )

  const selectedWithCertificates = selectedDelegates.filter((delegate) =>
    getCertificateForDelegate(delegate)
  )

  const selectedWithEmail = selectedDelegates.filter((delegate) => delegate.email)

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

            <span className={`border px-2.5 py-2 rounded-md text-xs font-medium ${getStatusStyle(booking.status)}`}>
              {booking.status}
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
                    {getFormattedDate(booking.date)}
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
              {booking.status !== 'scheduled' && (
                <button
                  className={buttonSecondary}
                  onClick={() => updateStatus('scheduled')}
                >
                  Mark scheduled
                </button>
              )}

              {booking.status !== 'completed' && (
                <button
                  className={buttonSecondary}
                  onClick={() => updateStatus('completed')}
                >
                  Mark completed
                </button>
              )}

              {booking.status !== 'cancelled' && (
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

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Certificate actions
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  Select delegates below, then create or email their certificates.
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
          <div className={`${panelHeaderClass} flex items-center justify-between`}>
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Invoices
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Invoices linked to this booking.
              </p>
            </div>

            <Link
              href="/dashboard/invoices"
              className="text-xs font-medium text-slate-500 hover:text-slate-950"
            >
              Manage
            </Link>
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

                <span className={`inline-flex border mt-3 px-2.5 py-1 rounded-md text-xs font-medium ${getCertificateStatusStyle(certificate.status)}`}>
                  {certificate.status}
                </span>
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
