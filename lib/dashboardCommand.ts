const millisecondsPerDay = 1000 * 60 * 60 * 24

export type DashboardBooking = {
  id: string
  date?: string | null
  end_date?: string | null
  end_time?: string | null
  status?: string | null
  course_name?: string | null
  created_at?: string | null
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

const startOfToday = (today: Date) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

const endOfToday = (today: Date) =>
  startOfToday(today) + millisecondsPerDay - 1

const startOfMonth = (today: Date) =>
  new Date(today.getFullYear(), today.getMonth(), 1).getTime()

const endOfMonth = (today: Date) =>
  new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

const getBookingEndTime = (booking: DashboardBooking) => {
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

      const startTime = getDateOnlyTime(booking.date)
      const endTime = getDateOnlyTime(booking.end_date || booking.date)

      return (
        startTime !== null &&
        endTime !== null &&
        endTime >= todayTime &&
        startTime <= cutoffTime
      )
    })
    .sort((a, b) => {
      const dateDiff =
        (getDateOnlyTime(a.date) || 0) - (getDateOnlyTime(b.date) || 0)

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
    if (invoice.status === 'paid') return false

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
    (invoice) => invoice.status !== 'paid'
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
      isWithinCurrentMonth(booking.date, today)
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
