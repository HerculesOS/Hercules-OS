'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate } from '@/lib/formatters'
import { createCertificateVerificationId } from '@/lib/certificateVerification'
import { fetchPaginatedImportRecords } from '@/lib/importCsv'

const CERTIFICATES_PAGE_SIZE = 50

const cleanSearchTerm = (value: string) =>
  value.trim().replace(/[%_,]/g, ' ')

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default function CertificatesPage() {
  const [profile, setProfile] = useState<any>(null)
  const [certificates, setCertificates] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCertificates, setTotalCertificates] = useState(0)
  const [matchingCertificates, setMatchingCertificates] = useState(0)
  const [validCertificatesCount, setValidCertificatesCount] = useState(0)
  const [expiredCertificatesCount, setExpiredCertificatesCount] = useState(0)
  const [revokedCertificatesCount, setRevokedCertificatesCount] = useState(0)
  const [linkedCertificatesCount, setLinkedCertificatesCount] = useState(0)
  const [expiringSoonCertificatesCount, setExpiringSoonCertificatesCount] = useState(0)

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

  const getExpiryWindow = () => {
    const today = new Date()
    const endDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 90
    )

    return {
      today: toLocalDateInputValue(today),
      endDate: toLocalDateInputValue(endDate),
    }
  }

  const getMatchingRelatedIds = (
    searchTerm: string,
    localClients: any[],
    localDelegates: any[],
    localBookings: any[]
  ) => {
    const cleanTerm = cleanSearchTerm(searchTerm).toLowerCase()

    if (!cleanTerm) {
      return {
        bookingIds: [] as string[],
        clientIds: [] as string[],
        delegateIds: [] as string[],
      }
    }

    const clientIds = localClients
      .filter((client) =>
        `
          ${client.company || ''}
          ${client.name || ''}
          ${client.email || ''}
          ${client.phone || ''}
        `
          .toLowerCase()
          .includes(cleanTerm)
      )
      .map((client) => client.id)

    const delegateIds = localDelegates
      .filter((delegate) => {
        const matchesDelegate = `
          ${delegate.full_name || ''}
          ${delegate.email || ''}
          ${delegate.phone || ''}
        `
          .toLowerCase()
          .includes(cleanTerm)

        return matchesDelegate || clientIds.includes(delegate.client_id)
      })
      .map((delegate) => delegate.id)

    const bookingIds = localBookings
      .filter((booking) => {
        const matchesBooking = `
          ${booking.course_name || ''}
          ${booking.client_name || ''}
          ${booking.location || ''}
          ${booking.status || ''}
        `
          .toLowerCase()
          .includes(cleanTerm)

        return matchesBooking || clientIds.includes(booking.client_id)
      })
      .map((booking) => booking.id)

    return { bookingIds, clientIds, delegateIds }
  }

  const applyCertificateFilters = (
    query: any,
    searchTerm: string,
    relatedIds: {
      bookingIds: string[]
      clientIds: string[]
      delegateIds: string[]
    }
  ) => {
    let nextQuery = query

    if (statusFilter === 'expiring_soon') {
      const { today, endDate } = getExpiryWindow()

      nextQuery = nextQuery
        .eq('status', 'valid')
        .gte('expiry_date', today)
        .lte('expiry_date', endDate)
    } else if (statusFilter !== 'all') {
      nextQuery = nextQuery.eq('status', statusFilter)
    }

    if (linkFilter === 'linked') {
      nextQuery = nextQuery.not('delegate_id', 'is', null)
    }

    if (linkFilter === 'manual') {
      nextQuery = nextQuery.is('delegate_id', null)
    }

    const cleanTerm = cleanSearchTerm(searchTerm)

    if (!cleanTerm) return nextQuery

    const term = `%${cleanTerm}%`
    const filters = [
      `learner_name.ilike.${term}`,
      `course_name.ilike.${term}`,
      `certificate_number.ilike.${term}`,
      `verification_id.ilike.${term}`,
      `status.ilike.${term}`,
      `certificate_title.ilike.${term}`,
    ]

    if (relatedIds.bookingIds.length > 0) {
      filters.push(`booking_id.in.(${relatedIds.bookingIds.join(',')})`)
    }

    if (relatedIds.delegateIds.length > 0) {
      filters.push(`delegate_id.in.(${relatedIds.delegateIds.join(',')})`)
    }

    return nextQuery.or(filters.join(','))
  }

  const load = async (page = currentPage, searchTerm = search) => {
    setLoading(true)

    const currentProfile = await getOrCreateAccount()

    setProfile(currentProfile)

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', currentProfile.organisation_id)
      .single()

    const bookingsData = await fetchPaginatedImportRecords<any>(
      async (from, to) =>
        await supabase
          .from('bookings')
          .select('*')
          .eq('organisation_id', currentProfile.organisation_id)
          .order('date', { ascending: false })
          .range(from, to)
    )

    const clientsData = await fetchPaginatedImportRecords<any>(
      async (from, to) =>
        await supabase
          .from('clients')
          .select('*')
          .eq('organisation_id', currentProfile.organisation_id)
          .order('company', { ascending: true })
          .range(from, to)
    )

    const delegatesData = await fetchPaginatedImportRecords<any>(
      async (from, to) =>
        await supabase
          .from('delegates')
          .select('*')
          .eq('organisation_id', currentProfile.organisation_id)
          .order('full_name', { ascending: true })
          .range(from, to)
    )

    const relatedIds = getMatchingRelatedIds(
      searchTerm,
      clientsData,
      delegatesData,
      bookingsData
    )
    const from = (page - 1) * CERTIFICATES_PAGE_SIZE
    const to = from + CERTIFICATES_PAGE_SIZE - 1
    let certificatesQuery = supabase
      .from('certificates')
      .select('*', { count: 'exact' })
      .eq('organisation_id', currentProfile.organisation_id)
      .order('created_at', { ascending: false })
      .range(from, to)

    certificatesQuery = applyCertificateFilters(
      certificatesQuery,
      searchTerm,
      relatedIds
    )

    const {
      data: certificatesData,
      count: certificatesCount,
      error: certificatesError,
    } = await certificatesQuery

    if (certificatesError) {
      alert(certificatesError.message)
      setLoading(false)
      return
    }

    const { today, endDate } = getExpiryWindow()

    const { count: allCount } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', currentProfile.organisation_id)

    const { count: validCount } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', currentProfile.organisation_id)
      .eq('status', 'valid')

    const { count: expiredCount } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', currentProfile.organisation_id)
      .eq('status', 'expired')

    const { count: revokedCount } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', currentProfile.organisation_id)
      .eq('status', 'revoked')

    const { count: linkedCount } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', currentProfile.organisation_id)
      .not('delegate_id', 'is', null)

    const { count: expiringSoonCount } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', currentProfile.organisation_id)
      .eq('status', 'valid')
      .gte('expiry_date', today)
      .lte('expiry_date', endDate)

    setOrganisation(organisationData || null)
    setCertificates(certificatesData || [])
    setBookings(bookingsData || [])
    setClients(clientsData || [])
    setDelegates(delegatesData || [])
    setMatchingCertificates(certificatesCount || 0)
    setTotalCertificates(allCount || 0)
    setValidCertificatesCount(validCount || 0)
    setExpiredCertificatesCount(expiredCount || 0)
    setRevokedCertificatesCount(revokedCount || 0)
    setLinkedCertificatesCount(linkedCount || 0)
    setExpiringSoonCertificatesCount(expiringSoonCount || 0)
    setLoading(false)
  }

  useEffect(() => {
    const requestedSearch = new URLSearchParams(window.location.search).get('search')

    if (requestedSearch) {
      setSearch(requestedSearch)
    }

    load(1, requestedSearch || '')
  }, [])

  useEffect(() => {
    if (!profile?.organisation_id) return

    const timeout = window.setTimeout(() => {
      setCurrentPage(1)
      load(1, search)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [search, statusFilter, linkFilter, profile?.organisation_id])

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

    load(currentPage, search)
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

    load(currentPage, search)
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

  const totalPages = Math.max(1, Math.ceil(matchingCertificates / CERTIFICATES_PAGE_SIZE))
  const pageStart = matchingCertificates === 0 ? 0 : (currentPage - 1) * CERTIFICATES_PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * CERTIFICATES_PAGE_SIZE, matchingCertificates)

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)

    setCurrentPage(nextPage)
    load(nextPage, search)
  }

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
          value={totalCertificates}
          detail="All certificates"
        />

        <StatCard
          label="Valid"
          value={validCertificatesCount}
          detail="Current certificates"
        />

        <StatCard
          label="Expiring soon"
          value={expiringSoonCertificatesCount}
          detail="Within 90 days"
        />

        <StatCard
          label="Expired"
          value={expiredCertificatesCount}
          detail="Marked expired"
        />

        <StatCard
          label="Linked"
          value={linkedCertificatesCount}
          detail="Connected to delegates"
        />
      </div>

      {revokedCertificatesCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-sm text-red-800">
          You have {revokedCertificatesCount} revoked certificate
          {revokedCertificatesCount === 1 ? '' : 's'}.
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
            {loading
              ? 'Loading certificates...'
              : `Showing ${pageStart}-${pageEnd} of ${matchingCertificates} matching certificates. Total certificates: ${totalCertificates}.`}
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
          {certificates.map((certificate) => {
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

                    <p className="text-xs text-slate-500 mt-1">
                      Expires {getFormattedDate(certificate.expiry_date)}
                    </p>
                  </div>

                  <button
                    className={buttonPrimary}
                    onClick={() => generateCertificatePDF(certificate)}
                  >
                    Download PDF
                  </button>
                </div>

                <details className="group mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <summary className="cursor-pointer list-none text-xs font-semibold text-slate-700 transition hover:text-slate-950">
                    Certificate details and actions
                  </summary>

                  <div className="mt-3">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
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
                </details>
              </div>
            )
          })}

          {certificates.length === 0 && !loading && (
            <div className="p-6">
              <p className="text-sm font-semibold text-slate-950">
                No certificates yet
              </p>

              <p className="text-sm text-slate-500 mt-1">
                Create certificates from booking delegates to track expiry and verification.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/bookings"
                  className={buttonPrimary}
                >
                  Go to bookings
                </Link>

                <Link
                  href="/dashboard/bookings"
                  className={buttonSecondary}
                >
                  Generate certificates
                </Link>
              </div>
            </div>
          )}
        </div>

        {matchingCertificates > CERTIFICATES_PAGE_SIZE && (
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
  )
}
