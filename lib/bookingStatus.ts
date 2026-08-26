export type BookingStatusLike = {
  status?: string | null
  date?: string | null
  end_date?: string | null
  end_time?: string | null
  booking_sessions?: Array<{
    session_date?: string | null
    end_time?: string | null
    sort_order?: number | null
  }> | null
}

const parseDateParts = (value?: string | null) => {
  if (!value) return null

  const [yearText, monthText, dayText] = String(value).split('T')[0].split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  return { year, month, day }
}

const parseTimeParts = (value?: string | null) => {
  if (!value) return { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 }

  const [hoursText, minutesText] = String(value).split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText || 0)

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return { hours: 23, minutes: 59, seconds: 59, milliseconds: 999 }
  }

  return { hours, minutes, seconds: 0, milliseconds: 0 }
}

const getSortedSessions = (booking: BookingStatusLike) =>
  Array.isArray(booking.booking_sessions)
    ? booking.booking_sessions
        .filter((session) => session.session_date)
        .sort((a, b) => {
          const orderDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0)
          if (orderDiff !== 0) return orderDiff

          return String(a.session_date || '').localeCompare(
            String(b.session_date || '')
          )
        })
    : []

export const getBookingEndDateTime = (booking: BookingStatusLike) => {
  const sessions = getSortedSessions(booking)
  const finalSession = sessions[sessions.length - 1]
  const dateParts = parseDateParts(
    finalSession?.session_date || booking.end_date || booking.date
  )

  if (!dateParts) return null

  const timeParts = parseTimeParts(finalSession?.end_time || booking.end_time)

  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hours,
    timeParts.minutes,
    timeParts.seconds,
    timeParts.milliseconds
  )
}

export const hasBookingEnded = (
  booking: BookingStatusLike,
  now = new Date()
) => {
  const endDateTime = getBookingEndDateTime(booking)

  return Boolean(endDateTime && now.getTime() > endDateTime.getTime())
}

export const getComputedBookingStatus = (
  booking: BookingStatusLike,
  now = new Date()
) => {
  const status = booking.status || 'scheduled'

  if (status === 'cancelled') return 'cancelled'
  if (status === 'completed') return 'completed'
  if (hasBookingEnded(booking, now)) return 'completed'

  return status
}
