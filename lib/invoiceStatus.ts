export type InvoiceStatusLike = {
  status?: string | null
  due_date?: string | null
  secured_at?: string | null
}

const inactiveStatuses = new Set(['cancelled', 'canceled', 'void'])

const parseDateParts = (value?: string | null) => {
  if (!value) return null

  const [yearText, monthText, dayText] = String(value).split('T')[0].split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  return { year, month, day }
}

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

export const isInvoiceOverdueByDate = (
  invoice: InvoiceStatusLike,
  today = new Date()
) => {
  const dateParts = parseDateParts(invoice.due_date)

  if (!dateParts) return false

  const dueStart = new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day
  ).getTime()

  return dueStart < startOfLocalDay(today)
}

export const getComputedInvoiceStatus = (
  invoice: InvoiceStatusLike,
  today = new Date()
) => {
  const status = invoice.status || 'draft'

  if (status === 'paid') return 'paid'
  if (inactiveStatuses.has(status)) return status
  if (isInvoiceOverdueByDate(invoice, today)) return 'overdue'

  return status
}

export const isInvoiceOutstanding = (
  invoice: InvoiceStatusLike,
  today = new Date()
) => {
  const status = getComputedInvoiceStatus(invoice, today)

  return status !== 'paid' && !inactiveStatuses.has(status)
}
