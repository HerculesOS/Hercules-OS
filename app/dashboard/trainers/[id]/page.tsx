'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate, formatAppTimeRange } from '@/lib/formatters'
import {
  getBookingsForTrainer,
  getTrainerRegisterStatus,
  getTrainerWorkloadStats,
  splitTrainerBookings,
} from '@/lib/trainerSchedule'

const registerStatusCopy: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
}

const registerStatusClass: Record<string, string> = {
  not_started: 'bg-slate-50 text-slate-700 border-slate-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-100',
  complete: 'bg-emerald-50 text-emerald-700 border-emerald-100',
}

export default function TrainerDetailPage() {
  const params = useParams()
  const trainerId = params.id as string

  const [trainer, setTrainer] = useState<any>(null)
  const [organisation, setOrganisation] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [bookingDelegateLinks, setBookingDelegateLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single()

    const { data: trainerData, error: trainerError } = await supabase
      .from('trainers')
      .select('*')
      .eq('id', trainerId)
      .eq('organisation_id', profile.organisation_id)
      .single()

    if (trainerError || !trainerData) {
      setTrainer(null)
      setLoading(false)
      return
    }

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .eq('trainer_id', trainerId)
      .eq('organisation_id', profile.organisation_id)
      .order('date', { ascending: true })

    const bookingIds = (bookingsData || []).map((booking) => booking.id)
    let linksData: any[] = []

    if (bookingIds.length > 0) {
      const { data } = await supabase
        .from('booking_delegates')
        .select('*')
        .eq('organisation_id', profile.organisation_id)
        .in('booking_id', bookingIds)

      linksData = data || []
    }

    setOrganisation(organisationData || null)
    setTrainer(trainerData)
    setClients(clientsData || [])
    setBookings(bookingsData || [])
    setBookingDelegateLinks(linksData)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const trainerBookings = useMemo(
    () => getBookingsForTrainer(bookings, trainerId),
    [bookings, trainerId]
  )
  const { upcoming, recent } = useMemo(
    () => splitTrainerBookings(trainerBookings),
    [trainerBookings]
  )
  const registerStatuses = trainerBookings.map((booking) =>
    getTrainerRegisterStatus(booking.id, bookingDelegateLinks)
  )
  const stats = getTrainerWorkloadStats(
    upcoming.length,
    recent.length,
    registerStatuses
  )

  const getFormattedDate = (dateValue: string | null | undefined) =>
    formatAppDate(dateValue, organisation)

  const getFormattedTimeRange = (booking: any) =>
    formatAppTimeRange(booking.start_time, booking.end_time, organisation)

  const getClientForBooking = (booking: any) => {
    if (!booking?.client_id) return null
    return clients.find((client) => client.id === booking.client_id)
  }

  const getBookingClientDisplay = (booking: any) => {
    const client = getClientForBooking(booking)

    if (client?.company) return client.company
    if (booking.course_delivery_type === 'public') return 'Public course'

    return booking.client_name || 'No client'
  }

  const BookingCard = ({ booking }: { booking: any }) => {
    const registerStatus = getTrainerRegisterStatus(
      booking.id,
      bookingDelegateLinks
    )

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-950">
                {booking.course_name || 'Untitled course'}
              </h3>

              <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${registerStatusClass[registerStatus]}`}>
                {registerStatusCopy[registerStatus]}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-600">
              {getFormattedDate(booking.date)}
              {booking.end_date && booking.end_date !== booking.date
                ? ` to ${getFormattedDate(booking.end_date)}`
                : ''}
              {booking.start_time ? ` - ${getFormattedTimeRange(booking)}` : ''}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {getBookingClientDisplay(booking)}
              {booking.location ? ` - ${booking.location}` : ''}
            </p>
          </div>

          <Link
            href={`/dashboard/bookings/${booking.id}`}
            className={buttonSecondary}
          >
            View booking
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading trainer...
        </div>
      </div>
    )
  }

  if (!trainer) {
    return (
      <div>
        <Link
          href="/dashboard/trainers"
          className="text-sm text-slate-500 hover:text-slate-950"
        >
          Back to trainers
        </Link>

        <div className={`${panelClass} mt-4`}>
          <div className="p-4 text-sm text-slate-500">
            Trainer not found.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/dashboard/trainers"
          className="text-sm text-slate-500 hover:text-slate-950"
        >
          Back to trainers
        </Link>
      </div>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Trainer profile
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              {trainer.name}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {trainer.email || 'No email set'}
              {trainer.phone ? ` - ${trainer.phone}` : ''}
            </p>
          </div>

          <Link href="/dashboard/bookings" className={buttonPrimary}>
            Create booking
          </Link>
        </div>

        {trainer.notes && (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {trainer.notes}
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ['Upcoming', stats.upcomingCount, 'Assigned upcoming courses'],
          ['Recent', stats.recentCount, 'Past or completed courses'],
          ['Registers complete', stats.completeRegisters, 'Completed registers'],
          ['Registers to finish', stats.incompleteRegisters, 'Need attention'],
        ].map(([label, value, detail]) => (
          <div
            key={label}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </p>

            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {value}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {detail}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className={panelClass}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Upcoming courses
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Assigned bookings still to deliver.
            </p>
          </div>

          <div className="grid gap-3 p-4">
            {upcoming.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}

            {upcoming.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No upcoming courses assigned.
              </p>
            )}
          </div>
        </div>

        <div className={panelClass}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Recent / completed courses
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Recent delivery history for this trainer.
            </p>
          </div>

          <div className="grid gap-3 p-4">
            {recent.slice(0, 10).map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}

            {recent.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No recent courses yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
