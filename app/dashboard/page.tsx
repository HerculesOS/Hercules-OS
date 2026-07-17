'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate, formatAppTimeRange } from '@/lib/formatters'
import {
  calculateSetupProgress,
  type SetupCounts,
} from '@/lib/setupProgress'
import {
  getDashboardActionCounts,
  getBookingsWithIncompleteRegisters,
  getMoneySnapshot,
  getOverdueInvoices,
  getTodaysBookings,
  getTrainingSnapshot,
  getUpcomingBookings,
} from '@/lib/dashboardCommand'

const emptySetupCounts: SetupCounts = {
  courseTemplates: 0,
  certificateTemplates: 0,
  emailTemplates: 0,
  clients: 0,
  delegates: 0,
  bookings: 0,
}

const getSetupCardDismissalKey = (organisationId: string) =>
  `hercules.setupCardDismissed.${organisationId}`

const countRows = async (table: string, organisationId: string) => {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)

  if (error) throw error

  return count || 0
}

export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [trainers, setTrainers] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [bookingDelegateLinks, setBookingDelegateLinks] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [setupCounts, setSetupCounts] = useState<SetupCounts>(emptySetupCounts)
  const [setupCardDismissed, setSetupCardDismissed] = useState(false)

  const load = async () => {
    const profile = await getOrCreateAccount()

    setSetupCardDismissed(
      localStorage.getItem(getSetupCardDismissalKey(profile.organisation_id)) === 'true'
    )

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single()

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: delegatesData } = await supabase
      .from('delegates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('date', { ascending: true })

    const { data: trainersData } = await supabase
      .from('trainers')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('name', { ascending: true })

    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

    const { data: certificatesData } = await supabase
      .from('certificates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('expiry_date', { ascending: true })

    const { data: requestsData } = await supabase
      .from('training_requests')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

    const { data: bookingDelegateLinksData } = await supabase
      .from('booking_delegates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const [
      courseTemplatesCount,
      certificateTemplatesCount,
      emailTemplatesCount,
    ] = await Promise.all([
      countRows('course_templates', profile.organisation_id),
      countRows('certificate_templates', profile.organisation_id),
      countRows('email_templates', profile.organisation_id),
    ])

    setOrganisation(organisationData || null)
    setClients(clientsData || [])
    setDelegates(delegatesData || [])
    setBookings(bookingsData || [])
    setTrainers(trainersData || [])
    setInvoices(invoicesData || [])
    setCertificates(certificatesData || [])
    setRequests(requestsData || [])
    setBookingDelegateLinks(bookingDelegateLinksData || [])
    setSetupCounts({
      courseTemplates: courseTemplatesCount,
      certificateTemplates: certificateTemplatesCount,
      emailTemplates: emailTemplatesCount,
      clients: clientsData?.length || 0,
      delegates: delegatesData?.length || 0,
      bookings: bookingsData?.length || 0,
    })
  }

  useEffect(() => {
    load()
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const setupProgress = calculateSetupProgress(organisation, setupCounts)
  const shouldShowSetupCard =
    Boolean(organisation) && !setupProgress.complete && !setupCardDismissed

  const dismissSetupCard = () => {
    if (organisation?.id) {
      localStorage.setItem(getSetupCardDismissalKey(organisation.id), 'true')
    }

    setSetupCardDismissed(true)
  }

  const moneySnapshot = getMoneySnapshot(invoices, today)
  const trainingSnapshot = getTrainingSnapshot(
    bookings,
    delegates,
    certificates,
    today
  )
  const actionCounts = getDashboardActionCounts({
    requests,
    invoices,
    certificates,
    bookings,
    bookingDelegateLinks,
    delegates,
    clients,
    today,
  })
  const todaysBookings = getTodaysBookings(bookings, today)
  const upcomingBookings = getUpcomingBookings(bookings, today)
  const nextSevenBookings = upcomingBookings.filter(
    (booking) => !todaysBookings.some((todayBooking) => todayBooking.id === booking.id)
  )
  const overdueInvoices = getOverdueInvoices(invoices, today)
  const incompleteRegisterBookings = getBookingsWithIncompleteRegisters(
    bookings,
    bookingDelegateLinks
  )
  const openRequests = requests.filter((request) =>
    ['new', 'contacted'].includes(String(request.status || 'new'))
  )
  const recentItems = [
    ...bookings.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || ''))).slice(0, 3).map((booking) => ({
      id: `booking-${booking.id}`,
      label: booking.course_name || 'Booking',
      detail: 'Booking created',
      href: `/dashboard/bookings/${booking.id}`,
    })),
    ...invoices.slice(0, 3).map((invoice) => ({
      id: `invoice-${invoice.id}`,
      label: invoice.invoice_number || 'Invoice',
      detail: `${invoice.client_name || invoice.recipient_name || 'Recipient'} - £${Number(invoice.total_amount || invoice.amount || 0).toFixed(2)}`,
      href: `/dashboard/invoices?search=${encodeURIComponent(invoice.id)}`,
    })),
    ...certificates.slice(0, 3).map((certificate) => ({
      id: `certificate-${certificate.id}`,
      label: certificate.learner_name || 'Certificate',
      detail: certificate.course_name || 'Certificate issued',
      href: `/dashboard/certificates?search=${encodeURIComponent(certificate.id)}`,
    })),
    ...requests.slice(0, 3).map((request) => ({
      id: `request-${request.id}`,
      label: request.company_name || request.contact_name || 'Training request',
      detail: request.course_name || 'New enquiry',
      href: '/dashboard/requests',
    })),
  ].slice(0, 8)

  const formatCurrency = (value: number) => `£${value.toFixed(2)}`

  const getFormattedDate = (dateValue: string | null | undefined) =>
    formatAppDate(dateValue, organisation)

  const getFormattedTimeRange = (booking: any) =>
    formatAppTimeRange(booking.start_time, booking.end_time, organisation)

  const getClientForBooking = (booking: any) => {
    if (!booking?.client_id) return null
    return clients.find((client) => client.id === booking.client_id)
  }

  const getTrainerForBooking = (booking: any) => {
    if (!booking?.trainer_id) return null
    return trainers.find((trainer) => trainer.id === booking.trainer_id)
  }

  const getBookingClientDisplay = (booking: any) => {
    const client = getClientForBooking(booking)

    if (client?.company) return client.company
    if (booking.course_delivery_type === 'public') return 'Public course'

    return booking.client_name || 'No client'
  }

  const CardStat = ({
    label,
    value,
    detail,
  }: {
    label: string
    value: string | number
    detail?: string
  }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      {detail && (
        <p className="mt-1 text-xs text-slate-500">
          {detail}
        </p>
      )}
    </div>
  )

  const BookingRow = ({ booking }: { booking: any }) => {
    const trainer = getTrainerForBooking(booking)

    return (
      <Link
        href={`/dashboard/bookings/${booking.id}`}
        className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              {booking.course_name || 'Untitled booking'}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {getFormattedDate(booking.date)}
              {booking.end_date && booking.end_date !== booking.date
                ? ` to ${getFormattedDate(booking.end_date)}`
                : ''}
              {booking.start_time ? ` - ${getFormattedTimeRange(booking)}` : ''}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {getBookingClientDisplay(booking)}
              {trainer?.name ? ` - ${trainer.name}` : ''}
            </p>
          </div>

          <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            {booking.course_delivery_type === 'public' ? 'Public' : 'Private'}
          </span>
        </div>
      </Link>
    )
  }

  const actionItems = [
    {
      label: 'Open training requests',
      count: actionCounts.openRequests,
      detail: 'Review and convert enquiries',
      href: '/dashboard/requests',
      action: 'Review requests',
    },
    {
      label: 'Overdue invoices',
      count: actionCounts.overdueInvoices,
      detail: 'Invoices past due and unpaid',
      href: '/dashboard/invoices?status=overdue',
      action: 'Chase invoices',
    },
    {
      label: 'Expiring certificates',
      count: actionCounts.expiringSoonCertificates,
      detail: 'Certificates expiring within 90 days',
      href: '/dashboard/certificates?status=expiring_soon',
      action: 'View certificates',
    },
    {
      label: 'Renewal opportunities',
      count: actionCounts.renewalOpportunities,
      detail: 'Expired or soon-to-expire certificates',
      href: '/dashboard/renewals',
      action: 'View renewals',
    },
    {
      label: 'Registers to finish',
      count: actionCounts.incompleteRegisters,
      detail: 'Bookings with incomplete attendance/results',
      href: incompleteRegisterBookings[0]
        ? `/dashboard/bookings/${incompleteRegisterBookings[0].id}`
        : '/dashboard/bookings',
      action: 'Complete register',
    },
  ]

  const hasStarterData =
    clients.length > 0 ||
    delegates.length > 0 ||
    bookings.length > 0 ||
    invoices.length > 0 ||
    certificates.length > 0 ||
    requests.length > 0

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Today
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Here is what matters today.
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {organisation?.name
                ? `${organisation.name} has ${todaysBookings.length} booking${todaysBookings.length === 1 ? '' : 's'} today and ${actionItems.reduce((sum, item) => sum + item.count, 0)} item${actionItems.reduce((sum, item) => sum + item.count, 0) === 1 ? '' : 's'} needing attention.`
                : 'A daily view of bookings, renewals, invoices and follow-up work.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/bookings"
              className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
            >
              Create booking
            </Link>

            <Link
              href="/dashboard/renewals"
              className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
            >
              View renewals
            </Link>
          </div>
        </div>
      </section>

      {shouldShowSetupCard && (
        <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Setup
              </p>

              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Finish setting up Hercules OS
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Complete your business details, templates, imports and first booking.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/setup"
                className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open setup guide
              </Link>

              <button
                type="button"
                onClick={dismissSetupCard}
                className="rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
              >
                Hide setup guide
              </button>
            </div>
          </div>
        </section>
      )}

      {!hasStarterData && (
        <section className="rounded-[24px] border border-dashed border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Start with the essentials
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Add your first booking, import clients and delegates, or finish setup to make the dashboard come alive.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/bookings" className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
              Create first booking
            </Link>

            <Link href="/dashboard/import" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              Import clients/delegates
            </Link>

            <Link href="/dashboard/setup" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              Open setup guide
            </Link>

            <Link href="/dashboard/courses" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              Create course templates
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">
              Today / This week
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Bookings that need delivery attention.
            </p>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Today
              </p>

              <div className="grid gap-3">
                {todaysBookings.slice(0, 5).map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}

                {todaysBookings.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No bookings today.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Next 7 days
              </p>

              <div className="grid gap-3">
                {nextSevenBookings.slice(0, 5).map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}

                {nextSevenBookings.length === 0 && (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No bookings in the next week.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">
              Action required
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Work that needs a decision or follow-up.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {actionItems.map((item) => (
              <div key={item.label} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {item.label}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.detail}
                    </p>
                  </div>

                  <span className={item.count > 0 ? 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700' : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500'}>
                    {item.count}
                  </span>
                </div>

                <Link
                  href={item.href}
                  className="mt-3 inline-flex text-xs font-semibold text-slate-500 hover:text-slate-950"
                >
                  {item.action}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Money snapshot
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Simple invoice position for this month.
              </p>
            </div>

            <Link href="/dashboard/invoices" className="text-xs font-semibold text-slate-500 hover:text-slate-950">
              Invoices
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CardStat label="Revenue this month" value={formatCurrency(moneySnapshot.revenueThisMonth)} />
            <CardStat label="Paid this month" value={formatCurrency(moneySnapshot.paidThisMonth)} />
            <CardStat label="Outstanding" value={formatCurrency(moneySnapshot.outstandingAmount)} detail={`${moneySnapshot.outstandingCount} unpaid invoice${moneySnapshot.outstandingCount === 1 ? '' : 's'}`} />
            <CardStat label="Overdue invoices" value={moneySnapshot.overdueCount} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Training snapshot
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Course activity and certificate pressure.
              </p>
            </div>

            <Link href="/dashboard/reports" className="text-xs font-semibold text-slate-500 hover:text-slate-950">
              Reports
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CardStat label="Bookings this month" value={trainingSnapshot.bookingsThisMonth} />
            <CardStat label="Delegates this month" value={trainingSnapshot.delegatesThisMonth} />
            <CardStat label="Certificates issued" value={trainingSnapshot.certificatesIssuedThisMonth} detail="This month" />
            <CardStat label="Expiring soon" value={trainingSnapshot.expiringSoonCount} detail="Within 90 days" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Renewals
          </p>

          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {actionCounts.renewalSummary.clientsAffected} affected client{actionCounts.renewalSummary.clientsAffected === 1 ? '' : 's'}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {actionCounts.renewalSummary.potentialRenewalDelegates} certificate{actionCounts.renewalSummary.potentialRenewalDelegates === 1 ? '' : 's'} expired or expiring within 90 days.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-red-50 p-3 text-red-700">
              <p className="text-lg font-semibold">{actionCounts.renewalSummary.expired}</p>
              <p className="text-[11px] font-medium">expired</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-amber-700">
              <p className="text-lg font-semibold">{actionCounts.renewalSummary.within30}</p>
              <p className="text-[11px] font-medium">30 days</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-blue-700">
              <p className="text-lg font-semibold">{actionCounts.renewalSummary.within60 + actionCounts.renewalSummary.within90}</p>
              <p className="text-[11px] font-medium">60-90 days</p>
            </div>
          </div>

          <Link
            href="/dashboard/renewals"
            className="mt-4 inline-flex rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open renewals
          </Link>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">
              Recent activity
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Recently created records across the workspace.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block p-4 transition hover:bg-slate-50"
              >
                <p className="text-sm font-semibold text-slate-950">
                  {item.label}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {item.detail}
                </p>
              </Link>
            ))}

            {recentItems.length === 0 && (
              <p className="p-4 text-sm text-slate-500">
                Recent records will appear here.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-950">
            Quick actions
          </h2>
        </div>

        <div className="flex flex-wrap gap-2 p-4">
          <Link href="/dashboard/bookings" className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Create booking
          </Link>
          <Link href="/dashboard/requests" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Review requests
          </Link>
          <Link href="/dashboard/import" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Import data
          </Link>
          <Link href="/dashboard/certificates" className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Certificates
          </Link>
        </div>
      </section>
    </div>
  )
}
