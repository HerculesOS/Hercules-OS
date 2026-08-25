export type InvoiceDueDateBookingLike = {
  date?: string | null
  created_at?: string | null
}

export type InvoiceSentStatusLike = {
  status?: string | null
}

const parseDateOnly = (value?: string | null) => {
  if (!value) return null

  const [yearText, monthText, dayText] = String(value).split('T')[0].split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export const calculateDefaultInvoiceDueDate = (
  booking?: InvoiceDueDateBookingLike | null,
  invoiceCreatedAt = new Date()
) => {
  const bookingCreatedDate =
    parseDateOnly(booking?.created_at) || parseDateOnly(invoiceCreatedAt.toISOString())
  const courseStartDate = parseDateOnly(booking?.date)

  if (!bookingCreatedDate && !courseStartDate) return ''
  if (!bookingCreatedDate) return toDateInputValue(courseStartDate!)

  const thirtyDaysFromBooking = new Date(bookingCreatedDate)
  thirtyDaysFromBooking.setDate(bookingCreatedDate.getDate() + 30)

  if (!courseStartDate) return toDateInputValue(thirtyDaysFromBooking)

  return toDateInputValue(
    courseStartDate.getTime() < thirtyDaysFromBooking.getTime()
      ? courseStartDate
      : thirtyDaysFromBooking
  )
}

export const getSentInvoiceUpdate = (
  invoice: InvoiceSentStatusLike,
  sentAt = new Date().toISOString()
) => {
  if (invoice.status === 'paid') {
    return { sent_at: sentAt }
  }

  return {
    status: 'sent',
    sent_at: sentAt,
  }
}

export const getInvoiceEmailSuccessUpdate = (
  emailSucceeded: boolean,
  invoice: InvoiceSentStatusLike,
  sentAt = new Date().toISOString()
) => {
  if (!emailSucceeded) return null

  return getSentInvoiceUpdate(invoice, sentAt)
}

export const normalizeOptionalPoNumber = (value?: string | null) => {
  const trimmed = String(value || '').trim()

  return trimmed || null
}
