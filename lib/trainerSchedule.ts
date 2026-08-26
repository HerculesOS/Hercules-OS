export type TrainerScheduleBooking = {
  id: string
  trainer_id?: string | null
  date?: string | null
  end_date?: string | null
  end_time?: string | null
  status?: string | null
  booking_sessions?: Array<{
    session_date?: string | null
    end_time?: string | null
    sort_order?: number | null
  }> | null
}

export type TrainerScheduleRegisterLink = {
  booking_id?: string | null
  attendance_status?: string | null
  result_status?: string | null
}

const millisecondsPerDay = 1000 * 60 * 60 * 24

const getDateOnlyTime = (value?: string | null) => {
  if (!value) return null

  const dateOnly = String(value).split('T')[0]
  const [yearText, monthText, dayText] = dateOnly.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  return new Date(year, month - 1, day).getTime()
}

const normalizeBookingSessions = (booking: TrainerScheduleBooking) =>
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

const getBookingFirstSessionDateTime = (booking: TrainerScheduleBooking) => {
  const firstSession = normalizeBookingSessions(booking)[0]

  return getDateOnlyTime(firstSession?.session_date)
}

const startOfToday = (today: Date) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

const getBookingEndDateTime = (booking: TrainerScheduleBooking) => {
  const sessions = normalizeBookingSessions(booking)
  const finalSession = sessions[sessions.length - 1]

  if (finalSession) {
    const dateOnly = String(finalSession.session_date || '').split('T')[0]
    const [yearText, monthText, dayText] = dateOnly.split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)

    if (!year || !month || !day) return null

    if (!finalSession.end_time) {
      return new Date(year, month - 1, day, 23, 59, 59, 999)
    }

    const [hoursText, minutesText] = String(finalSession.end_time).split(':')
    const hours = Number(hoursText)
    const minutes = Number(minutesText || 0)

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return new Date(year, month - 1, day, 23, 59, 59, 999)
    }

    return new Date(year, month - 1, day, hours, minutes)
  }

  const dateOnly = String(booking.end_date || booking.date || '').split('T')[0]
  const [yearText, monthText, dayText] = dateOnly.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  if (!booking.end_time) {
    return new Date(year, month - 1, day, 23, 59, 59, 999)
  }

  const [hoursText, minutesText] = String(booking.end_time).split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText || 0)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return new Date(year, month - 1, day, 23, 59, 59, 999)
  }

  return new Date(year, month - 1, day, hours, minutes)
}

const getComputedBookingStatus = (
  booking: TrainerScheduleBooking,
  today = new Date()
) => {
  if (booking.status === 'cancelled') return 'cancelled'
  if (booking.status === 'completed') return 'completed'

  const endDateTime = getBookingEndDateTime(booking)

  return endDateTime && today.getTime() > endDateTime.getTime()
    ? 'completed'
    : booking.status || 'scheduled'
}

export const getBookingsForTrainer = <T extends TrainerScheduleBooking>(
  bookings: T[],
  trainerId: string
) => bookings.filter((booking) => booking.trainer_id === trainerId)

export const splitTrainerBookings = <T extends TrainerScheduleBooking>(
  bookings: T[],
  today = new Date()
) => {
  const todayTime = startOfToday(today)

  const upcoming = bookings
    .filter((booking) => {
      const computedStatus = getComputedBookingStatus(booking, today)

      if (computedStatus === 'cancelled') return false
      if (computedStatus === 'completed') return false

      const sessions = normalizeBookingSessions(booking)
      const endTime =
        sessions.length > 0
          ? Math.max(
              ...sessions
                .map((session) => getDateOnlyTime(session.session_date))
                .filter((time): time is number => time !== null)
            )
          : getDateOnlyTime(booking.end_date || booking.date)

      return endTime !== null && endTime >= todayTime
    })
    .sort((a, b) => {
      const dateDiff =
        (getBookingFirstSessionDateTime(a) || getDateOnlyTime(a.date) || 0) -
        (getBookingFirstSessionDateTime(b) || getDateOnlyTime(b.date) || 0)

      return dateDiff || String(b.id).localeCompare(String(a.id))
    })

  const recent = bookings
    .filter((booking) => {
      const sessions = normalizeBookingSessions(booking)
      const endTime =
        sessions.length > 0
          ? Math.max(
              ...sessions
                .map((session) => getDateOnlyTime(session.session_date))
                .filter((time): time is number => time !== null)
            )
          : getDateOnlyTime(booking.end_date || booking.date)
      const computedStatus = getComputedBookingStatus(booking, today)

      return (
        computedStatus === 'completed' ||
        (endTime !== null && endTime < todayTime)
      )
    })
    .sort((a, b) => {
      const dateDiff =
        (getBookingFirstSessionDateTime(b) || getDateOnlyTime(b.date) || 0) -
        (getBookingFirstSessionDateTime(a) || getDateOnlyTime(a.date) || 0)

      return dateDiff || String(b.id).localeCompare(String(a.id))
    })

  return { upcoming, recent }
}

export const getTrainerRegisterStatus = (
  bookingId: string,
  links: TrainerScheduleRegisterLink[]
) => {
  const bookingLinks = links.filter((link) => link.booking_id === bookingId)

  if (bookingLinks.length === 0) return 'not_started'

  const markedRows = bookingLinks.filter(
    (link) =>
      link.attendance_status !== 'not_marked' ||
      link.result_status !== 'not_assessed'
  )

  if (markedRows.length === 0) return 'not_started'

  const completeRows = bookingLinks.filter(
    (link) =>
      link.attendance_status &&
      link.attendance_status !== 'not_marked' &&
      link.result_status &&
      link.result_status !== 'not_assessed'
  )

  return completeRows.length === bookingLinks.length
    ? 'complete'
    : 'in_progress'
}

export const getTrainerWorkloadStats = (
  upcomingCount: number,
  recentCount: number,
  registerStatuses: string[]
) => ({
  upcomingCount,
  recentCount,
  completeRegisters: registerStatuses.filter((status) => status === 'complete')
    .length,
  incompleteRegisters: registerStatuses.filter((status) => status !== 'complete')
    .length,
})
