'use client'

import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate, formatAppTimeRange } from '@/lib/formatters'
import { isLocalDateWithinNextDays } from '@/lib/dateRanges'

type ReportType =
  | 'delegates'
  | 'bookings'
  | 'revenue'
  | 'certificates'
  | 'clients'
  | 'requests'

type ReportField = {
  key: string
  label: string
}

type RevenueDateMode = 'invoice_date' | 'booking_date' | 'due_date'

const reportRowLimit = 5000

export default function ReportsPage() {
  const [organisation, setOrganisation] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [reportType, setReportType] = useState<ReportType>('delegates')
  const [rangePreset, setRangePreset] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [revenueDateMode, setRevenueDateMode] = useState<RevenueDateMode>('invoice_date')
  const [limitedTables, setLimitedTables] = useState<string[]>([])

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const panelClass =
    'bg-white border border-slate-200 rounded-lg'

  const panelHeaderClass =
    'px-4 py-3 border-b border-slate-200'

  const load = async () => {
    const profile = await getOrCreateAccount()
    const limitedTableNames: string[] = []

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single()

    const { data: clientsData, count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .order('company', { ascending: true })
      .range(0, reportRowLimit - 1)

    const { data: delegatesData, count: delegatesCount } = await supabase
      .from('delegates')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .order('full_name', { ascending: true })
      .range(0, reportRowLimit - 1)

    const { data: bookingsData, count: bookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .order('date', { ascending: true })
      .range(0, reportRowLimit - 1)

    const { data: invoicesData, count: invoicesCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })
      .range(0, reportRowLimit - 1)

    const { data: certificatesData, count: certificatesCount } = await supabase
      .from('certificates')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })
      .range(0, reportRowLimit - 1)

    const { data: requestsData, count: requestsCount } = await supabase
      .from('training_requests')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })
      .range(0, reportRowLimit - 1)

    const { data: trainersData } = await supabase
      .from('trainers')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('name', { ascending: true })

    setOrganisation(organisationData || null)
    setClients(clientsData || [])
    setDelegates(delegatesData || [])
    setBookings(bookingsData || [])
    setInvoices(invoicesData || [])
    setCertificates(certificatesData || [])
    setRequests(requestsData || [])
    setTrainers(trainersData || [])

    if ((clientsCount || 0) > reportRowLimit) limitedTableNames.push('clients')
    if ((delegatesCount || 0) > reportRowLimit) limitedTableNames.push('delegates')
    if ((bookingsCount || 0) > reportRowLimit) limitedTableNames.push('bookings')
    if ((invoicesCount || 0) > reportRowLimit) limitedTableNames.push('invoices')
    if ((certificatesCount || 0) > reportRowLimit) limitedTableNames.push('certificates')
    if ((requestsCount || 0) > reportRowLimit) limitedTableNames.push('requests')

    setLimitedTables(limitedTableNames)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const reportFields: Record<ReportType, ReportField[]> = {
    delegates: [
      { key: 'full_name', label: 'Delegate name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'client', label: 'Client/company' },
      { key: 'notes', label: 'Notes' },
      { key: 'created_at', label: 'Created date' },
    ],
    bookings: [
      { key: 'course_name', label: 'Course' },
      { key: 'client', label: 'Client/company' },
      { key: 'course_delivery_type', label: 'Course type' },
      { key: 'date', label: 'Date' },
      { key: 'time', label: 'Time' },
      { key: 'trainer', label: 'Trainer' },
      { key: 'location', label: 'Location' },
      { key: 'price', label: 'Price' },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Notes' },
    ],
    revenue: [
      { key: 'invoice_number', label: 'Invoice number' },
      { key: 'recipient_name', label: 'Recipient' },
      { key: 'course_name', label: 'Course' },
      { key: 'booking_date', label: 'Booking date' },
      { key: 'invoice_date', label: 'Invoice date' },
      { key: 'due_date', label: 'Due date' },
      { key: 'net_amount', label: 'Net amount' },
      { key: 'vat_amount', label: 'VAT amount' },
      { key: 'total_amount', label: 'Total amount' },
      { key: 'status', label: 'Status' },
      { key: 'invoice_target_type', label: 'Invoice type' },
    ],
    certificates: [
      { key: 'learner_name', label: 'Learner' },
      { key: 'course_name', label: 'Course' },
      { key: 'client', label: 'Client/company' },
      { key: 'certificate_number', label: 'Certificate number' },
      { key: 'issue_date', label: 'Issue date' },
      { key: 'expiry_date', label: 'Expiry date' },
      { key: 'status', label: 'Status' },
      { key: 'verification_id', label: 'Verification ID' },
    ],
    clients: [
      { key: 'company', label: 'Company' },
      { key: 'name', label: 'Primary contact' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Address' },
      { key: 'notes', label: 'Notes' },
      { key: 'created_at', label: 'Created date' },
    ],
    requests: [
      { key: 'company_name', label: 'Company' },
      { key: 'contact_name', label: 'Contact' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'course_name', label: 'Course' },
      { key: 'request_type', label: 'Request type' },
      { key: 'preferred_date', label: 'Preferred date' },
      { key: 'learner_count', label: 'Learners' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status' },
      { key: 'notes', label: 'Notes' },
      { key: 'created_at', label: 'Submitted date' },
    ],
  }

  useEffect(() => {
    setSelectedFields(reportFields[reportType].slice(0, 6).map((field) => field.key))
  }, [reportType])

  const getFormattedDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return 'Not set'
    const dateOnly = String(dateValue).split('T')[0]
    return formatAppDate(dateOnly, organisation)
  }

  const getDateOnly = (dateValue: string | null | undefined) => {
    if (!dateValue) return ''
    return String(dateValue).split('T')[0]
  }

  const getClientById = (clientId: string | null | undefined) => {
    if (!clientId) return null
    return clients.find((client) => client.id === clientId)
  }

  const getDelegateById = (delegateId: string | null | undefined) => {
    if (!delegateId) return null
    return delegates.find((delegate) => delegate.id === delegateId)
  }

  const getBookingById = (bookingId: string | null | undefined) => {
    if (!bookingId) return null
    return bookings.find((booking) => booking.id === bookingId)
  }

  const getTrainerById = (trainerId: string | null | undefined) => {
    if (!trainerId) return null
    return trainers.find((trainer) => trainer.id === trainerId)
  }

  const getClientForBooking = (booking: any) => {
    const client = getClientById(booking?.client_id)

    if (client?.company) return client.company

    if (booking?.course_delivery_type === 'public') return 'Public course'

    return booking?.client_name || 'No client'
  }

  const getClientForCertificate = (certificate: any) => {
    const delegate = getDelegateById(certificate.delegate_id)

    if (delegate?.client_id) {
      const client = getClientById(delegate.client_id)
      if (client?.company) return client.company
    }

    const booking = getBookingById(certificate.booking_id)

    if (booking?.client_id) {
      const client = getClientById(booking.client_id)
      if (client?.company) return client.company
    }

    return 'Not linked'
  }

  const getRequestType = (request: any) => {
    const notes = String(request.notes || '').toLowerCase()

    if (
      notes.includes('public/open course enquiry') ||
      notes.includes('public / open course') ||
      notes.includes('public course') ||
      notes.includes('open course')
    ) {
      return 'Public / open course'
    }

    return 'Private / in-house'
  }

  const applyRangePreset = (preset: string) => {
    setRangePreset(preset)

    if (preset === 'all') {
      setStartDate('')
      setEndDate('')
      return
    }

    if (preset === 'custom') {
      return
    }

    const [startYearText, endYearText] = preset.split('/')
    const startYear = Number(startYearText)
    const endYear = Number(`20${endYearText}`)

    if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
      setStartDate(`${startYear}-09-01`)
      setEndDate(`${endYear}-08-31`)
    }
  }

  const isWithinDateRange = (dateValue: string | null | undefined) => {
    if (!startDate && !endDate) return true
    if (!dateValue) return false

    const dateOnly = getDateOnly(dateValue)

    if (startDate && dateOnly < startDate) return false
    if (endDate && dateOnly > endDate) return false

    return true
  }

  const getReportDateField = (item: any) => {
    if (reportType === 'bookings') return item.date
    if (reportType === 'revenue') return getRevenueDateField(item)
    if (reportType === 'certificates') return item.issue_date
    if (reportType === 'requests') return item.created_at
    return item.created_at
  }

  const getRevenueDateField = (invoice: any) => {
    if (revenueDateMode === 'booking_date') {
      return getBookingById(invoice.booking_id)?.date
    }

    if (revenueDateMode === 'due_date') {
      return invoice.due_date
    }

    return invoice.created_at
  }

  const sourceRows = useMemo(() => {
    if (reportType === 'delegates') return delegates
    if (reportType === 'bookings') return bookings
    if (reportType === 'revenue') return invoices
    if (reportType === 'certificates') return certificates
    if (reportType === 'clients') return clients
    return requests
  }, [reportType, delegates, bookings, invoices, certificates, clients, requests])

  const filteredSourceRows = sourceRows.filter((item) =>
    isWithinDateRange(getReportDateField(item))
  )

  const getCellValue = (item: any, fieldKey: string) => {
    if (reportType === 'delegates') {
      const client = getClientById(item.client_id)

      const values: Record<string, any> = {
        full_name: item.full_name || '',
        email: item.email || '',
        phone: item.phone || '',
        client: client?.company || 'No client',
        notes: item.notes || '',
        created_at: getFormattedDate(item.created_at),
      }

      return values[fieldKey] ?? ''
    }

    if (reportType === 'bookings') {
      const trainer = getTrainerById(item.trainer_id)

      const values: Record<string, any> = {
        course_name: item.course_name || '',
        client: getClientForBooking(item),
        course_delivery_type: item.course_delivery_type === 'public' ? 'Public' : 'Private',
        date: getFormattedDate(item.date),
        time: formatAppTimeRange(item.start_time, item.end_time, organisation),
        trainer: trainer?.name || 'Unassigned',
        location: item.location || '',
        price: Number(item.price || 0),
        status: item.status || '',
        notes: item.notes || '',
      }

      return values[fieldKey] ?? ''
    }

    if (reportType === 'revenue') {
      const booking = getBookingById(item.booking_id)

      const values: Record<string, any> = {
        invoice_number: item.invoice_number || '',
        recipient_name: item.recipient_name || item.client_name || '',
        course_name: booking?.course_name || 'Training course delivery',
        booking_date: getFormattedDate(booking?.date),
        invoice_date: getFormattedDate(item.created_at),
        due_date: getFormattedDate(item.due_date),
        net_amount: Number(item.amount || 0),
        vat_amount: Number(item.vat_amount || 0),
        total_amount: Number(item.total_amount || item.amount || 0),
        status: item.status || '',
        invoice_target_type: item.invoice_target_type || 'booking_client',
      }

      return values[fieldKey] ?? ''
    }

    if (reportType === 'certificates') {
      const values: Record<string, any> = {
        learner_name: item.learner_name || '',
        course_name: item.course_name || '',
        client: getClientForCertificate(item),
        certificate_number: item.certificate_number || '',
        issue_date: getFormattedDate(item.issue_date),
        expiry_date: getFormattedDate(item.expiry_date),
        status: item.status || '',
        verification_id: item.verification_id || '',
      }

      return values[fieldKey] ?? ''
    }

    if (reportType === 'clients') {
      const values: Record<string, any> = {
        company: item.company || '',
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        address: item.address || '',
        notes: item.notes || '',
        created_at: getFormattedDate(item.created_at),
      }

      return values[fieldKey] ?? ''
    }

    const values: Record<string, any> = {
      company_name: item.company_name || '',
      contact_name: item.contact_name || '',
      email: item.email || '',
      phone: item.phone || '',
      course_name: item.course_name || '',
      preferred_date: getFormattedDate(item.preferred_date),
      learner_count: item.learner_count || '',
      location: item.location || '',
      status: item.status || '',
      notes: item.notes || '',
      created_at: getFormattedDate(item.created_at),
      request_type: getRequestType(item),
    }

    return values[fieldKey] ?? ''
  }

  const reportRows = filteredSourceRows.map((item) => {
    const row: Record<string, any> = {}

    selectedFields.forEach((fieldKey) => {
      const field = reportFields[reportType].find((itemField) => itemField.key === fieldKey)
      row[field?.label || fieldKey] = getCellValue(item, fieldKey)
    })

    return row
  })

  const filteredInvoicesForStats = invoices.filter((invoice) =>
    isWithinDateRange(getRevenueDateField(invoice))
  )

  const filteredBookingsForStats = bookings.filter((booking) =>
    isWithinDateRange(booking.date)
  )

  const filteredDelegatesForStats = delegates.filter((delegate) =>
    isWithinDateRange(delegate.created_at)
  )

  const filteredCertificatesForStats = certificates.filter((certificate) =>
    isWithinDateRange(certificate.issue_date)
  )

  const exportToExcel = () => {
    if (selectedFields.length === 0) {
      alert('Select at least one field to export.')
      return
    }

    if (reportRows.length === 0) {
      alert('There is no data to export.')
      return
    }

    const worksheet = XLSX.utils.json_to_sheet(reportRows)
    const workbook = XLSX.utils.book_new()

    const reportTitle = `${reportType}-report`
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')

    const safeRange =
      startDate || endDate
        ? `${startDate || 'start'}-to-${endDate || 'end'}`
        : 'all-time'

    XLSX.writeFile(workbook, `${reportTitle}-${safeRange}.xlsx`)
  }

  const totalRevenue = filteredInvoicesForStats.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
    0
  )

  const paidRevenue = filteredInvoicesForStats
    .filter((invoice) => invoice.status === 'paid')
    .reduce(
      (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
      0
    )

  const outstandingRevenue = filteredInvoicesForStats
    .filter((invoice) => invoice.status !== 'paid')
    .reduce(
      (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
      0
    )

  const publicBookings = filteredBookingsForStats.filter(
    (booking) => booking.course_delivery_type === 'public'
  )

  const privateBookings = filteredBookingsForStats.filter(
    (booking) => (booking.course_delivery_type || 'private') === 'private'
  )

  const validCertificates = filteredCertificatesForStats.filter(
    (certificate) => certificate.status === 'valid'
  )

  const expiringCertificates = filteredCertificatesForStats.filter((certificate) => {
    if (!certificate.expiry_date || certificate.status !== 'valid') return false

    return isLocalDateWithinNextDays(certificate.expiry_date, 90)
  })

  const monthlyRevenue = useMemo(() => {
    const months: Record<string, number> = {}

    invoices
      .filter((invoice) => isWithinDateRange(getRevenueDateField(invoice)))
      .forEach((invoice) => {
        const rawDate = getRevenueDateField(invoice)
        if (!rawDate) return

        const monthKey = String(rawDate).slice(0, 7)
        months[monthKey] =
          (months[monthKey] || 0) +
          Number(invoice.total_amount || invoice.amount || 0)
      })

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({
        label: month,
        value,
      }))
  }, [invoices, bookings, startDate, endDate, revenueDateMode])

  const monthlyBookings = useMemo(() => {
    const months: Record<string, number> = {}

    bookings.forEach((booking) => {
      const rawDate = booking.date
      if (!rawDate) return

      const monthKey = String(rawDate).slice(0, 7)
      months[monthKey] = (months[monthKey] || 0) + 1
    })

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({
        label: month,
        value,
      }))
  }, [bookings])

  const topCourses = useMemo(() => {
    const courseCounts: Record<string, number> = {}

    bookings.forEach((booking) => {
      const courseName = booking.course_name || 'Unknown course'
      courseCounts[courseName] = (courseCounts[courseName] || 0) + 1
    })

    return Object.entries(courseCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([course, count]) => ({
        label: course,
        value: count,
      }))
  }, [bookings])

  const maxRevenue = Math.max(...monthlyRevenue.map((item) => item.value), 1)
  const maxBookings = Math.max(...monthlyBookings.map((item) => item.value), 1)
  const maxTopCourses = Math.max(...topCourses.map((item) => item.value), 1)

  const currency = (value: number) => {
    return `£${Number(value || 0).toFixed(2)}`
  }

  const ChartCard = ({
    title,
    subtitle,
    children,
  }: {
    title: string
    subtitle: string
    children: React.ReactNode
  }) => (
    <div className={panelClass}>
      <div className={panelHeaderClass}>
        <h2 className="text-sm font-semibold text-slate-950">
          {title}
        </h2>

        <p className="text-xs text-slate-500 mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="p-4">
        {children}
      </div>
    </div>
  )

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
          Loading reports...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          {limitedTables.length > 0 && (
            <p className="text-xs text-amber-700">
              Large report data is capped at {reportRowLimit} rows per table: {limitedTables.join(', ')}.
            </p>
          )}
        </div>

        <button
          className={buttonPrimary}
          onClick={exportToExcel}
        >
          Export current report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
        <StatCard
          label="Total revenue"
          value={currency(totalRevenue)}
          detail="Invoice value in range"
        />

        <StatCard
          label="Paid revenue"
          value={currency(paidRevenue)}
          detail="Marked as paid"
        />

        <StatCard
          label="Outstanding"
          value={currency(outstandingRevenue)}
          detail="Not yet paid"
        />

        <StatCard
          label="Delegates"
          value={filteredDelegatesForStats.length}
          detail="Learners in range"
        />

        <StatCard
          label="Bookings"
          value={filteredBookingsForStats.length}
          detail={`${privateBookings.length} private · ${publicBookings.length} public`}
        />

        <StatCard
          label="Certificates"
          value={validCertificates.length}
          detail={`${expiringCertificates.length} expiring soon`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        <ChartCard
          title="Monthly revenue"
          subtitle="Invoice value across the last 12 active months."
        >
          <div className="h-64 flex items-end gap-2">
            {monthlyRevenue.length === 0 && (
              <p className="text-sm text-slate-500">
                No revenue data yet.
              </p>
            )}

            {monthlyRevenue.map((item) => (
              <div
                key={item.label}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div className="w-full bg-slate-100 rounded-md overflow-hidden flex items-end h-44">
                  <div
                    className="w-full bg-slate-950 rounded-md"
                    style={{
                      height: `${Math.max((item.value / maxRevenue) * 100, 5)}%`,
                    }}
                  />
                </div>

                <p className="text-[10px] text-slate-500 rotate-[-35deg] h-8">
                  {item.label}
                </p>

                <p className="text-[10px] font-medium text-slate-700">
                  {currency(item.value)}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Monthly bookings"
          subtitle="Scheduled training activity across the last 12 active months."
        >
          <div className="h-64 flex items-end gap-2">
            {monthlyBookings.length === 0 && (
              <p className="text-sm text-slate-500">
                No booking data yet.
              </p>
            )}

            {monthlyBookings.map((item) => (
              <div
                key={item.label}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div className="w-full bg-slate-100 rounded-md overflow-hidden flex items-end h-44">
                  <div
                    className="w-full bg-blue-600 rounded-md"
                    style={{
                      height: `${Math.max((item.value / maxBookings) * 100, 5)}%`,
                    }}
                  />
                </div>

                <p className="text-[10px] text-slate-500 rotate-[-35deg] h-8">
                  {item.label}
                </p>

                <p className="text-[10px] font-medium text-slate-700">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="Top courses"
          subtitle="Most frequently booked courses."
        >
          <div className="grid gap-3">
            {topCourses.length === 0 && (
              <p className="text-sm text-slate-500">
                No course data yet.
              </p>
            )}

            {topCourses.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between gap-3 text-xs mb-1">
                  <p className="font-medium text-slate-700 truncate">
                    {item.label}
                  </p>

                  <p className="text-slate-500">
                    {item.value}
                  </p>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{
                      width: `${Math.max((item.value / maxTopCourses) * 100, 8)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-4 ${panelClass} h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Report builder
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Choose what you want to report on, select a date range and pick your fields.
            </p>
          </div>

          <div className="p-4 grid gap-4">
            <div>
              <label className="text-xs text-slate-500">
                Report type
              </label>

              <select
                className={`${inputClass} w-full mt-1`}
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                <option value="delegates">Delegates</option>
                <option value="bookings">Bookings</option>
                <option value="revenue">Revenue / invoices</option>
                <option value="certificates">Certificates</option>
                <option value="clients">Clients</option>
                <option value="requests">Training requests</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">
                Date range
              </label>

              <select
                className={`${inputClass} w-full mt-1`}
                value={rangePreset}
                onChange={(e) => applyRangePreset(e.target.value)}
              >
                <option value="all">All time</option>
                <option value="2025/26">2025/26 training year</option>
                <option value="2024/25">2024/25 training year</option>
                <option value="2023/24">2023/24 training year</option>
                <option value="2022/23">2022/23 training year</option>
                <option value="custom">Custom range</option>
              </select>

              <p className="text-xs text-slate-500 mt-2">
                Training years run September to August for these quick presets.
              </p>
            </div>

            {reportType === 'revenue' && (
              <div>
                <label className="text-xs text-slate-500">
                  Revenue date
                </label>

                <select
                  className={`${inputClass} w-full mt-1`}
                  value={revenueDateMode}
                  onChange={(e) =>
                    setRevenueDateMode(e.target.value as RevenueDateMode)
                  }
                >
                  <option value="invoice_date">Invoice date</option>
                  <option value="booking_date">Booking date</option>
                  <option value="due_date">Due date</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">
                  Start date
                </label>

                <input
                  className={`${inputClass} w-full mt-1`}
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setRangePreset('custom')
                  }}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500">
                  End date
                </label>

                <input
                  className={`${inputClass} w-full mt-1`}
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setRangePreset('custom')
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-slate-500">
                  Fields
                </label>

                <button
                  className="text-xs font-medium text-slate-500 hover:text-slate-950"
                  onClick={() =>
                    setSelectedFields(reportFields[reportType].map((field) => field.key))
                  }
                >
                  Select all
                </button>
              </div>

              <div className="grid gap-2 mt-2">
                {reportFields[reportType].map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFields((previous) => [...previous, field.key])
                          return
                        }

                        setSelectedFields((previous) =>
                          previous.filter((key) => key !== field.key)
                        )
                      }}
                    />

                    {field.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-600">
              <p className="font-semibold text-slate-950">
                Report preview
              </p>

              <p className="mt-1">
                {reportRows.length} rows · {selectedFields.length} fields selected
              </p>
            </div>

            <button
              className={buttonPrimary}
              onClick={exportToExcel}
            >
              Export to Excel
            </button>
          </div>
        </div>

        <div className={`xl:col-span-8 ${panelClass}`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Preview
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Showing the first 25 rows of your selected report.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {selectedFields.map((fieldKey) => {
                    const field = reportFields[reportType].find(
                      (item) => item.key === fieldKey
                    )

                    return (
                      <th
                        key={fieldKey}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap"
                      >
                        {field?.label || fieldKey}
                      </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {reportRows.slice(0, 25).map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value: any, valueIndex) => (
                      <td
                        key={valueIndex}
                        className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap"
                      >
                        {String(value || '')}
                      </td>
                    ))}
                  </tr>
                ))}

                {reportRows.length === 0 && (
                  <tr>
                    <td
                      className="px-4 py-6 text-sm text-slate-500"
                      colSpan={Math.max(selectedFields.length, 1)}
                    >
                      No rows match this report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {reportRows.length > 25 && (
            <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
              Showing 25 of {reportRows.length} rows. Export to Excel to download the full report.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
