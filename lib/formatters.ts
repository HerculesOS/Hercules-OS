export type DateFormatOption =
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'YYYY-MM-DD'
  | 'DD MMM YYYY'

export type TimeFormatOption = '24h' | '12h'

export type OrganisationFormattingSettings = {
  timezone?: string | null
  date_format?: DateFormatOption | string | null
  time_format?: TimeFormatOption | string | null
}

const getSafeTimezone = (timezone?: string | null) => {
  return timezone || 'Europe/London'
}

const getSafeDateFormat = (dateFormat?: string | null) => {
  return dateFormat || 'DD/MM/YYYY'
}

const getSafeTimeFormat = (timeFormat?: string | null) => {
  return timeFormat || '24h'
}

export const formatAppDate = (
  dateValue?: string | null,
  settings?: OrganisationFormattingSettings | null
) => {
  if (!dateValue) return 'Not set'

  const timezone = getSafeTimezone(settings?.timezone)
  const dateFormat = getSafeDateFormat(settings?.date_format)

  const date = new Date(`${dateValue}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return dateValue
  }

  if (dateFormat === 'YYYY-MM-DD') {
    return dateValue
  }

  if (dateFormat === 'MM/DD/YYYY') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  if (dateFormat === 'DD MMM YYYY') {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export const formatAppTime = (
  timeValue?: string | null,
  settings?: OrganisationFormattingSettings | null
) => {
  if (!timeValue) return 'Not set'

  const timeFormat = getSafeTimeFormat(settings?.time_format)

  const parts = timeValue.split(':')
  const hour = Number(parts[0])
  const minute = Number(parts[1] || 0)

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return timeValue
  }

  if (timeFormat === '12h') {
    const suffix = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    const displayMinute = String(minute).padStart(2, '0')

    return `${displayHour}:${displayMinute} ${suffix}`
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export const formatAppDateTime = (
  dateValue?: string | null,
  timeValue?: string | null,
  settings?: OrganisationFormattingSettings | null
) => {
  const formattedDate = formatAppDate(dateValue, settings)
  const formattedTime = formatAppTime(timeValue, settings)

  if (formattedDate === 'Not set' && formattedTime === 'Not set') {
    return 'Not set'
  }

  if (formattedTime === 'Not set') {
    return formattedDate
  }

  if (formattedDate === 'Not set') {
    return formattedTime
  }

  return `${formattedDate} · ${formattedTime}`
}

export const formatAppTimeRange = (
  startTime?: string | null,
  endTime?: string | null,
  settings?: OrganisationFormattingSettings | null
) => {
  const start = formatAppTime(startTime, settings)
  const end = formatAppTime(endTime, settings)

  if (start === 'Not set' && end === 'Not set') {
    return 'Not set'
  }

  if (start !== 'Not set' && end === 'Not set') {
    return start
  }

  if (start === 'Not set' && end !== 'Not set') {
    return end
  }

  return `${start} - ${end}`
}