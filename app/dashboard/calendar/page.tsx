'use client'

import { useEffect, useState } from 'react'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import { supabase } from '@/lib/supabaseClient'

const localizer = momentLocalizer(moment)

export default function CalendarPage() {
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    const { data: userData } = await supabase.auth.getUser()

    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userData.user?.id)

    if (!data) return

    const formatted = data.map((booking) => ({
      title: `${booking.client_name} - ${booking.course_name}`,
      start: new Date(booking.date),
      end: new Date(booking.date),
    }))

    setEvents(formatted)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Training Calendar
      </h1>

      <div className="bg-white p-4 rounded-2xl shadow-sm border h-[700px]">

        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
        />

      </div>
    </div>
  )
}