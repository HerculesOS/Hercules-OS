export type BookingSession = {
  id?: string | null
  booking_id?: string | null
  organisation_id?: string | null
  session_date?: string | null
  start_time?: string | null
  end_time?: string | null
  sort_order?: number | null
}

export type BookingWithSessions = {
  date?: string | null
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  booking_sessions?: BookingSession[] | null
}

const getDateOnly = (value?: string | null) =>
  value ? String(value).split('T')[0] : ''

const getTimeOnly = (value?: string | null) =>
  value ? String(value).slice(0, 5) : ''

const addDaysToDate = (dateValue: string, daysToAdd: number) => {
  if (!dateValue) return ''

  const [yearText, monthText, dayText] = dateValue.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return ''

  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + daysToAdd)

  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')

  return `${nextYear}-${nextMonth}-${nextDay}`
}

const parseDateParts = (value?: string | null) => {
  const dateOnly = getDateOnly(value)
  const [yearText, monthText, dayText] = dateOnly.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  return { year, month, day }
}

const getDateOnlyTime = (value?: string | null) => {
  const parts = parseDateParts(value)

  if (!parts) return null

  return new Date(parts.year, parts.month - 1, parts.day).getTime()
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

export const createDefaultBookingSessions = (
  startDate: string,
  durationDays = 1,
  startTime?: string | null,
  endTime?: string | null
) => {
  if (!startDate) return []

  const safeDuration = Math.max(Math.floor(Number(durationDays) || 1), 1)

  return Array.from({ length: safeDuration }, (_, index) => ({
    session_date: addDaysToDate(startDate, index),
    start_time: getTimeOnly(startTime),
    end_time: getTimeOnly(endTime),
    sort_order: index + 1,
  }))
}

export const normalizeBookingSessions = (
  booking: BookingWithSessions
): BookingSession[] => {
  const savedSessions = Array.isArray(booking.booking_sessions)
    ? booking.booking_sessions
        .filter((session) => getDateOnly(session.session_date))
        .map((session, index) => ({
          ...session,
          session_date: getDateOnly(session.session_date),
          start_time: getTimeOnly(session.start_time),
          end_time: getTimeOnly(session.end_time),
          sort_order: Number(session.sort_order || index + 1),
        }))
        .sort((a, b) => {
          const orderDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0)
          if (orderDiff !== 0) return orderDiff

          return String(a.session_date || '').localeCompare(
            String(b.session_date || '')
          )
        })
    : []

  if (savedSessions.length > 0) return savedSessions

  const startDate = getDateOnly(booking.date)
  const endDate = getDateOnly(booking.end_date || booking.date)

  if (!startDate) return []

  const sessions: BookingSession[] = []
  let nextDate = startDate

  while (nextDate && nextDate <= endDate) {
    sessions.push({
      session_date: nextDate,
      start_time: getTimeOnly(booking.start_time),
      end_time: getTimeOnly(booking.end_time),
      sort_order: sessions.length + 1,
    })

    const followingDate = addDaysToDate(nextDate, 1)
    if (!followingDate || followingDate === nextDate) break
    nextDate = followingDate
  }

  return sessions
}

export const areBookingSessionsConsecutive = (sessions: BookingSession[]) => {
  if (sessions.length <= 1) return true

  return sessions.every((session, index) => {
    if (index === 0) return true

    const previousDate = sessions[index - 1]?.session_date
    return previousDate
      ? session.session_date === addDaysToDate(previousDate, 1)
      : false
  })
}

export const getFirstBookingSession = (booking: BookingWithSessions) =>
  normalizeBookingSessions(booking)[0] || null

export const getFinalBookingSession = (booking: BookingWithSessions) => {
  const sessions = normalizeBookingSessions(booking)

  return sessions[sessions.length - 1] || null
}

