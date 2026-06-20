'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate } from '@/lib/formatters'
import { createCertificateVerificationId } from '@/lib/certificateVerification'
import { isLocalDateWithinNextDays } from '@/lib/dateRanges'

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
    const requestedSearch = new URLSearchParams(window.location.search).get('search')

    if (requestedSearch) {
      setSearch(requestedSearch)
    }

    load()
  }, [])

  const getFormattedDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return 'Not set'

    const dateOnly = String(dateValue).split('T')[0]

    return formatAppDate(dateOnly, organisation)
  }

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

  const sendCertificate = async (certificate: any) => {
    const delegate = getDelegateForCertificate(certificate)

    if (!delegate?.email) {
      alert('This certificate is not linked to a delegate with an email address.')
      return
    }

    let verificationId = ''

    try {
      verificationId = await ensureCertificateVerificationId(certificate)
    } catch (error: any) {
      alert(error.message || 'Could not prepare certificate verification link')
      return
    }

    const verificationUrl = `${window.location.origin}/verify/${verificationId}`

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

    let verificationUrl = ''

    try {
      const verificationId = await ensureCertificateVerificationId(certificate)
      verificationUrl = `${window.location.origin}/verify/${verificationId}`
    } catch {
      verificationUrl = ''
    }

    const response = await fetch('/api/send-expiry-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: delegate.email,
        learnerName: certificate.learner_name || delegate.full_name,
        courseName: certificate.course_name,
        expiryDate: getFormattedDate(certificate.expiry_date),
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

  const isCertificateExpiringSoon = (certificate: any) => {
    if (!certificate.expiry_date || certificate.status !== 'valid') return false

    return isLocalDateWithinNextDays(certificate.expiry_date, 90)
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
      ${certificate.issue_date || ''}
      ${certificate.expiry_date || ''}
      ${getFormattedDate(certificate.issue_date)}
      ${getFormattedDate(certificate.expiry_date)}
      ${delegate?.full_name || ''}
      ${delegate?.email || ''}
      ${client?.company || ''}
      ${client?.name || ''}
      ${booking?.course_name || ''}
      ${booking?.date || ''}
      ${booking ? getFormattedDate(booking.date) : ''}
      ${booking?.location || ''}
    `.toLowerCase()

    const matchesSearch = searchableText.includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      certificate.status === statusFilter ||
      (statusFilter === 'expiring_soon' && isCertificateExpiringSoon(certificate))

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
    return isCertificateExpiringSoon(certificate)
  })

  const getStatusStyle = (status: string) => {
    if (status === 'revoked') return 'bg-red-50 text-red-700 border-red-100'
    if (status === 'expired') return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  }

  const getLinkStyle = (certificate: any) => {
    if (certificate.delegate_id) {
      return 'bg-blue-50 text-blue-700 border-blue-100'
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

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading certificates...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <StatCard
          label="Total"
          value={certificates.length}
          detail="All certificates"
        />

        <StatCard
          label="Valid"
          value={validCertificates.length}
          detail="Current certificates"
        />

        <StatCard
          label="Expiring soon"
          value={expiringSoonCertificates.length}
          detail="Within 90 days"
        />

        <StatCard
          label="Expired"
          value={expiredCertificates.length}
          detail="Marked expired"
        />

        <StatCard
          label="Linked"
          value={linkedCertificates.length}
          detail="Connected to delegates"
        />
      </div>

      {revokedCertificates.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-800">
          You have {revokedCertificates.length} revoked certificate
          {revokedCertificates.length === 1 ? '' : 's'}.
        </div>
      )}

      <div className={`${panelClass} mb-4`}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Filters
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Search by learner, delegate, client, course or certificate number.
          </p>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              className={`${inputClass} md:col-span-2`}
              placeholder="Search certificates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="valid">Valid</option>
              <option value="expiring_soon">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>

            <button
              className={buttonSecondary}
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            Showing {filteredCertificates.length} of {certificates.length} certificates
          </p>
        </div>
      </div>

      <div className={panelClass}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Certificate list
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Download, email, verify and manage certificate records.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredCertificates.map((certificate) => {
            const delegate = getDelegateForCertificate(certificate)
            const booking = getBookingForCertificate(certificate)
            const client = getClientForCertificate(certificate)

            return (
              <div
                key={certificate.id}
                className="p-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-950">
                        {certificate.learner_name || delegate?.full_name || 'Unnamed learner'}
                      </h3>

                      <span
                        className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getStatusStyle(
                          certificate.status
                        )}`}
                      >
                        {certificate.status || 'valid'}
                      </span>

                      <span
                        className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getLinkStyle(
                          certificate
                        )}`}
                      >
                        {certificate.delegate_id ? 'Linked delegate' : 'Unlinked certificate'}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mt-1">
                      {certificate.course_name || booking?.course_name || 'No course'}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Certificate No: {certificate.certificate_number || 'Not set'}
                    </p>
                  </div>

                  <button
                    className={buttonPrimary}
                    onClick={() => generateCertificatePDF(certificate)}
                  >
                    Download PDF
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                    Certificate wording
                  </p>

                  <h4 className="text-sm font-semibold text-slate-950">
                    {certificate.certificate_title || 'Certificate of Completion'}
                  </h4>

                  <p className="text-xs text-slate-700 mt-2 whitespace-pre-line leading-5">
                    {certificate.certificate_body ||
                      `This is to certify that ${certificate.learner_name || 'the learner'} has successfully completed ${certificate.course_name || 'the course'}.`}
                  </p>

                  {certificate.certificate_footer && (
                    <p className="text-xs text-slate-500 mt-3">
                      {certificate.certificate_footer}
                    </p>
                  )}

                  {(certificate.signature_name || certificate.signature_title) && (
                    <p className="text-xs text-slate-600 mt-3">
                      Signature: {certificate.signature_name || 'Not set'}
                      {certificate.signature_title ? `, ${certificate.signature_title}` : ''}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4 text-xs text-slate-600">
                  <div>
                    <p className="text-slate-400">Delegate</p>

                    {delegate ? (
                      <Link
                        href={`/dashboard/delegates/${delegate.id}`}
                        className="font-medium text-slate-800 mt-1 inline-block hover:underline"
                      >
                        {delegate.full_name}
                      </Link>
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">
                        Not linked
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-slate-400">Client</p>

                    {client ? (
                      <Link
                        href={`/dashboard/clients/${client.id}`}
                        className="font-medium text-slate-800 mt-1 inline-block hover:underline"
                      >
                        {client.company}
                      </Link>
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">
                        Not linked
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-slate-400">Booking</p>

                    {booking ? (
                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className="font-medium text-slate-800 mt-1 inline-block hover:underline"
                      >
                        {getFormattedDate(booking.date)} - {booking.course_name}
                      </Link>
                    ) : (
                      <p className="font-medium text-slate-800 mt-1">
                        Not linked
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-slate-400">Delegate email</p>
                    <p className="font-medium text-slate-800 mt-1 break-all">
                      {delegate?.email || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Issue date</p>
                    <p className="font-medium text-slate-800 mt-1">
                      {getFormattedDate(certificate.issue_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Expiry date</p>
                    <p className="font-medium text-slate-800 mt-1">
                      {getFormattedDate(certificate.expiry_date)}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-slate-400">Verification ID</p>
                    <p className="font-medium text-slate-800 mt-1 break-all">
                      {certificate.verification_id || 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {delegate && (
                    <Link
                      href={`/dashboard/delegates/${delegate.id}`}
                      className={buttonSecondary}
                    >
                      View delegate
                    </Link>
                  )}

                  {booking && (
                    <Link
                      href={`/dashboard/bookings/${booking.id}`}
                      className={buttonSecondary}
                    >
                      View booking
                    </Link>
                  )}

                  {client && (
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className={buttonSecondary}
                    >
                      View client
                    </Link>
                  )}

                  {delegate?.email && (
                    <button
                      className={buttonSecondary}
                      onClick={() => sendCertificate(certificate)}
                    >
                      Send certificate
                    </button>
                  )}

                  {delegate?.email && (
                    <button
                      className={buttonSecondary}
                      onClick={() => sendExpiryReminder(certificate)}
                    >
                      Send expiry reminder
                    </button>
                  )}

                  {certificate.status !== 'valid' && (
                    <button
                      className={buttonSecondary}
                      onClick={() =>
                        updateCertificateStatus(certificate.id, 'valid')
                      }
                    >
                      Mark valid
                    </button>
                  )}

                  {certificate.status !== 'expired' && (
                    <button
                      className={buttonSecondary}
                      onClick={() =>
                        updateCertificateStatus(certificate.id, 'expired')
                      }
                    >
                      Mark expired
                    </button>
                  )}

                  {certificate.status !== 'revoked' && (
                    <button
                      className={buttonSecondary}
                      onClick={() =>
                        updateCertificateStatus(certificate.id, 'revoked')
                      }
                    >
                      Revoke
                    </button>
                  )}

                  <button
                    className={buttonDanger}
                    onClick={() => deleteCertificate(certificate.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}

          {filteredCertificates.length === 0 && (
            <div className="p-6">
              <p className="text-sm font-semibold text-slate-950">
                No certificates yet
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Create certificates from booking delegates to track expiry and verification.
              </p>

              <Link
                href="/dashboard/bookings"
                className={`${buttonSecondary} inline-block mt-4`}
              >
                Open bookings
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
