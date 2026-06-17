'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)

  const load = async () => {
    const profile = await getOrCreateAccount()

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
      .order('date', { ascending: true })

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

    setOrganisation(organisationData || null)
    setClients(clientsData || [])
    setBookings(bookingsData || [])
    setInvoices(invoicesData || [])
    setCertificates(certificatesData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const totalRevenue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
    0
  )

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status !== 'paid'
  )

  const upcomingBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.date)
    bookingDate.setHours(0, 0, 0, 0)

    return bookingDate >= today && booking.status !== 'cancelled'
  })

  const completedBookings = bookings.filter(
    (booking) => booking.status === 'completed'
  )

  const expiringCertificates = certificates.filter((certificate) => {
    if (certificate.status !== 'valid') return false

    const expiry = new Date(certificate.expiry_date)
    expiry.setHours(0, 0, 0, 0)

    const diff = expiry.getTime() - today.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    return days >= 0 && days <= 60
  })

  const expiredCertificates = certificates.filter((certificate) => {
    if (certificate.status !== 'valid') return false

    const expiry = new Date(certificate.expiry_date)
    expiry.setHours(0, 0, 0, 0)

    return expiry < today
  })

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    expiry.setHours(0, 0, 0, 0)

    const diff = expiry.getTime() - today.getTime()

    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const getClientEmailForCertificate = (certificate: any) => {
    const booking = bookings.find(
      (booking) => booking.id === certificate.booking_id
    )

    if (!booking) return ''

    const client = clients.find(
      (client) => client.id === booking.client_id
    )

    return client?.email || ''
  }

  const StatCard = ({
    label,
    value,
    href,
    detail,
  }: {
    label: string
    value: string | number
    href?: string
    detail?: string
  }) => {
    const content = (
      <div className="bg-white border border-slate-200 rounded-lg p-6 hover:border-slate-300 transition min-h-36 flex flex-col justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <h2 className="text-4xl font-semibold text-slate-950 mt-4">
          {value}
        </h2>

        {detail && (
          <p className="text-sm text-slate-500 mt-3 leading-6">
            {detail}
          </p>
        )}
      </div>
    )

    if (href) {
      return (
        <Link href={href}>
          {content}
        </Link>
      )
    }

    return content
  }

  const StatusPill = ({
    children,
    tone = 'default',
  }: {
    children: React.ReactNode
    tone?: 'default' | 'blue' | 'yellow' | 'red'
  }) => {
    const styles = {
      default: 'bg-slate-100 text-slate-700 border-slate-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-100',
      yellow: 'bg-amber-50 text-amber-700 border-amber-100',
      red: 'bg-red-50 text-red-700 border-red-100',
    }

    return (
      <span className={`inline-flex border px-2.5 py-1 rounded-md text-xs font-medium ${styles[tone]}`}>
        {children}
      </span>
    )
  }

  return (
    <div>
      <div className="mb-8 rounded-[28px] bg-white border border-slate-200 p-6 sm:p-8 lg:p-10 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Overview
          </p>

          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-950 mt-3">
            Welcome back
          </h1>

          <p className="text-base text-slate-500 mt-3 leading-7">
            {organisation?.name
              ? `Here’s what’s happening at ${organisation.name}.`
              : 'Manage your training business from one place.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/bookings"
            className="bg-slate-950 text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-slate-800"
          >
            Create booking
          </Link>

          <Link
            href="/dashboard/clients"
            className="bg-white border border-slate-200 px-4 py-2.5 rounded-md text-sm font-medium hover:bg-slate-50"
          >
            Add client
          </Link>
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
        <StatCard
          label="Invoice value"
          value={`£${totalRevenue.toFixed(2)}`}
          href="/dashboard/invoices"
          detail="Total recorded invoice value"
        />

        <StatCard
          label="Clients"
          value={clients.length}
          href="/dashboard/clients"
          detail="Active client records"
        />

        <StatCard
          label="Upcoming bookings"
          value={upcomingBookings.length}
          href="/dashboard/bookings"
          detail="Scheduled from today onwards"
        />

        <StatCard
          label="Expiring soon"
          value={expiringCertificates.length}
          href="/dashboard/certificates"
          detail="Certificates within 60 days"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <StatCard
          label="Completed bookings"
          value={completedBookings.length}
          detail="Marked as completed"
        />

        <StatCard
          label="Unpaid invoices"
          value={unpaidInvoices.length}
          detail="Draft or sent invoices"
        />

        <StatCard
          label="Expired certificates"
          value={expiredCertificates.length}
          detail="Past expiry date"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Upcoming Bookings
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Next scheduled sessions
              </p>
            </div>

            <Link
              href="/dashboard/bookings"
              className="text-xs font-medium text-slate-500 hover:text-slate-950"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingBookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950">
                      {booking.course_name}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      {booking.client_name}
                    </p>

                    <p className="text-xs text-slate-600 mt-1">
                      {booking.date}
                      {booking.start_time ? ` · ${booking.start_time}` : ''}
                    </p>
                  </div>

                  <StatusPill tone="blue">
                    {booking.status}
                  </StatusPill>
                </div>
              </div>
            ))}

            {upcomingBookings.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-500">
                No upcoming bookings yet.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Unpaid Invoices
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Outstanding payments
              </p>
            </div>

            <Link
              href="/dashboard/invoices"
              className="text-xs font-medium text-slate-500 hover:text-slate-950"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {unpaidInvoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-950">
                      {invoice.invoice_number || 'Invoice'}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      {invoice.client_name}
                    </p>

                    <p className="text-xs text-slate-600 mt-1">
                      Due: {invoice.due_date || 'Not set'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      £{Number(invoice.total_amount || invoice.amount || 0).toFixed(2)}
                    </p>

                    <div className="mt-2">
                      <StatusPill tone="yellow">
                        {invoice.status}
                      </StatusPill>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {unpaidInvoices.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-500">
                No unpaid invoices.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Expiring Certificates
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Certificates needing attention
              </p>
            </div>

            <Link
              href="/dashboard/certificates"
              className="text-xs font-medium text-slate-500 hover:text-slate-950"
            >
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {expiringCertificates.slice(0, 5).map((certificate) => {
              const days = getDaysUntilExpiry(certificate.expiry_date)
              const clientEmail = getClientEmailForCertificate(certificate)

              return (
                <div
                  key={certificate.id}
                  className="px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-950">
                        {certificate.learner_name}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {certificate.course_name}
                      </p>

                      <p className="text-xs text-slate-600 mt-1">
                        Expires: {certificate.expiry_date}
                      </p>

                      {clientEmail && (
                        <p className="text-xs text-slate-500 mt-1 break-all">
                          {clientEmail}
                        </p>
                      )}
                    </div>

                    <StatusPill tone={days <= 7 ? 'red' : 'yellow'}>
                      {days === 0 ? 'Today' : `${days}d`}
                    </StatusPill>
                  </div>
                </div>
              )
            })}

            {expiringCertificates.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-500">
                No certificates expiring within 60 days.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg mt-4">
        <div className="px-4 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-950">
            Quick Actions
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Jump straight into common workflows
          </p>
        </div>

        <div className="p-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/clients"
            className="bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800"
          >
            Add Client
          </Link>

          <Link
            href="/dashboard/bookings"
            className="border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50"
          >
            Create Booking
          </Link>

          <Link
            href="/dashboard/invoices"
            className="border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50"
          >
            Create Invoice
          </Link>

          <Link
            href="/dashboard/certificates"
            className="border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50"
          >
            Issue Certificate
          </Link>
        </div>
      </div>
    </div>
  )
}
