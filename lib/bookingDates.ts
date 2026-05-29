export const addDaysToDate = (dateValue: string, daysToAdd: number) => {
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

export const getCourseDurationDays = (courseTemplate: any) => {
  const durationDays = Number(courseTemplate?.duration_days || 1)

  if (!Number.isFinite(durationDays) || durationDays < 1) return 1

  return Math.floor(durationDays)
}

export const getDefaultEndDateForDuration = (
  startDate: string,
  durationDays: number
) => {
  if (!startDate) return ''

  return addDaysToDate(startDate, Math.max(durationDays - 1, 0))
}