export const getBookingLegacyDateFieldsFromSessions = (
  sessions: BookingSession[]
) => {
  const normalizedSessions = normalizeBookingSessions({
    booking_sessions: sessions,
  })
  const firstSession = normalizedSessions[0]
  const finalSession = normalizedSessions[normalizedSessions.length - 1]

  return {
    date: firstSession?.session_date || '',
    end_date: finalSession?.session_date || firstSession?.session_date || '',
    start_time: firstSession?.start_time || null,
    end_time: finalSession?.end_time || null,
  }
}

export const getBookingSessionPayload = (
  bookingId: string,
  organisationId: string,
  sessions: BookingSession[]
) =>
  normalizeBookingSessions({ booking_sessions: sessions }).map(
    (session, index) => ({
      booking_id: bookingId,
      organisation_id: organisationId,
      session_date: session.session_date,
      start_time: session.start_time || null,
      end_time: session.end_time || null,
      sort_order: index + 1,
    })
  )

export const getBookingEndDateTimeFromSessions = (
  booking: BookingWithSessions
) => {
  const finalSession = getFinalBookingSession(booking)
  const dateParts = parseDateParts(finalSession?.session_date)

  if (!dateParts) return null

  const timeParts = parseTimeParts(finalSession?.end_time)

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

export const bookingOccursOnDate = (
  booking: BookingWithSessions,
  dateValue: string
) =>
  normalizeBookingSessions(booking).some(
    (session) => session.session_date === dateValue
  )

export const getBookingSessionForDate = (
  booking: BookingWithSessions,
  dateValue: string
) =>
  normalizeBookingSessions(booking).find(
    (session) => session.session_date === dateValue
  ) || null

export const bookingOverlapsDateRange = (
  booking: BookingWithSessions,
  rangeStart: string,
  rangeEnd: string
) =>
  normalizeBookingSessions(booking).some((session) => {
    const sessionDate = session.session_date || ''
    return sessionDate >= rangeStart && sessionDate <= rangeEnd
  })

export const getBookingSessionDateSummary = (
  booking: BookingWithSessions,
  formatDate: (dateValue: string | null | undefined) => string
) => {
  const sessions = normalizeBookingSessions(booking)

  if (sessions.length === 0) return formatDate(booking.date)
  if (sessions.length === 1) return formatDate(sessions[0].session_date)

  const firstSession = sessions[0]
  const finalSession = sessions[sessions.length - 1]

  if (areBookingSessionsConsecutive(sessions)) {
    return `${formatDate(firstSession.session_date)} - ${formatDate(
      finalSession.session_date
    )}`
  }

  return `${sessions.length} course days`
}

export const getBookingSessionDatesText = (
  booking: BookingWithSessions,
  formatDate: (dateValue: string | null | undefined) => string,
  formatTimeRange?: (
    startTimeValue: string | null | undefined,
    endTimeValue: string | null | undefined
  ) => string
) => {
  const sessions = normalizeBookingSessions(booking)

  if (sessions.length === 0) return getBookingSessionDateSummary(booking, formatDate)

  return sessions
    .map((session, index) => {
      const dateText = formatDate(session.session_date)
      const timeText = formatTimeRange
        ? formatTimeRange(session.start_time, session.end_time)
        : ''
      const parts = [`Day ${index + 1}: ${dateText}`]

      if (timeText && timeText !== 'Not set') {
        parts.push(timeText)
      }

      return parts.join(', ')
    })
    .join('; ')
}

export const getBookingSessionSearchText = (booking: BookingWithSessions) =>
  normalizeBookingSessions(booking)
    .map((session) =>
      [session.session_date, session.start_time, session.end_time]
        .filter(Boolean)
        .join(' ')
    )
    .join(' ')

export const isBookingSessionRangeConsecutive = (
  booking: BookingWithSessions
) => areBookingSessionsConsecutive(normalizeBookingSessions(booking))

export const getBookingFirstSessionDateTime = (
  booking: BookingWithSessions
) => {
  const firstSession = getFirstBookingSession(booking)

  return getDateOnlyTime(firstSession?.session_date)
}
