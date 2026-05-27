'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [booking, setBooking] = useState<any>(null)
  const [client, setClient] = useState<any>(null)
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

  const [existingDelegateId, setExistingDelegateId] = useState('')
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

  const getCertificateTemplateFromLists = (
    bookingData: any,
    localCourseTemplates: any[],
    localCertificateTemplates: any[]
  ) => {
    if (!bookingData) return null

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

    const { data: allClientDelegatesData } = await supabase
      .from('delegates')
      .select('*')
      .eq('client_id', bookingData.client_id)
      .eq('organisation_id', currentProfile.organisation_id)
      .order('full_name', { ascending: true })

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

    setOrganisation(organisationData || null)
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
    setEditCourseName(bookingData.course_name || '')
    setEditDate(bookingData.date || '')
    setEditStartTime(bookingData.start_time || '')
    setEditEndTime(bookingData.end_time || '')
    setEditLocation(bookingData.location || '')
    setEditPrice(bookingData.price ? String(bookingData.price) : '')
    setEditNotes(bookingData.notes || '')
    setRecipientEmail(clientData?.email || '')

    if (!certificateIssueDate) {
      const issueDate = bookingData.date || getDateString(new Date())
      const selectedTemplate = getCertificateTemplateFromLists(
        bookingData,
        courseTemplatesData || [],
        certificateTemplatesData || []
      )

      const validityYears = Number(selectedTemplate?.validity_years ?? 3)

      setCertificateIssueDate(issueDate)
      setCertificateExpiryDate(addYearsToDate(issueDate, validityYears))
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

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

    const { data: delegateData, error: delegateError } = await supabase
      .from('delegates')
      .insert({
        organisation_id: profile.organisation_id,
        client_id: booking.client_id,
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
        client_id: booking.client_id,
        booking_id: booking.id,
        delegate_id: delegateData.id,
      })

    if (linkError) {
      alert(linkError.message)
      return
    }

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

    const { error } = await supabase
      .from('booking_delegates')
      .insert({
        organisation_id: profile.organisation_id,
        client_id: booking.client_id,
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
        issue_date: certificateIssueDate || '',
        expiry_date: certificateExpiryDate || '',
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

      const verificationUrl =
        `${window.location.origin}/verify/${certificate.verification_id}`

      const response = await fetch('/api/send-certificate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: delegate.email,
          learnerName: certificate.learner_name,
          courseName: certificate.course_name,
          issueDate: certificate.issue_date,
          expiryDate: certificate.expiry_date,
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

      <div className="bg-white border rounded-2xl p-6 shadow-sm mt-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-semibold">
              Delegates
            </h2>

            <p className="text-gray-500 mt-1">
              People attending this training session
            </p>
          </div>

          <div className="bg-gray-100 px-4 py-2 rounded-full text-sm text-gray-700 w-fit">
            {delegates.length} delegates
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-50 border rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-4">
              Attach Existing Delegate
            </h3>

            <div className="flex flex-col gap-3">
              <select
                className="border p-3 rounded-lg bg-white"
                value={existingDelegateId}
                onChange={(e) => setExistingDelegateId(e.target.value)}
              >
                <option value="">Select existing delegate</option>

                {availableDelegates.map((delegate) => (
                  <option key={delegate.id} value={delegate.id}>
                    {delegate.full_name}
                    {delegate.email ? ` - ${delegate.email}` : ''}
                  </option>
                ))}
              </select>

              <button
                className="bg-black text-white p-3 rounded-lg"
                onClick={attachExistingDelegate}
              >
                Attach to Booking
              </button>

              {availableDelegates.length === 0 && (
                <p className="text-sm text-gray-500">
                  No unattached delegates available for this client.
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-50 border rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-4">
              Create New Delegate
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border p-3 rounded-lg bg-white"
                placeholder="Delegate full name"
                value={delegateName}
                onChange={(e) => setDelegateName(e.target.value)}
              />

              <input
                className="border p-3 rounded-lg bg-white"
                placeholder="Email optional"
                value={delegateEmail}
                onChange={(e) => setDelegateEmail(e.target.value)}
              />

              <input
                className="border p-3 rounded-lg bg-white"
                placeholder="Phone optional"
                value={delegatePhone}
                onChange={(e) => setDelegatePhone(e.target.value)}
              />

              <button
                className="bg-black text-white p-3 rounded-lg"
                onClick={createDelegateAndAttach}
              >
                Create & Attach
              </button>

              <textarea
                className="border p-3 rounded-lg bg-white md:col-span-2"
                placeholder="Delegate notes optional"
                value={delegateNotes}
                onChange={(e) => setDelegateNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border rounded-2xl p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">
                Certificates for Selected Delegates
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                Select delegates below, then create or email their certificates.
              </p>

              <p className="text-sm text-gray-500 mt-2">
                Template: <span className="font-semibold">{selectedTemplate?.name || 'No template found'}</span>
                {selectedTemplate?.validity_years !== undefined
                  ? ` · Validity: ${selectedTemplate.validity_years} year${Number(selectedTemplate.validity_years) === 1 ? '' : 's'}`
                  : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="border px-4 py-2 rounded-lg bg-white"
                onClick={selectAllDelegates}
              >
                Select All
              </button>

              <button
                className="border px-4 py-2 rounded-lg bg-white"
                onClick={clearSelectedDelegates}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div>
              <label className="text-sm text-gray-600">
                Issue date
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1 bg-white"
                type="date"
                value={certificateIssueDate}
                onChange={(e) => {
                  setCertificateIssueDate(e.target.value)
                  setCertificateExpiryDate(getDefaultExpiryDate(e.target.value))
                }}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                Expiry date
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1 bg-white"
                type="date"
                value={certificateExpiryDate}
                onChange={(e) => setCertificateExpiryDate(e.target.value)}
              />
            </div>

            <div className="bg-white border rounded-xl p-3 text-sm text-gray-600">
              <p className="font-medium text-gray-900">
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
                className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                onClick={createCertificatesForSelectedDelegates}
                disabled={creatingCertificates}
              >
                {creatingCertificates ? 'Creating...' : 'Create Certificates'}
              </button>

              <button
                className="border px-4 py-2 rounded-lg bg-white disabled:bg-gray-100"
                onClick={sendCertificatesToSelectedDelegates}
                disabled={sendingCertificates}
              >
                {sendingCertificates ? 'Sending...' : 'Send Certificates'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {delegates.map((delegate) => {
            const isEditingDelegate = editingDelegateId === delegate.id
            const certificate = getCertificateForDelegate(delegate)
            const isSelected = selectedDelegateIds.includes(delegate.id)

            return (
              <div
                key={delegate.id}
                className={`border rounded-xl p-4 ${
                  isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                }`}
              >
                {!isEditingDelegate ? (
                  <>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleDelegateSelection(delegate.id)}
                          className="mt-1"
                        />

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              href={`/dashboard/delegates/${delegate.id}`}
                              className="font-semibold hover:underline"
                            >
                              {delegate.full_name}
                            </Link>

                            {certificate ? (
                              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                                Certificate created
                              </div>
                            ) : (
                              <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs">
                                No certificate
                              </div>
                            )}

                            {delegate.email ? (
                              <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                                Email set
                              </div>
                            ) : (
                              <div className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs">
                                No email
                              </div>
                            )}
                          </div>

                          <div className="text-sm text-gray-600 mt-2 space-y-1">
                            <p>Email: {delegate.email || 'Not set'}</p>
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

                      <div className="flex flex-wrap gap-3">
                        <button
                          className="border px-4 py-2 rounded-lg bg-white"
                          onClick={() => startEditingDelegate(delegate)}
                        >
                          Edit
                        </button>

                        <button
                          className="border px-4 py-2 rounded-lg bg-white"
                          onClick={() => removeDelegateFromBooking(delegate.id)}
                        >
                          Remove from Booking
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        className="border p-3 rounded-lg"
                        placeholder="Delegate full name"
                        value={editDelegateName}
                        onChange={(e) => setEditDelegateName(e.target.value)}
                      />

                      <input
                        className="border p-3 rounded-lg"
                        placeholder="Email"
                        value={editDelegateEmail}
                        onChange={(e) => setEditDelegateEmail(e.target.value)}
                      />

                      <input
                        className="border p-3 rounded-lg"
                        placeholder="Phone"
                        value={editDelegatePhone}
                        onChange={(e) => setEditDelegatePhone(e.target.value)}
                      />

                      <textarea
                        className="border p-3 rounded-lg"
                        placeholder="Notes"
                        value={editDelegateNotes}
                        onChange={(e) => setEditDelegateNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        className="bg-black text-white px-4 py-2 rounded-lg"
                        onClick={() => saveDelegate(delegate.id)}
                      >
                        Save Delegate
                      </button>

                      <button
                        className="border px-4 py-2 rounded-lg bg-white"
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
            <div className="bg-gray-50 border rounded-xl p-4 text-gray-500">
              No delegates attached to this booking yet.
            </div>
          )}
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

                {certificate.certificate_title && (
                  <p className="text-sm text-gray-600 mt-2">
                    {certificate.certificate_title}
                  </p>
                )}

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