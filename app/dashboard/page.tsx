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

    return (
      bookingDate >= today &&
      booking.status !== 'cancelled'
    )
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Welcome back 👋
        </h1>

        <p className="text-gray-500 mt-2">
          {organisation?.name
            ? `Here’s what’s happening at ${organisation.name}.`
            : 'Manage your first aid training business from one place.'}
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link
          href="/dashboard/invoices"
          className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition"
        >
          <p className="text-gray-500">Invoice Value</p>

          <h2 className="text-3xl font-bold mt-2">
            £{totalRevenue.toFixed(2)}
          </h2>
        </Link>

        <Link
          href="/dashboard/clients"
          className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition"
        >
          <p className="text-gray-500">Clients</p>

          <h2 className="text-3xl font-bold mt-2">
            {clients.length}
          </h2>
        </Link>

        <Link
          href="/dashboard/bookings"
          className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition"
        >
          <p className="text-gray-500">Upcoming Bookings</p>

          <h2 className="text-3xl font-bold mt-2">
            {upcomingBookings.length}
          </h2>
        </Link>

        <Link
          href="/dashboard/certificates"
          className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition"
        >
          <p className="text-gray-500">Expiring Soon</p>

          <h2 className="text-3xl font-bold mt-2">
            {expiringCertificates.length}
          </h2>
        </Link>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Completed Bookings</p>

          <h2 className="text-3xl font-bold mt-2">
            {completedBookings.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Unpaid Invoices</p>

          <h2 className="text-3xl font-bold mt-2">
            {unpaidInvoices.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Expired Certificates</p>

          <h2 className="text-3xl font-bold mt-2">
            {expiredCertificates.length}
          </h2>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Upcoming Bookings */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">
              Upcoming Bookings
            </h2>

            <Link
              href="/dashboard/bookings"
              className="text-sm text-gray-500 hover:text-black"
            >
              View all
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {upcomingBookings.slice(0, 5).map((booking) => (
              <div
                key={booking.id}
                className="bg-gray-50 p-4 rounded-xl"
              >
                <p className="font-semibold">
                  {booking.course_name}
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  {booking.client_name}
                </p>

                <p className="text-sm text-gray-600 mt-2">
                  {booking.date}
                  {booking.start_time
                    ? ` at ${booking.start_time}`
                    : ''}
                </p>

                <div className="mt-3 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs w-fit">
                  {booking.status}
                </div>
              </div>
            ))}

            {upcomingBookings.length === 0 && (
              <p className="text-gray-500">
                No upcoming bookings yet.
              </p>
            )}
          </div>
        </div>

        {/* Unpaid Invoices */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">
              Unpaid Invoices
            </h2>

            <Link
              href="/dashboard/invoices"
              className="text-sm text-gray-500 hover:text-black"
            >
              View all
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {unpaidInvoices.slice(0, 5).map((invoice) => (
              <div
                key={invoice.id}
                className="bg-gray-50 p-4 rounded-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {invoice.invoice_number || 'Invoice'}
                    </p>

                    <p className="text-sm text-gray-500 mt-1">
                      {invoice.client_name}
                    </p>
                  </div>

                  <p className="font-semibold">
                    £{Number(invoice.total_amount || invoice.amount || 0).toFixed(2)}
                  </p>
                </div>

                <p className="text-sm text-gray-600 mt-2">
                  Due: {invoice.due_date || 'Not set'}
                </p>

                <div className="mt-3 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs w-fit">
                  {invoice.status}
                </div>
              </div>
            ))}

            {unpaidInvoices.length === 0 && (
              <p className="text-gray-500">
                No unpaid invoices.
              </p>
            )}
          </div>
        </div>

        {/* Expiring Certificates */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">
              Expiring Certificates
            </h2>

            <Link
              href="/dashboard/certificates"
              className="text-sm text-gray-500 hover:text-black"
            >
              View all
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {expiringCertificates.slice(0, 5).map((certificate) => {
              const days = getDaysUntilExpiry(certificate.expiry_date)
              const clientEmail = getClientEmailForCertificate(certificate)

              return (
                <div
                  key={certificate.id}
                  className="bg-orange-50 border border-orange-100 p-4 rounded-xl"
                >
                  <p className="font-semibold">
                    {certificate.learner_name}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {certificate.course_name}
                  </p>

                  <p className="text-sm text-gray-600 mt-2">
                    Expires: {certificate.expiry_date}
                  </p>

                  {clientEmail && (
                    <p className="text-sm text-gray-600">
                      Email: {clientEmail}
                    </p>
                  )}

                  <div className="mt-3 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs w-fit">
                    {days === 0
                      ? 'Expires today'
                      : `Expires in ${days} days`}
                  </div>
                </div>
              )
            })}

            {expiringCertificates.length === 0 && (
              <p className="text-gray-500">
                No certificates expiring within 60 days.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm mt-8">
        <h2 className="text-2xl font-semibold mb-5">
          Quick Actions
        </h2>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/clients"
            className="bg-black text-white px-4 py-2 rounded-lg"
          >
            Add Client
          </Link>

          <Link
            href="/dashboard/bookings"
            className="border px-4 py-2 rounded-lg"
          >
            Create Booking
          </Link>

          <Link
            href="/dashboard/invoices"
            className="border px-4 py-2 rounded-lg"
          >
            Create Invoice
          </Link>

          <Link
            href="/dashboard/certificates"
            className="border px-4 py-2 rounded-lg"
          >
            Issue Certificate
          </Link>
        </div>
      </div>
    </div>
  )
}