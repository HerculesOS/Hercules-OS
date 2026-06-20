export type AttendanceStatus = 'not_marked' | 'present' | 'absent'
export type ResultStatus = 'not_assessed' | 'passed' | 'failed'
export type RegisterStatus = 'not_started' | 'in_progress' | 'complete'

export type RegisterRow = {
  attendance_status?: AttendanceStatus | null
  result_status?: ResultStatus | null
}

export const normalizeAttendanceStatus = (
  status?: string | null
): AttendanceStatus => {
  if (status === 'present' || status === 'absent') return status

  return 'not_marked'
}

export const normalizeResultStatus = (
  status?: string | null
): ResultStatus => {
  if (status === 'passed' || status === 'failed') return status

  return 'not_assessed'
}

export const normalizeRegisterRow = <T extends RegisterRow>(row: T): T & {
  attendance_status: AttendanceStatus
  result_status: ResultStatus
} => {
  const attendanceStatus = normalizeAttendanceStatus(row.attendance_status)
  const resultStatus = normalizeResultStatus(row.result_status)

  return {
    ...row,
    attendance_status: attendanceStatus,
    result_status:
      attendanceStatus === 'absent' && resultStatus === 'passed'
        ? 'failed'
        : resultStatus,
  }
}

export const isCertificateEligible = (row: RegisterRow) => {
  const normalized = normalizeRegisterRow(row)

  return (
    normalized.attendance_status === 'present' &&
    normalized.result_status === 'passed'
  )
}

export const getRegisterStatus = (rows: RegisterRow[]): RegisterStatus => {
  if (rows.length === 0) return 'not_started'

  const markedRows = rows.filter((row) => {
    const normalized = normalizeRegisterRow(row)

    return (
      normalized.attendance_status !== 'not_marked' ||
      normalized.result_status !== 'not_assessed'
    )
  })

  if (markedRows.length === 0) return 'not_started'

  const completeRows = rows.filter((row) => {
    const normalized = normalizeRegisterRow(row)

    return (
      normalized.attendance_status !== 'not_marked' &&
      normalized.result_status !== 'not_assessed'
    )
  })

  return completeRows.length === rows.length ? 'complete' : 'in_progress'
}
