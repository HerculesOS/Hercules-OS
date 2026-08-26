const millisecondsPerDay = 1000 * 60 * 60 * 24

type BookingSession = {
  session_date?: string | null
  end_time?: string | null
  sort_order?: number | null
}

export type DashboardBooking = {
  id: string
  date?: string | null
  end_date?: string | null
  end_time?: string | null
  status?: string | null
  course_name?: string | null
  created_at?: string | null
  booking_sessions?: BookingSession[] | null
}

export type DashboardInvoice = {
  id: string
  due_date?: string | null
  status?: string | null
  amount?: number | string | null
  total_amount?: number | string | null
  created_at?: string | null
  paid_at?: string | null
}

export type DashboardCertificate = {
  id: string
  issue_date?: string | null
  expiry_date?: string | null
  status?: string | null
  delegate_id?: string | null
  expiry_reminder_sent_at?: string | null
}

export type DashboardRequest = {
  id: string
  status?: string | null
  created_at?: string | null
}

export type DashboardRegisterLink = {
  booking_id?: string | null
  attendance_status?: string | null
  result_status?: string | null
}

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

const normalizeBookingSessions = (booking: DashboardBooking) =>
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

const bookingOccursOnDate = (booking: DashboardBooking, dateValue: string) =>
  normalizeBookingSessions(booking).some(
    (session) => session.session_date === dateValue
  )

const bookingOverlapsDateRange = (
  booking: DashboardBooking,
  rangeStart: string,
  rangeEnd: string
) => {
  const sessions = normalizeBookingSessions(booking)

  if (sessions.length > 0) {
    return sessions.some((session) => {
      const sessionDate = String(session.session_date || '')
      return sessionDate >= rangeStart && sessionDate <= rangeEnd
    })
  }

  const startDate = String(booking.date || '')
  const endDate = String(booking.end_date || booking.date || '')

  return Boolean(startDate && startDate <= rangeEnd && endDate >= rangeStart)
}

const getBookingFirstSessionDateTime = (booking: DashboardBooking) => {
  const firstSession = normalizeBookingSessions(booking)[0]

  return getDateOnlyTime(firstSession?.session_date)
}

const getDaysUntilDate = (value?: string | null, today = new Date()) => {
  const dateTime = getDateOnlyTime(value)

  if (dateTime === null) return null

  return Math.ceil((dateTime - startOfToday(today)) / millisecondsPerDay)
}

const getComputedCertificateStatus = (
  certificate: DashboardCertificate,
  today = new Date()
) => {
  if (certificate.status === 'revoked') return 'revoked'

  const expiryTime = getDateOnlyTime(certificate.expiry_date)

  if (expiryTime !== null && expiryTime < startOfToday(today)) {
    return 'expired'
  }

  return certificate.status || 'valid'
}

const inactiveInvoiceStatuses = new Set(['cancelled', 'canceled', 'void'])

const getComputedInvoiceStatus = (
  invoice: DashboardInvoice,
  today = new Date()
) => {
  if (invoice.status === 'paid') return 'paid'
  if (invoice.status && inactiveInvoiceStatuses.has(invoice.status)) {
    return invoice.status
  }

  const dueTime = getDateOnlyTime(invoice.due_date)

  if (dueTime !== null && dueTime < startOfToday(today)) {
    return 'overdue'
  }

  return invoice.status || 'draft'
}

const isInvoiceOutstanding = (
  invoice: DashboardInvoice,
  today = new Date()
) => {
  const status = getComputedInvoiceStatus(invoice, today)

  return status !== 'paid' && !inactiveInvoiceStatuses.has(status)
}

const startOfToday = (today: Date) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

const endOfToday = (today: Date) =>
  startOfToday(today) + millisecondsPerDay - 1

const startOfMonth = (today: Date) =>
  new Date(today.getFullYear(), today.getMonth(), 1).getTime()

const endOfMonth = (today: Date) =>
  new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

const getBookingEndTime = (booking: DashboardBooking) => {
  const sessions = normalizeBookingSessions(booking)
  const finalSession = sessions[sessions.length - 1]
  const finalSessionTime = finalSession
    ? getDateOnlyTime(finalSession.session_date)
    : null

  if (finalSession && finalSessionTime !== null) {
    const [hoursText, minutesText] = String(finalSession.end_time || '').split(':')
    const hours = Number(hoursText)
    const minutes = Number(minutesText || 0)
    const dateOnly = String(finalSession.session_date || '').split('T')[0]
    const [yearText, monthText, dayText] = dateOnly.split('-')
    const year = Number(yearText)
    const month = Number(monthText)
    const day = Number(dayText)

    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return new Date(year, month - 1, day, hours, minutes).getTime()
    }

    return new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
  }

  const dateOnly = String(booking.end_date || booking.date || '').split('T')[0]
  const [yearText, monthText, dayText] = dateOnly.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  if (!booking.end_time) {
    return new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
  }

  const [hoursText, minutesText] = String(booking.end_time).split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText || 0)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
  }

  return new Date(year, month - 1, day, hours, minutes).getTime()
}

