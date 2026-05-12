'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function Dashboard() {
  const [clients, setClients] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])

  const load = async () => {
    const profile = await getOrCreateAccount()

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: certificatesData } = await supabase
      .from('certificates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    setClients(clientsData || [])
    setBookings(bookingsData || [])
    setInvoices(invoicesData || [])
    setCertificates(certificatesData || [])
  }

  useEffect(() => {
    load()
  }, [])

  const totalRevenue = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount || invoice.amount || 0),
    0
  )

  const upcomingBookings = bookings.filter(
    (booking) => booking.status === 'scheduled'
  )

  const unpaidInvoices = invoices.filter(
    (invoice) => invoice.status !== 'paid'
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Welcome back 👋
        </h1>

        <p className="text-gray-500 mt-2">
          Manage your training business from one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Revenue</p>
          <h2 className="text-3xl font-bold mt-2">£{totalRevenue.toFixed(2)}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Clients</p>
          <h2 className="text-3xl font-bold mt-2">{clients.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Bookings</p>
          <h2 className="text-3xl font-bold mt-2">{bookings.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Certificates</p>
          <h2 className="text-3xl font-bold mt-2">{certificates.length}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">
            Upcoming Bookings
          </h2>

          <div className="mt-6 flex flex-col gap-4">
            {upcomingBookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="bg-gray-50 p-4 rounded-xl">
                <p className="font-semibold">{booking.course_name}</p>
                <p className="text-sm text-gray-500">{booking.client_name} — {booking.date}</p>
              </div>
            ))}

            {upcomingBookings.length === 0 && (
              <p className="text-gray-500">No upcoming bookings yet.</p>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">
            Finance Snapshot
          </h2>

          <div className="mt-6 flex flex-col gap-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="font-semibold">Unpaid invoices</p>
              <p className="text-sm text-gray-500">{unpaidInvoices.length} outstanding</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="font-semibold">Total invoice value</p>
              <p className="text-sm text-gray-500">£{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}