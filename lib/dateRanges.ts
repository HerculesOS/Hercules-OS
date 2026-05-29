const millisecondsPerDay = 1000 * 60 * 60 * 24

export const getLocalDateOnlyTime = (dateValue: string | null | undefined) => {
  if (!dateValue) return null

  const dateOnly = String(dateValue).split('T')[0]
  const [yearText, monthText, dayText] = dateOnly.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  return new Date(year, month - 1, day).getTime()
}

export const getDaysUntilLocalDate = (
  dateValue: string | null | undefined,
  today = new Date()
) => {
  const dateTime = getLocalDateOnlyTime(dateValue)

  if (dateTime === null) return null

  const todayTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime()

  return Math.ceil((dateTime - todayTime) / millisecondsPerDay)
}

export const isLocalDateWithinNextDays = (
  dateValue: string | null | undefined,
  days: number,
  today = new Date()
) => {
  const daysUntilDate = getDaysUntilLocalDate(dateValue, today)

  return daysUntilDate !== null && daysUntilDate >= 0 && daysUntilDate <= days
}
