'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function CertificatesPage() {
  const [profile, setProfile] = useState<any>(null)
  const [certificates, setCertificates] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [linkFilter, setLinkFilter] = useState('all')

  const load = async () => {
    const currentProfile = await getOrCreateAccount()

    setProfile(currentProfile)

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', currentProfile.organisation_id)
      .single()

    const { data: certificatesData, error: certificatesError } = await supabase
      .from('certificates')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .order('created_at', { ascending: false })

    if (certificatesError) {
      alert(certificatesError.message)
      setLoading(false)
      return
    }

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .order('date', { ascending: false })

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .order('company', { ascending: true })

    const { data: delegatesData } = await supabase
      .from('delegates')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .order('full_name', { ascending: true })

    setOrganisation(organisationData || null)
    setCertificates(certificatesData || [])
    setBookings(bookingsData || [])
    setClients(clientsData || [])
    setDelegates(delegatesData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const getDelegateForCertificate = (certificate: any) => {
    if (!certificate.delegate_id) return null

    return delegates.find((delegate) => delegate.id === certificate.delegate_id)
  }

  const getBookingForCertificate = (certificate: any) => {
    if (!certificate.booking_id) return null

    return bookings.find((booking) => booking.id === certificate.booking_id)
  }

  const getClientForCertificate = (certificate: any) => {
    const delegate = getDelegateForCertificate(certificate)

    if (delegate?.client_id) {
      return clients.find((client) => client.id === delegate.client_id)
    }

    const booking = getBookingForCertificate(certificate)

    if (booking?.client_id) {
      return clients.find((client) => client.id === booking.client_id)
    }

    return null
  }

  const updateCertificateStatus = async (
    certificateId: string,
    status: string
  ) => {
    const { error } = await supabase
      .from('certificates')
      .update({ status })
      .eq('id', certificateId)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const deleteCertificate = async (certificateId: string) => {
    const confirmDelete = confirm(
      'Are you sure you want to delete this certificate? This cannot be undone.'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', certificateId)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const sendCertificate = async (certificate: any) => {
    const delegate = getDelegateForCertificate(certificate)

    if (!delegate?.email) {
      alert('This certificate is not linked to a delegate with an email address.')
      return
    }

    const verificationUrl = certificate.verification_id
      ? `${window.location.origin}/verify/${certificate.verification_id}`
      : `${window.location.origin}/verify`

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

    const result = await response.json()

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Certificate email failed')
      return
    }

    alert('Certificate email sent')
  }

  const sendExpiryReminder = async (certificate: any) => {
    const delegate = getDelegateForCertificate(certificate)

    if (!delegate?.email) {
      alert('This certificate is not linked to a delegate with an email address.')
      return
    }

    const verificationUrl = certificate.verification_id
      ? `${window.location.origin}/verify/${certificate.verification_id}`
      : ''

    const response = await fetch('/api/send-expiry-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: delegate.email,
        learnerName: certificate.learner_name || delegate.full_name,
        courseName: certificate.course_name,
        expiryDate: certificate.expiry_date,
        certificateNumber: certificate.certificate_number,
        verificationUrl,
        businessName: organisation?.name || 'Hercules OS',
        businessEmail: organisation?.email || '',
        businessPhone: organisation?.phone || '',
        organisationId: profile.organisation_id,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      alert(result.error?.message || result.error || 'Expiry reminder failed')
      return
    }

    alert('Expiry reminder sent')
  }

  const generateCertificatePDF = async (certificate: any) => {
    const delegate = getDelegateForCertificate(certificate)
    const client = getClientForCertificate(certificate)

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    })

    const businessName = organisation?.name || 'Training Provider'
    const businessEmail = organisation?.email || ''
    const businessPhone = organisation?.phone || ''

    const learnerName =
      certificate.learner_name ||
      delegate?.full_name ||
      'Learner'

    const courseName =
      certificate.course_name ||
      'Training Course'

    const title =
      certificate.certificate_title ||
      'Certificate of Completion'

    const body =
      certificate.certificate_body ||
      `This is to certify that ${learnerName} has successfully completed ${courseName}.`

    const footer =
      certificate.certificate_footer ||
      'This certificate can be verified online using the certificate number.'

    const signatureName =
      certificate.signature_name ||
      businessName

    const signatureTitle =
      certificate.signature_title ||
      'Training Provider'

    const issueDate = certificate.issue_date || 'Not set'
    const expiryDate = certificate.expiry_date || 'Not set'
    const certificateNumber = certificate.certificate_number || 'Not set'

    const verificationUrl = certificate.verification_id
      ? `${window.location.origin}/verify/${certificate.verification_id}`
      : `${window.location.origin}/verify`

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

    const bodyLines = doc.splitTextToSize(body, 190)
    doc.text(bodyLines, 148.5, 119, { align: 'center' })

    doc.setFontSize(10)
    doc.setTextColor(55, 65, 81)

    if (client?.company) {
      doc.text(`Client: ${client.company}`, 45, 142)
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

    const footerLines = doc.splitTextToSize(footer, 210)
    doc.text(footerLines, 148.5, 186, { align: 'center' })

    if (businessEmail || businessPhone) {
      doc.setFontSize(8)
      doc.text(
        `${businessEmail}${businessEmail && businessPhone ? ' · ' : ''}${businessPhone}`,
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

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setLinkFilter('all')
  }

  const filteredCertificates = certificates.filter((certificate) => {
    const delegate = getDelegateForCertificate(certificate)
    const booking = getBookingForCertificate(certificate)
    const client = getClientForCertificate(certificate)

    const searchableText = `
      ${certificate.learner_name || ''}
      ${certificate.course_name || ''}
      ${certificate.certificate_number || ''}
      ${certificate.status || ''}
      ${certificate.certificate_title || ''}
      ${certificate.certificate_body || ''}
      ${delegate?.full_name || ''}
      ${delegate?.email || ''}
      ${client?.company || ''}
      ${client?.name || ''}
      ${booking?.course_name || ''}
      ${booking?.date || ''}
      ${booking?.location || ''}
    `.toLowerCase()

    const matchesSearch = searchableText.includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' || certificate.status === statusFilter

    const matchesLink =
      linkFilter === 'all' ||
      (linkFilter === 'linked' && certificate.delegate_id) ||
      (linkFilter === 'manual' && !certificate.delegate_id)

    return matchesSearch && matchesStatus && matchesLink
  })

  const validCertificates = certificates.filter(
    (certificate) => certificate.status === 'valid'
  )

  const expiredCertificates = certificates.filter(
    (certificate) => certificate.status === 'expired'
  )

  const revokedCertificates = certificates.filter(
    (certificate) => certificate.status === 'revoked'
  )

  const linkedCertificates = certificates.filter(
    (certificate) => certificate.delegate_id
  )

  const expiringSoonCertificates = certificates.filter((certificate) => {
    if (!certificate.expiry_date || certificate.status !== 'valid') return false

    const today = new Date()
    const expiryDate = new Date(certificate.expiry_date)

    const differenceInMilliseconds = expiryDate.getTime() - today.getTime()
    const differenceInDays =
      differenceInMilliseconds / (1000 * 60 * 60 * 24)

    return differenceInDays >= 0 && differenceInDays <= 90
  })

  const getStatusStyle = (status: string) => {
    if (status === 'revoked') return 'bg-red-100 text-red-700'
    if (status === 'expired') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  const getLinkStyle = (certificate: any) => {
    if (certificate.delegate_id) {
      return 'bg-blue-100 text-blue-700'
    }

    return 'bg-gray-200 text-gray-700'
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading certificates...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Certificates
        </h1>

        <p className="text-gray-500 mt-1">
          Manage learner certificates, download PDFs and send certificate emails
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Total</p>
          <h2 className="text-3xl font-bold mt-2">
            {certificates.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Valid</p>
          <h2 className="text-3xl font-bold mt-2">
            {validCertificates.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Expiring Soon</p>
          <h2 className="text-3xl font-bold mt-2">
            {expiringSoonCertificates.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Expired</p>
          <h2 className="text-3xl font-bold mt-2">
            {expiredCertificates.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Linked</p>
          <h2 className="text-3xl font-bold mt-2">
            {linkedCertificates.length}
          </h2>
        </div>
      </div>

      {revokedCertificates.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-8 text-red-800">
          You have {revokedCertificates.length} revoked certificate
          {revokedCertificates.length === 1 ? '' : 's'}.
        </div>
      )}

      <div className="bg-white border rounded-2xl p-5 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            className="border p-3 rounded-lg md:col-span-2"
            placeholder="Search by learner, delegate, client, course, certificate number..."
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
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>

          <select
            className="border p-3 rounded-lg"
            value={linkFilter}
            onChange={(e) => setLinkFilter(e.target.value)}
          >
            <option value="all">All Link Types</option>
            <option value="linked">Linked to Delegate</option>
            <option value="manual">Manual / Old Certificates</option>
          </select>

          <button
            className="border px-4 py-2 rounded-lg"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Showing {filteredCertificates.length} of {certificates.length} certificates
        </p>
      </div>

      <div className="grid gap-4">
        {filteredCertificates.map((certificate) => {
          const delegate = getDelegateForCertificate(certificate)
          const booking = getBookingForCertificate(certificate)
          const client = getClientForCertificate(certificate)

          return (
            <div
              key={certificate.id}
              className="bg-white border rounded-2xl p-5 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {certificate.learner_name || delegate?.full_name || 'Unnamed learner'}
                  </h2>

                  <p className="text-gray-500 mt-1">
                    {certificate.course_name || booking?.course_name || 'No course'}
                  </p>

                  <p className="text-sm text-gray-400 mt-1">
                    Certificate No: {certificate.certificate_number || 'Not set'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div
                    className={`px-3 py-1 rounded-full text-sm w-fit ${getStatusStyle(
                      certificate.status
                    )}`}
                  >
                    {certificate.status || 'valid'}
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-sm w-fit ${getLinkStyle(
                      certificate
                    )}`}
                  >
                    {certificate.delegate_id ? 'Linked delegate' : 'Manual / old'}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border rounded-xl p-4 mt-5">
                <p className="text-sm text-gray-500 mb-1">
                  Certificate wording
                </p>

                <h3 className="text-lg font-semibold">
                  {certificate.certificate_title || 'Certificate of Completion'}
                </h3>

                <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">
                  {certificate.certificate_body ||
                    `This is to certify that ${certificate.learner_name || 'the learner'} has successfully completed ${certificate.course_name || 'the course'}.`}
                </p>

                {certificate.certificate_footer && (
                  <p className="text-xs text-gray-500 mt-4">
                    {certificate.certificate_footer}
                  </p>
                )}

                {(certificate.signature_name || certificate.signature_title) && (
                  <p className="text-sm text-gray-600 mt-4">
                    Signature: {certificate.signature_name || 'Not set'}
                    {certificate.signature_title ? `, ${certificate.signature_title}` : ''}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5 text-sm text-gray-700">
                <div>
                  <p className="text-gray-500">Delegate</p>

                  {delegate ? (
                    <Link
                      href={`/dashboard/delegates/${delegate.id}`}
                      className="font-medium mt-1 inline-block hover:underline"
                    >
                      {delegate.full_name}
                    </Link>
                  ) : (
                    <p className="font-medium mt-1">
                      Not linked
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-gray-500">Client</p>

                  {client ? (
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="font-medium mt-1 inline-block hover:underline"
                    >
                      {client.company}
                    </Link>
                  ) : (
                    <p className="font-medium mt-1">
                      Not linked
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-gray-500">Booking</p>

                  {booking ? (
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className="font-medium mt-1 inline-block hover:underline"
                    >
                      {booking.date} - {booking.course_name}
                    </Link>
                  ) : (
                    <p className="font-medium mt-1">
                      Not linked
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-gray-500">Delegate email</p>
                  <p className="font-medium mt-1 break-all">
                    {delegate?.email || 'Not set'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Issue date</p>
                  <p className="font-medium mt-1">
                    {certificate.issue_date || 'Not set'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Expiry date</p>
                  <p className="font-medium mt-1">
                    {certificate.expiry_date || 'Not set'}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Verification ID</p>
                  <p className="font-medium mt-1 break-all">
                    {certificate.verification_id || 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  className="bg-black text-white px-4 py-2 rounded-lg"
                  onClick={() => generateCertificatePDF(certificate)}
                >
                  Download PDF
                </button>

                {delegate && (
                  <Link
                    href={`/dashboard/delegates/${delegate.id}`}
                    className="border px-4 py-2 rounded-lg"
                  >
                    View Delegate
                  </Link>
                )}

                {booking && (
                  <Link
                    href={`/dashboard/bookings/${booking.id}`}
                    className="border px-4 py-2 rounded-lg"
                  >
                    View Booking
                  </Link>
                )}

                {client && (
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="border px-4 py-2 rounded-lg"
                  >
                    View Client
                  </Link>
                )}

                {delegate?.email && (
                  <button
                    className="border px-4 py-2 rounded-lg"
                    onClick={() => sendCertificate(certificate)}
                  >
                    Send Certificate
                  </button>
                )}

                {delegate?.email && (
                  <button
                    className="border px-4 py-2 rounded-lg"
                    onClick={() => sendExpiryReminder(certificate)}
                  >
                    Send Expiry Reminder
                  </button>
                )}

                {certificate.status !== 'valid' && (
                  <button
                    className="border px-4 py-2 rounded-lg"
                    onClick={() =>
                      updateCertificateStatus(certificate.id, 'valid')
                    }
                  >
                    Mark Valid
                  </button>
                )}

                {certificate.status !== 'expired' && (
                  <button
                    className="border px-4 py-2 rounded-lg"
                    onClick={() =>
                      updateCertificateStatus(certificate.id, 'expired')
                    }
                  >
                    Mark Expired
                  </button>
                )}

                {certificate.status !== 'revoked' && (
                  <button
                    className="border px-4 py-2 rounded-lg"
                    onClick={() =>
                      updateCertificateStatus(certificate.id, 'revoked')
                    }
                  >
                    Revoke
                  </button>
                )}

                <button
                  className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
                  onClick={() => deleteCertificate(certificate.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}

        {filteredCertificates.length === 0 && (
          <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
            No certificates found.
          </div>
        )}
      </div>
    </div>
  )
}