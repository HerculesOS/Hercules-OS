export type CertificateStatusLike = {
  status?: string | null
  expiry_date?: string | null
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

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

export const isCertificateExpiredByDate = (
  certificate: CertificateStatusLike,
  today = new Date()
) => {
  const dateParts = parseDateParts(certificate.expiry_date)

  if (!dateParts) return false

  const expiryStart = new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day
  ).getTime()

  return expiryStart < startOfLocalDay(today)
}

export const getComputedCertificateStatus = (
  certificate: CertificateStatusLike,
  today = new Date()
) => {
  const status = certificate.status || 'valid'

  if (status === 'revoked') return 'revoked'
  if (isCertificateExpiredByDate(certificate, today)) return 'expired'

  return status
}

export const isCertificateExpiringSoon = (
  certificate: CertificateStatusLike,
  today = new Date(),
  daysAhead = 90
) => {
  if (getComputedCertificateStatus(certificate, today) !== 'valid') {
    return false
  }

  const dateParts = parseDateParts(certificate.expiry_date)

  if (!dateParts) return false

  const expiryStart = new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day
  ).getTime()
  const todayStart = startOfLocalDay(today)
  const cutoffStart = todayStart + daysAhead * 24 * 60 * 60 * 1000

  return expiryStart >= todayStart && expiryStart <= cutoffStart
}
