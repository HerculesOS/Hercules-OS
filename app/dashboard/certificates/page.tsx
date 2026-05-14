'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([])
  const [completedBookings, setCompletedBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')

  const [bookingId, setBookingId] = useState('')
  const [learnerName, setLearnerName] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  const [recipientEmails, setRecipientEmails] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState('')
  const [expirySendingId, setExpirySendingId] = useState('')

  const [editingId, setEditingId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [editBookingId, setEditBookingId] = useState('')
  const [editLearnerName, setEditLearnerName] = useState('')
  const [editIssueDate, setEditIssueDate] = useState('')
  const [editExpiryDate, setEditExpiryDate] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expiryFilter, setExpiryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

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

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .eq('status', 'completed')
      .order('date', { ascending: false })

    const { data: certificatesData } = await supabase
      .from('certificates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

    setOrganisation(organisationData || null)
    setClients(clientsData || [])
    setCompletedBookings(bookingsData || [])
    setCertificates(certificatesData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const addCertificate = async () => {
    if (!bookingId || !learnerName || !issueDate || !expiryDate) {
      alert('All certificate fields are required')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const selectedBooking = completedBookings.find(
      (b) => b.id === bookingId
    )

    if (!selectedBooking) {
      alert('Please select a completed booking.')
      return
    }

    const certificateNumber = `CERT-${String(certificates.length + 1).padStart(5, '0')}`

    const { error } = await supabase.from('certificates').insert({
      user_id: userData.user?.id,
      organisation_id: organisationId,
      booking_id: bookingId,
      learner_name: learnerName,
      course_name: selectedBooking.course_name,
      issue_date: issueDate,
      expiry_date: expiryDate,
      certificate_number: certificateNumber,
      status: 'valid',
    })

    if (error) {
      alert(error.message)
      return
    }

    setBookingId('')
    setLearnerName('')
    setIssueDate('')
    setExpiryDate('')

    load()
  }

  const startEditing = (certificate: any) => {
    if (certificate.status === 'revoked') {
      alert('Revoked certificates cannot be edited.')
      return
    }

    setEditingId(certificate.id)
    setEditBookingId(certificate.booking_id || '')
    setEditLearnerName(certificate.learner_name || '')
    setEditIssueDate(certificate.issue_date || '')
    setEditExpiryDate(certificate.expiry_date || '')
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditBookingId('')
    setEditLearnerName('')
    setEditIssueDate('')
    setEditExpiryDate('')
  }

  const saveCertificateEdit = async (certificateId: string) => {
    const certificateToEdit = certificates.find(
      (certificate) => certificate.id === certificateId
    )

    if (certificateToEdit?.status === 'revoked') {
      alert('Revoked certificates cannot be edited.')
      cancelEditing()
      return
    }

    if (!editBookingId || !editLearnerName || !editIssueDate || !editExpiryDate) {
      alert('All certificate fields are required')
      return
    }

    setSavingEdit(true)

    const selectedBooking = completedBookings.find(
      (booking) => booking.id === editBookingId
    )

    if (!selectedBooking) {
      setSavingEdit(false)
      alert('Please select a completed booking.')
      return
    }

    const { error } = await supabase
      .from('certificates')
      .update({
        booking_id: editBookingId,
        learner_name: editLearnerName,
        course_name: selectedBooking.course_name,
        issue_date: editIssueDate,
        expiry_date: editExpiryDate,
      })
      .eq('id', certificateId)

    setSavingEdit(false)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    load()
  }

  const revokeCertificate = async (certificateId: string) => {
    const confirmRevoke = confirm(
      'Are you sure you want to revoke this certificate?'
    )

    if (!confirmRevoke) return

    const { error } = await supabase
      .from('certificates')
      .update({ status: 'revoked' })
      .eq('id', certificateId)

    if (error) {
      alert(error.message)
      return
    }

    if (editingId === certificateId) {
      cancelEditing()
    }

    load()
  }

  const getBookingForCertificate = (certificate: any) => {
    return completedBookings.find(
      (booking) => booking.id === certificate.booking_id
    )
  }

  const getClientEmailForCertificate = (certificate: any) => {
    const booking = getBookingForCertificate(certificate)

    if (!booking) return ''

    const client = clients.find((c) => c.id === booking.client_id)

    return client?.email || ''
  }

  const getDaysUntilExpiry = (expiryDateValue: string) => {
    const expiry = new Date(expiryDateValue)
    const today = new Date()

    expiry.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const diff = expiry.getTime() - today.getTime()

    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const isExpiringSoon = (certificate: any) => {
    const days = getDaysUntilExpiry(certificate.expiry_date)

    return (
      days <= 60 &&
      days >= 0 &&
      certificate.status === 'valid'
    )
  }

  const isExpired = (certificate: any) => {
    return (
      getDaysUntilExpiry(certificate.expiry_date) < 0 &&
      certificate.status === 'valid'
    )
  }

const generatePDF = async (certificate: any) => {
  const doc = new jsPDF('landscape', 'mm', 'a4')

  const businessName = organisation?.name || 'Training Provider'
  const businessEmail = organisation?.email || ''
  const businessPhone = organisation?.phone || ''
  const businessWebsite = organisation?.website || ''
  const businessAddress = organisation?.address || ''

  const verificationUrl =
    `${window.location.origin}/verify/${certificate.verification_id}`

  const qrDataUrl = await QRCode.toDataURL(verificationUrl)

  // Background
  doc.setFillColor(250, 250, 250)
  doc.rect(0, 0, 297, 210, 'F')

  // Main white certificate panel
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(17, 24, 39)
  doc.setLineWidth(1.2)
  doc.roundedRect(12, 12, 273, 186, 3, 3, 'FD')

  // Inner border
  doc.setDrawColor(209, 213, 219)
  doc.setLineWidth(0.4)
  doc.roundedRect(20, 20, 257, 170, 2, 2, 'D')

  // Provider name
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(18)
  doc.text(businessName, 148.5, 35, { align: 'center' })

  let contactLine = ''

  if (businessEmail) contactLine += businessEmail
  if (businessPhone) contactLine += contactLine ? ` | ${businessPhone}` : businessPhone
  if (businessWebsite) contactLine += contactLine ? ` | ${businessWebsite}` : businessWebsite

  if (contactLine) {
    doc.setFontSize(9)
    doc.setTextColor(107, 114, 128)
    doc.text(contactLine, 148.5, 43, { align: 'center' })
  }

  // Title
  doc.setTextColor(17, 24, 39)
  doc.setFontSize(30)
  doc.text('Certificate of Completion', 148.5, 65, { align: 'center' })

  doc.setFontSize(12)
  doc.setTextColor(107, 114, 128)
  doc.text('This certifies that', 148.5, 80, { align: 'center' })

  // Learner name
  doc.setFontSize(28)
  doc.setTextColor(17, 24, 39)

  const learnerLines = doc.splitTextToSize(certificate.learner_name, 210)
  doc.text(learnerLines, 148.5, 98, { align: 'center' })

  // Divider
  doc.setDrawColor(17, 24, 39)
  doc.setLineWidth(0.4)
  doc.line(75, 108, 222, 108)

  // Course
  doc.setFontSize(12)
  doc.setTextColor(107, 114, 128)
  doc.text('has successfully completed', 148.5, 122, { align: 'center' })

  doc.setFontSize(20)
  doc.setTextColor(17, 24, 39)

  const courseLines = doc.splitTextToSize(certificate.course_name, 210)
  doc.text(courseLines, 148.5, 137, { align: 'center' })

  // Details box - left
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(35, 155, 115, 28, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setTextColor(107, 114, 128)
  doc.text('CERTIFICATE DETAILS', 42, 163)

  doc.setFontSize(10)
  doc.setTextColor(17, 24, 39)
  doc.text(`Certificate No: ${certificate.certificate_number}`, 42, 170)
  doc.text(`Issue Date: ${certificate.issue_date}`, 42, 176)
  doc.text(`Expiry Date: ${certificate.expiry_date}`, 42, 182)

  // Signature area - centre/right
  doc.setDrawColor(156, 163, 175)
  doc.line(165, 171, 225, 171)

  doc.setFontSize(9)
  doc.setTextColor(75, 85, 99)
  doc.text('Authorised Training Provider', 195, 178, { align: 'center' })

  // QR box - far right
  doc.setFillColor(249, 250, 251)
  doc.setDrawColor(229, 231, 235)
  doc.roundedRect(235, 150, 34, 38, 3, 3, 'FD')

  doc.addImage(qrDataUrl, 'PNG', 241, 154, 22, 22)

  doc.setFontSize(7)
  doc.setTextColor(75, 85, 99)
  doc.text('Scan to verify', 252, 180, { align: 'center' })

  doc.setFontSize(6)
  doc.setTextColor(107, 114, 128)
  doc.text('Hercules OS', 252, 185, { align: 'center' })

  // Footer address
  if (businessAddress) {
    doc.setFontSize(7)
    doc.setTextColor(107, 114, 128)

    const addressLines = doc.splitTextToSize(businessAddress, 220)
    doc.text(addressLines, 148.5, 193, { align: 'center' })
  }

  doc.save(`${certificate.learner_name}-certificate.pdf`)
}

  const sendCertificateEmail = async (certificate: any) => {
    const savedClientEmail = getClientEmailForCertificate(certificate)

    const recipientEmail =
      recipientEmails[certificate.id] || savedClientEmail

    if (!recipientEmail) {
      alert('Enter a recipient email first')
      return
    }

    setSendingId(certificate.id)

    const verificationUrl =
      `${window.location.origin}/verify/${certificate.verification_id}`

    const response = await fetch('/api/send-certificate-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
        learnerName: certificate.learner_name,
        courseName: certificate.course_name,
        issueDate: certificate.issue_date,
        expiryDate: certificate.expiry_date,
        certificateNumber: certificate.certificate_number,
        verificationUrl,
        businessName: organisation?.name || 'Hercules OS',
      }),
    })

    const result = await response.json()

    setSendingId('')

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Email failed')
      return
    }

    alert('Certificate email sent')

    setRecipientEmails((previous) => ({
      ...previous,
      [certificate.id]: '',
    }))
  }

  const sendExpiryReminder = async (certificate: any) => {
    const savedClientEmail = getClientEmailForCertificate(certificate)

    const recipientEmail =
      recipientEmails[certificate.id] || savedClientEmail

    if (!recipientEmail) {
      alert('Enter a recipient email first')
      return
    }

    setExpirySendingId(certificate.id)

    const verificationUrl =
      `${window.location.origin}/verify/${certificate.verification_id}`

    const response = await fetch('/api/send-expiry-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipientEmail,
        learnerName: certificate.learner_name,
        courseName: certificate.course_name,
        expiryDate: certificate.expiry_date,
        certificateNumber: certificate.certificate_number,
        verificationUrl,
        businessName: organisation?.name || 'Hercules OS',
        businessEmail: organisation?.email || '',
        businessPhone: organisation?.phone || '',
      }),
    })

    const result = await response.json()

    setExpirySendingId('')

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Expiry reminder failed')
      return
    }

    alert('Expiry reminder sent')

    setRecipientEmails((previous) => ({
      ...previous,
      [certificate.id]: '',
    }))
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setExpiryFilter('all')
    setSortBy('newest')
  }

  const expiringSoon = certificates.filter((certificate) =>
    isExpiringSoon(certificate)
  )

  const expiredCertificates = certificates.filter((certificate) =>
    isExpired(certificate)
  )

  const validCertificates = certificates.filter(
    (certificate) => certificate.status === 'valid'
  )

  const revokedCertificates = certificates.filter(
    (certificate) => certificate.status === 'revoked'
  )

  const filteredCertificates = certificates
    .filter((certificate) => {
      const searchableText = `
        ${certificate.learner_name || ''}
        ${certificate.course_name || ''}
        ${certificate.certificate_number || ''}
        ${certificate.status || ''}
      `.toLowerCase()

      const matchesSearch = searchableText.includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' || certificate.status === statusFilter

      const matchesExpiry =
        expiryFilter === 'all' ||
        (expiryFilter === 'expiring' && isExpiringSoon(certificate)) ||
        (expiryFilter === 'expired' && isExpired(certificate)) ||
        (expiryFilter === 'not_expiring' &&
          !isExpiringSoon(certificate) &&
          !isExpired(certificate))

      return matchesSearch && matchesStatus && matchesExpiry
    })
    .sort((a, b) => {
      const createdA = new Date(a.created_at).getTime()
      const createdB = new Date(b.created_at).getTime()

      const expiryA = new Date(a.expiry_date).getTime()
      const expiryB = new Date(b.expiry_date).getTime()

      if (sortBy === 'oldest') return createdA - createdB
      if (sortBy === 'expiry_soonest') return expiryA - expiryB
      if (sortBy === 'expiry_latest') return expiryB - expiryA

      return createdB - createdA
    })

  const getStatusStyle = (status: string) => {
    if (status === 'revoked') {
      return 'bg-red-100 text-red-700'
    }

    if (status === 'expired') {
      return 'bg-yellow-100 text-yellow-700'
    }

    return 'bg-green-100 text-green-700'
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Certificates
        </h1>

        <p className="text-gray-500 mt-1">
          Issue, edit, filter, download, email, verify and renew learner certificates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Total Certificates</p>
          <h2 className="text-3xl font-bold mt-2">{certificates.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Valid Certificates</p>
          <h2 className="text-3xl font-bold mt-2">{validCertificates.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Expiring Soon</p>
          <h2 className="text-3xl font-bold mt-2">{expiringSoon.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Revoked</p>
          <h2 className="text-3xl font-bold mt-2">{revokedCertificates.length}</h2>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="border p-3 rounded-lg md:col-span-2"
            placeholder="Search certificates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border p-3 rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="valid">Valid</option>
            <option value="revoked">Revoked</option>
          </select>

          <select
            className="border p-3 rounded-lg"
            value={expiryFilter}
            onChange={(e) => setExpiryFilter(e.target.value)}
          >
            <option value="all">All Expiry</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="not_expiring">Not Expiring Soon</option>
          </select>

          <select
            className="border p-3 rounded-lg"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="expiry_soonest">Expiry Soonest</option>
            <option value="expiry_latest">Expiry Latest</option>
          </select>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
          <p className="text-sm text-gray-500">
            Showing {filteredCertificates.length} of {certificates.length} certificates · {expiredCertificates.length} already expired
          </p>

          <button
            className="border px-4 py-2 rounded-lg text-sm w-fit"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Create Certificate
          </h2>

          {completedBookings.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl mb-4 text-sm">
              No completed bookings available. Mark a booking as completed before issuing a certificate.
            </div>
          )}

          <div className="flex flex-col gap-3">
            <select
              className="border p-3 rounded-lg"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            >
              <option value="">Select Completed Booking</option>

              {completedBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {booking.client_name} - {booking.course_name}
                </option>
              ))}
            </select>

            <input
              className="border p-3 rounded-lg"
              placeholder="Learner name"
              value={learnerName}
              onChange={(e) => setLearnerName(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />

            <button
              className="bg-black text-white p-3 rounded-lg disabled:bg-gray-300"
              onClick={addCertificate}
              disabled={completedBookings.length === 0}
            >
              Create Certificate
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 grid gap-4">
          {filteredCertificates.map((certificate) => {
            const savedClientEmail = getClientEmailForCertificate(certificate)
            const daysUntilExpiry = getDaysUntilExpiry(certificate.expiry_date)
            const expiring = isExpiringSoon(certificate)
            const expired = isExpired(certificate)
            const isEditing = editingId === certificate.id
            const isRevoked = certificate.status === 'revoked'

            return (
              <div
                key={certificate.id}
                className="bg-white border rounded-2xl p-5 shadow-sm"
              >
                {!isEditing ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {certificate.learner_name}
                        </h2>

                        <p className="text-gray-500 mt-1">
                          {certificate.course_name}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div
                          className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                            certificate.status
                          )}`}
                        >
                          {certificate.status}
                        </div>

                        {expiring && (
                          <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                            Expires in {daysUntilExpiry} days
                          </div>
                        )}

                        {expired && (
                          <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
                            Expired
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600 space-y-1">
                      <p>Certificate No: {certificate.certificate_number}</p>
                      <p>Issued: {certificate.issue_date}</p>
                      <p>Expires: {certificate.expiry_date}</p>

                      {savedClientEmail && (
                        <p>Client Email: {savedClientEmail}</p>
                      )}

                      {isRevoked && (
                        <p className="text-red-600">
                          This certificate has been revoked and cannot be edited.
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex flex-col gap-3">
                      <input
                        className="border p-3 rounded-lg"
                        placeholder={savedClientEmail || 'Recipient email'}
                        value={recipientEmails[certificate.id] || ''}
                        onChange={(e) =>
                          setRecipientEmails((previous) => ({
                            ...previous,
                            [certificate.id]: e.target.value,
                          }))
                        }
                      />

                      {savedClientEmail && (
                        <p className="text-sm text-gray-500">
                          Leave blank to send to saved client email.
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          className="bg-black text-white px-4 py-2 rounded-lg"
                          onClick={() => generatePDF(certificate)}
                        >
                          Download PDF
                        </button>

                        <button
                          className="border px-4 py-2 rounded-lg disabled:bg-gray-100"
                          onClick={() => sendCertificateEmail(certificate)}
                          disabled={sendingId === certificate.id}
                        >
                          {sendingId === certificate.id ? 'Sending...' : 'Send Email'}
                        </button>

                        {!isRevoked && (
                          <button
                            className="border px-4 py-2 rounded-lg"
                            onClick={() => startEditing(certificate)}
                          >
                            Edit
                          </button>
                        )}

                        {expiring && (
                          <button
                            className="border px-4 py-2 rounded-lg disabled:bg-gray-100"
                            onClick={() => sendExpiryReminder(certificate)}
                            disabled={expirySendingId === certificate.id}
                          >
                            {expirySendingId === certificate.id
                              ? 'Sending...'
                              : 'Send Expiry Reminder'}
                          </button>
                        )}

                        {!isRevoked && (
                          <button
                            className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
                            onClick={() => revokeCertificate(certificate.id)}
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-5">
                      <h2 className="text-xl font-semibold">
                        Edit Certificate
                      </h2>

                      <p className="text-gray-500 mt-1">
                        Update learner, course and certificate dates
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        className="border p-3 rounded-lg md:col-span-2"
                        value={editBookingId}
                        onChange={(e) => setEditBookingId(e.target.value)}
                      >
                        <option value="">Select Completed Booking</option>

                        {completedBookings.map((booking) => (
                          <option key={booking.id} value={booking.id}>
                            {booking.client_name} - {booking.course_name}
                          </option>
                        ))}
                      </select>

                      <input
                        className="border p-3 rounded-lg md:col-span-2"
                        placeholder="Learner name"
                        value={editLearnerName}
                        onChange={(e) => setEditLearnerName(e.target.value)}
                      />

                      <div>
                        <label className="text-sm text-gray-500">
                          Issue Date
                        </label>

                        <input
                          className="border p-3 rounded-lg w-full mt-1"
                          type="date"
                          value={editIssueDate}
                          onChange={(e) => setEditIssueDate(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-sm text-gray-500">
                          Expiry Date
                        </label>

                        <input
                          className="border p-3 rounded-lg w-full mt-1"
                          type="date"
                          value={editExpiryDate}
                          onChange={(e) => setEditExpiryDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 mt-4 text-sm text-gray-700">
                      <p>
                        Certificate number will stay the same.
                      </p>

                      <p className="mt-1">
                        Verification QR/link will continue to work.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-5">
                      <button
                        className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                        onClick={() => saveCertificateEdit(certificate.id)}
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

          {filteredCertificates.length === 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
              No certificates match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}