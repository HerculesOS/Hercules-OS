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

    doc.setLineWidth(1)
    doc.rect(10, 10, 277, 190)

    doc.setLineWidth(0.3)
    doc.rect(16, 16, 265, 178)

    doc.setFontSize(18)
    doc.text(businessName, 148.5, 30, { align: 'center' })

    doc.setFontSize(10)

    let contactLine = ''

    if (businessEmail) contactLine += businessEmail
    if (businessPhone) contactLine += contactLine ? ` | ${businessPhone}` : businessPhone
    if (businessWebsite) contactLine += contactLine ? ` | ${businessWebsite}` : businessWebsite

    if (contactLine) {
      doc.text(contactLine, 148.5, 38, { align: 'center' })
    }

    doc.setFontSize(30)
    doc.text('Certificate of Completion', 148.5, 60, { align: 'center' })

    doc.setFontSize(14)
    doc.text('This certifies that', 148.5, 78, { align: 'center' })

    doc.setFontSize(28)
    doc.text(certificate.learner_name, 148.5, 98, { align: 'center' })

    doc.setFontSize(14)
    doc.text('has successfully completed', 148.5, 115, { align: 'center' })

    doc.setFontSize(20)
    doc.text(certificate.course_name, 148.5, 132, { align: 'center' })

    doc.setFontSize(12)
    doc.text(`Issue Date: ${certificate.issue_date}`, 70, 155)
    doc.text(`Expiry Date: ${certificate.expiry_date}`, 70, 165)
    doc.text(`Certificate No: ${certificate.certificate_number}`, 70, 175)

    doc.addImage(qrDataUrl, 'PNG', 220, 145, 35, 35)

    doc.setFontSize(9)
    doc.text('Scan to verify', 237.5, 184, { align: 'center' })

    doc.setFontSize(8)

    if (businessAddress) {
      const addressLines = doc.splitTextToSize(businessAddress, 180)
      doc.text(addressLines, 148.5, 188, { align: 'center' })
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

  const expiringSoon = certificates.filter((certificate) => {
    const expiry = new Date(certificate.expiry_date)
    const today = new Date()
    const diff = expiry.getTime() - today.getTime()
    const days = diff / (1000 * 60 * 60 * 24)

    return days <= 60 && days >= 0 && certificate.status === 'valid'
  })

  const validCertificates = certificates.filter(
    (certificate) => certificate.status === 'valid'
  )

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
          Issue, download, email and verify learner certificates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          {certificates.map((certificate) => {
            const savedClientEmail = getClientEmailForCertificate(certificate)

            return (
              <div
                key={certificate.id}
                className="bg-white border rounded-2xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {certificate.learner_name}
                    </h2>

                    <p className="text-gray-500 mt-1">
                      {certificate.course_name}
                    </p>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-sm ${getStatusStyle(
                      certificate.status
                    )}`}
                  >
                    {certificate.status}
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600 space-y-1">
                  <p>Certificate No: {certificate.certificate_number}</p>
                  <p>Issued: {certificate.issue_date}</p>
                  <p>Expires: {certificate.expiry_date}</p>

                  {savedClientEmail && (
                    <p>Client Email: {savedClientEmail}</p>
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

                    {certificate.status !== 'revoked' && (
                      <button
                        className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
                        onClick={() => revokeCertificate(certificate.id)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {certificates.length === 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
              No certificates yet. Complete a booking first, then issue a certificate.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}