const getComputedBookingStatus = (
  booking: DashboardBooking,
  today = new Date()
) => {
  if (booking.status === 'cancelled') return 'cancelled'
  if (booking.status === 'completed') return 'completed'

  const endTime = getBookingEndTime(booking)

  return endTime !== null && today.getTime() > endTime
    ? 'completed'
    : booking.status || 'scheduled'
}

export const getInvoiceAmount = (invoice: DashboardInvoice) =>
  Number(invoice.total_amount || invoice.amount || 0)

export const isWithinCurrentMonth = (
  value?: string | null,
  today = new Date()
) => {
  const dateTime = getDateOnlyTime(value)

  return (
    dateTime !== null &&
    dateTime >= startOfMonth(today) &&
    dateTime <= endOfMonth(today)
  )
}

export const getUpcomingBookings = (
  bookings: DashboardBooking[],
  today = new Date(),
  daysAhead = 7
) => {
  const todayTime = startOfToday(today)
  const cutoffTime = todayTime + daysAhead * millisecondsPerDay

  return bookings
    .filter((booking) => {
      const computedStatus = getComputedBookingStatus(booking, today)

      if (computedStatus === 'cancelled') return false
      if (computedStatus === 'completed') return false

      const sessions = normalizeBookingSessions(booking)
      const hasSessions = sessions.length > 0
      const startTime = hasSessions
        ? Math.min(
            ...sessions
              .map((session) => getDateOnlyTime(session.session_date))
              .filter((time): time is number => time !== null)
          )
        : getDateOnlyTime(booking.date)
      const endTime = hasSessions
        ? Math.max(
            ...sessions
              .map((session) => getDateOnlyTime(session.session_date))
              .filter((time): time is number => time !== null)
          )
        : getDateOnlyTime(booking.end_date || booking.date)

      return (
        startTime !== null &&
        endTime !== null &&
        endTime >= todayTime &&
        startTime <= cutoffTime
      )
    })
    .sort((a, b) => {
      const dateDiff =
        (getBookingFirstSessionDateTime(a) || getDateOnlyTime(a.date) || 0) -
        (getBookingFirstSessionDateTime(b) || getDateOnlyTime(b.date) || 0)

      if (dateDiff !== 0) return dateDiff

      return String(b.created_at || '').localeCompare(String(a.created_at || ''))
    })
}

export const getTodaysBookings = (
  bookings: DashboardBooking[],
  today = new Date()
) => {
  const todayStart = startOfToday(today)
  const todayEnd = endOfToday(today)

  return bookings.filter((booking) => {
    const computedStatus = getComputedBookingStatus(booking, today)

    if (computedStatus === 'cancelled') return false
    if (computedStatus === 'completed') return false

    const todayValue = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    if (normalizeBookingSessions(booking).length > 0) {
      return bookingOccursOnDate(booking, todayValue)
    }

    const startTime = getDateOnlyTime(booking.date)
    const endTime = getDateOnlyTime(booking.end_date || booking.date)

    return (
      startTime !== null &&
      endTime !== null &&
      startTime <= todayEnd &&
      endTime >= todayStart
    )
  })
}

export const getOverdueInvoices = (
  invoices: DashboardInvoice[],
  today = new Date()
) => {
  const todayTime = startOfToday(today)

  return invoices.filter((invoice) => {
    const computedStatus = getComputedInvoiceStatus(invoice, today)

    if (computedStatus === 'paid') return false
    if (inactiveInvoiceStatuses.has(computedStatus)) return false

    const dueTime = getDateOnlyTime(invoice.due_date)

    return dueTime !== null && dueTime < todayTime
  })
}

export const getBookingsWithIncompleteRegisters = (
  bookings: DashboardBooking[],
  links: DashboardRegisterLink[]
) => {
  return bookings.filter((booking) => {
    if (getComputedBookingStatus(booking) === 'cancelled') return false

    const bookingLinks = links.filter((link) => link.booking_id === booking.id)

    if (bookingLinks.length === 0) return false

    return bookingLinks.some(
      (link) =>
        !link.attendance_status ||
        link.attendance_status === 'not_marked' ||
        !link.result_status ||
        link.result_status === 'not_assessed'
    )
  })
}

