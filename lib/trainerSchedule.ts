export type TrainerScheduleBooking = {
  id: string
  trainer_id?: string | null
  date?: string | null
  end_date?: string | null
  status?: string | null
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

const startOfToday = (today: Date) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

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
      if (booking.status === 'cancelled') return false
      if (booking.status === 'completed') return false

      const endTime = getDateOnlyTime(booking.end_date || booking.date)

      return endTime !== null && endTime >= todayTime
    })
    .sort((a, b) => {
      const dateDiff =
        (getDateOnlyTime(a.date) || 0) - (getDateOnlyTime(b.date) || 0)

      return dateDiff || String(b.id).localeCompare(String(a.id))
    })

  const recent = bookings
    .filter((booking) => {
      const endTime = getDateOnlyTime(booking.end_date || booking.date)

      return (
        booking.status === 'completed' ||
        (endTime !== null && endTime < todayTime)
      )
    })
    .sort((a, b) => {
      const dateDiff =
        (getDateOnlyTime(b.date) || 0) - (getDateOnlyTime(a.date) || 0)

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