export const getMoneySnapshot = (
  invoices: DashboardInvoice[],
  today = new Date()
) => {
  const invoicesThisMonth = invoices.filter((invoice) =>
    isWithinCurrentMonth(invoice.created_at, today)
  )

  const paidThisMonthInvoices = invoices.filter(
    (invoice) =>
      invoice.status === 'paid' && isWithinCurrentMonth(invoice.paid_at, today)
  )

  const outstandingInvoices = invoices.filter(
    (invoice) => isInvoiceOutstanding(invoice, today)
  )

  return {
    revenueThisMonth: invoicesThisMonth.reduce(
      (sum, invoice) => sum + getInvoiceAmount(invoice),
      0
    ),
    paidThisMonth: paidThisMonthInvoices.reduce(
      (sum, invoice) => sum + getInvoiceAmount(invoice),
      0
    ),
    outstandingAmount: outstandingInvoices.reduce(
      (sum, invoice) => sum + getInvoiceAmount(invoice),
      0
    ),
    outstandingCount: outstandingInvoices.length,
    overdueCount: getOverdueInvoices(invoices, today).length,
  }
}

export const getTrainingSnapshot = (
  bookings: DashboardBooking[],
  delegates: Array<{ created_at?: string | null }>,
  certificates: DashboardCertificate[],
  today = new Date()
) => {
  return {
    bookingsThisMonth: bookings.filter((booking) =>
      bookingOverlapsDateRange(
        booking,
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
      )
    ).length,
    delegatesThisMonth: delegates.filter((delegate) =>
      isWithinCurrentMonth(delegate.created_at, today)
    ).length,
    certificatesIssuedThisMonth: certificates.filter((certificate) =>
      isWithinCurrentMonth(certificate.issue_date, today)
    ).length,
    expiringSoonCount: certificates.filter((certificate) => {
      if (getComputedCertificateStatus(certificate, today) !== 'valid') return false

      const days = getDaysUntilDate(certificate.expiry_date, today)

      return days !== null && days >= 0 && days <= 90
    }).length,
  }
}

export const getDashboardActionCounts = ({
  requests,
  invoices,
  certificates,
  bookings,
  bookingDelegateLinks,
  delegates,
  clients,
  today = new Date(),
}: {
  requests: DashboardRequest[]
  invoices: DashboardInvoice[]
  certificates: DashboardCertificate[]
  bookings: DashboardBooking[]
  bookingDelegateLinks: DashboardRegisterLink[]
  delegates: Array<{
    id: string
    client_id?: string | null
    created_at?: string | null
  }>
  clients: Array<{ id: string }>
  today?: Date
}) => {
  const openRequests = requests.filter((request) =>
    ['new', 'contacted'].includes(String(request.status || 'new'))
  )

  const renewalOpportunities = certificates
    .filter(
      (certificate) =>
        getComputedCertificateStatus(certificate, today) !== 'revoked'
    )
    .map((certificate) => {
      const daysUntilExpiry = getDaysUntilDate(certificate.expiry_date, today)

      if (daysUntilExpiry === null || daysUntilExpiry > 90) return null

      const delegate = delegates.find(
        (item) => item.id === certificate.delegate_id
      )
      const client = delegate?.client_id
        ? clients.find((item) => item.id === delegate.client_id)
        : null
      const window =
        daysUntilExpiry < 0
          ? 'expired'
          : daysUntilExpiry <= 30
            ? '30'
            : daysUntilExpiry <= 60
              ? '60'
              : '90'

      return { certificate, delegate, client, window }
    })
    .filter(Boolean) as Array<{
      certificate: DashboardCertificate
      delegate?: { id: string; client_id?: string | null }
      client?: { id: string } | null
      window: 'expired' | '30' | '60' | '90'
    }>
  const affectedClients = new Set(
    renewalOpportunities.map((opportunity) => opportunity.client?.id || 'no-client')
  )

  return {
    openRequests: openRequests.length,
    overdueInvoices: getOverdueInvoices(invoices, today).length,
    expiringSoonCertificates: getTrainingSnapshot(
      bookings,
      delegates,
      certificates,
      today
    ).expiringSoonCount,
    renewalOpportunities: renewalOpportunities.length,
    incompleteRegisters: getBookingsWithIncompleteRegisters(
      bookings,
      bookingDelegateLinks
    ).length,
    renewalSummary: {
      expired: renewalOpportunities.filter((item) => item.window === 'expired').length,
      within30: renewalOpportunities.filter((item) => item.window === '30').length,
      within60: renewalOpportunities.filter((item) => item.window === '60').length,
      within90: renewalOpportunities.filter((item) => item.window === '90').length,
      clientsAffected: affectedClients.size,
      potentialRenewalDelegates: renewalOpportunities.length,
    },
  }
}
