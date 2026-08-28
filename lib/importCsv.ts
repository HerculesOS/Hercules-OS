export type ExistingClientForImport = {
  id: string
  company?: string | null
  name?: string | null
  email?: string | null
}

export type ExistingDelegateForImport = {
  id: string
  full_name?: string | null
  email?: string | null
  client_id?: string | null
}

export type ExistingTrainerForImport = {
  id: string
  name?: string | null
  email?: string | null
}

export type ExistingCourseTemplateForImport = {
  id: string
  name?: string | null
  code?: string | null
  price?: number | string | null
  duration_days?: number | string | null
  default_start_time?: string | null
  default_end_time?: string | null
}

export type ExistingBookingForImport = {
  id: string
  course_name?: string | null
  course_delivery_type?: string | null
  client_id?: string | null
  client_name?: string | null
  location?: string | null
  date?: string | null
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  booking_sessions?: Array<{
    session_date?: string | null
    start_time?: string | null
    end_time?: string | null
    sort_order?: number | null
  }> | null
}

export type ExistingBookingDelegateLinkForImport = {
  booking_id?: string | null
  delegate_id?: string | null
}

export type ImportStatus = 'valid' | 'warning' | 'error'

export type ImportPreviewRow<T> = {
  rowNumber: number
  data: T
  status: ImportStatus
  errors: string[]
  warnings: string[]
  willImport: boolean
}

export type ImportPreview<T> = {
  requiredHeaders: string[]
  headers: string[]
  duplicateHeaders: string[]
  missingHeaders: string[]
  totalRows: number
  blankRows: number
  validRows: number
  warningRows: number
  errorRows: number
  importableRows: number
  skippedRows: number
  rows: ImportPreviewRow<T>[]
}

export type PaginatedFetchResult<T> = {
  data: T[] | null
  error?: { message?: string } | null
}

export type ClientImportData = {
  client_name: string
  primary_contact: string
  email: string
  phone: string
  address: string
  notes: string
}

export type ClientInsertRecord = {
  organisation_id: string
  user_id: string | null
  company: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
}

export type DelegateImportData = {
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  client_name: string
  notes: string
  matchedClientId: string | null
  shouldCreateClient: boolean
  clientPreview: string
}

export type BookingImportSessionData = {
  session_date: string
  start_time: string
  end_time: string
  sort_order: number
}

export type BookingImportDelegateData = {
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  matchedDelegateId: string | null
  shouldCreateDelegate: boolean
  delegatePreview: string
}

export type BookingImportData = {
  course_name: string
  client_name: string
  booking_contact_name: string
  booking_contact_email: string
  booking_contact_phone: string
  location: string
  trainer_name: string
  status: string
  course_delivery_type: 'private' | 'public'
  notes: string
  matchedClientId: string | null
  shouldCreateClient: boolean
  clientPreview: string
  matchedCourseTemplateId: string | null
  matchedTrainerId: string | null
  sessions: BookingImportSessionData[]
  delegate: BookingImportDelegateData | null
  duplicateBookingId: string | null
}

export type MissingClientInsertRecord = {
  organisation_id: string
  user_id: string | null
  company: string
  name: string
  email: null
  phone: null
  address: null
  notes: string
}

export type BookingInsertRecord = {
  user_id: string | null
  organisation_id: string
  course_delivery_type: 'private' | 'public'
  client_id: string | null
  trainer_id: string | null
  course_template_id: string | null
  certificate_template_id?: string | null
  client_name: string | null
  course_name: string
  date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  location: string | null
  booking_contact_name: string | null
  booking_contact_email: string | null
  booking_contact_phone: string | null
  price: number | null
  notes: string | null
  status: string
}

export type BookingSessionInsertRecord = {
  booking_id: string
  organisation_id: string
  session_date: string
  start_time: string | null
  end_time: string | null
  sort_order: number
}

export type BookingDelegateInsertRecord = {
  organisation_id: string
  booking_id: string
  delegate_id: string
  attendance_status: 'not_marked'
  result_status: 'not_assessed'
  attendance_notes: null
  unit_price?: number
}

export const IMPORT_BATCH_SIZE = 500
export const IMPORT_LOOKUP_PAGE_SIZE = 1000
export const IMPORT_PREVIEW_ROW_LIMIT = 100

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().replace(/[\s_-]+/g, '_')

const normalizeValue = (value: string) => value.trim()

const normalizeMatch = (value?: string | null) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ')

export const normalizeImportName = (value?: string | null) =>
  (value || '').trim().replace(/\s+/g, ' ')

const normalizeLooseMatch = (value?: string | null) =>
  normalizeMatch(value).replace(/\s+/g, '')

const getValue = (
  row: Record<string, string>,
  aliases: string[]
) => {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)]
    if (value !== undefined) return normalizeValue(value)
  }

  return ''
}

const hasAnyHeader = (headers: string[], aliases: string[]) =>
  aliases.some((alias) => headers.includes(normalizeHeader(alias)))

export const getPreviewRows = <T>(
  rows: ImportPreviewRow<T>[],
  limit = IMPORT_PREVIEW_ROW_LIMIT
) => rows.slice(0, limit)

export const splitIntoBatches = <T>(
  records: T[],
  batchSize = IMPORT_BATCH_SIZE
) => {
  const batches: T[][] = []

  for (let index = 0; index < records.length; index += batchSize) {
    batches.push(records.slice(index, index + batchSize))
  }

  return batches
}

export const fetchPaginatedImportRecords = async <T>(
  fetchPage: (from: number, to: number) => Promise<PaginatedFetchResult<T>>,
  pageSize = IMPORT_LOOKUP_PAGE_SIZE
) => {
  const records: T[] = []
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await fetchPage(from, to)

    if (error) throw new Error(error.message || 'Could not load import records')

    const page = data || []
    records.push(...page)

    if (page.length < pageSize) break

    from += pageSize
  }

  return records
}

const clientAliases = {
  clientName: [
    'client_name',
    'client name',
    'client',
    'company',
    'company name',
    'organisation',
    'organization',
    'account',
    'account name',
    'business',
    'business name',
    'school',
    'school name',
  ],
  primaryContact: [
    'primary_contact',
    'primary contact',
    'contact',
    'contact name',
    'main contact',
    'primary name',
    'contact person',
  ],
  email: [
    'email',
    'email address',
    'email_address',
    'contact email',
    'primary email',
    'main email',
  ],
  phone: ['phone', 'phone number', 'telephone', 'tel', 'mobile', 'contact number'],
  address: [
    'address',
    'full address',
    'postal address',
    'site address',
    'location',
    'venue address',
  ],
  notes: ['notes', 'note', 'comments', 'comment', 'additional notes', 'description'],
}

const clientAddressPartAliases = {
  line1: [
    'address line 1',
    'address line1',
    'address_line_1',
    'address_line1',
    'address 1',
    'address1',
    'street',
    'street address',
  ],
  line2: [
    'address line 2',
    'address line2',
    'address_line_2',
    'address_line2',
    'address 2',
    'address2',
  ],
  townCity: ['town', 'city'],
  countyRegion: ['county', 'region'],
  postcode: ['postcode', 'post code', 'postal code', 'zip', 'zip code'],
  country: ['country'],
}

const delegateAliases = {
  firstName: ['first_name', 'first name', 'firstname', 'forename', 'given name'],
  lastName: ['last_name', 'last name', 'lastname', 'surname', 'family name'],
  fullName: ['full_name', 'full name', 'name', 'delegate name', 'learner name', 'attendee name'],
  email: ['email', 'email address', 'delegate email', 'learner email'],
  phone: ['phone', 'phone number', 'telephone', 'tel', 'mobile', 'contact number'],
  clientName: [...clientAliases.clientName, 'employer'],
  notes: clientAliases.notes,
}

const bookingAliases = {
  courseName: ['course_name', 'course name', 'course', 'training course', 'title', 'event name'],
  clientName: [
    'client_name',
    'client name',
    'client',
    'company',
    'company name',
    'organisation',
    'organization',
    'school',
    'business',
  ],
  bookingContactName: ['contact name', 'booking contact', 'booker', 'organiser', 'organizer'],
  bookingContactEmail: ['contact email', 'booking email', 'email'],
  bookingContactPhone: ['contact phone', 'phone'],
  location: ['location', 'venue', 'address', 'site', 'training location'],
  trainerName: ['trainer', 'trainer name', 'instructor', 'tutor'],
  date: ['date', 'course date', 'start date'],
  endDate: ['end date'],
  startTime: ['start time'],
  endTime: ['end time'],
  status: ['status', 'booking status'],
  deliveryType: ['delivery type', 'type', 'public/private', 'booking type'],
  notes: ['notes', 'comments', 'additional notes'],
  delegateFullName: ['delegate name', 'full name', 'learner name', 'attendee name'],
  delegateFirstName: ['first name'],
  delegateLastName: ['last name'],
  delegateEmail: ['delegate email', 'learner email', 'attendee email'],
  delegatePhone: ['delegate phone', 'learner phone'],
}

const bookingSessionDateAliases = Array.from({ length: 5 }, (_, index) => [
  `session ${index + 1} date`,
  `day ${index + 1} date`,
])

const splitFullName = (fullName: string) => {
  const parts = normalizeImportName(fullName).split(' ').filter(Boolean)

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

const hasEmail = (email: string) => email.length > 0

const isValidEmail = (email: string) =>
  !hasEmail(email) || emailPattern.test(email)

const padNumber = (value: number) => String(value).padStart(2, '0')

const isValidDateParts = (year: number, month: number, day: number) => {
  const date = new Date(year, month - 1, day)

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

const normalizeDateValue = (value?: string | null) => {
  const trimmed = normalizeValue(value || '')

  if (!trimmed) return ''

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)

  if (isoMatch) {
    const year = Number(isoMatch[1])
    const month = Number(isoMatch[2])
    const day = Number(isoMatch[3])

    return isValidDateParts(year, month, day)
      ? `${year}-${padNumber(month)}-${padNumber(day)}`
      : ''
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/)

  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2])
    const yearText = slashMatch[3]
    const year = Number(yearText.length === 2 ? `20${yearText}` : yearText)

    return isValidDateParts(year, month, day)
      ? `${year}-${padNumber(month)}-${padNumber(day)}`
      : ''
  }

  return ''
}

const normalizeTimeValue = (value?: string | null) => {
  const trimmed = normalizeValue(value || '').toLowerCase()

  if (!trimmed) return ''

  const compact = trimmed.replace(/\s+/g, '')
  const meridiemMatch = compact.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm)$/)

  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1])
    const minutes = Number(meridiemMatch[2] || 0)
    const meridiem = meridiemMatch[3]

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return ''
    if (meridiem === 'pm' && hours < 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0

    return `${padNumber(hours)}:${padNumber(minutes)}`
  }

  const timeMatch = compact.match(/^(\d{1,2})(?::?(\d{2}))$/)

  if (!timeMatch) return ''

  const hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return ''

  return `${padNumber(hours)}:${padNumber(minutes)}`
}

const addDaysToImportDate = (dateValue: string, daysToAdd: number) => {
  if (!dateValue) return ''

  const [yearText, monthText, dayText] = dateValue.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!isValidDateParts(year, month, day)) return ''

  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + daysToAdd)

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

const normalizeDeliveryType = (
  value: string,
  defaultDeliveryType: 'private' | 'public'
) => {
  const normalized = normalizeMatch(value).replace(/[^a-z]/g, '')

  if (['public', 'open', 'opencourse'].includes(normalized)) return 'public'
  if (['private', 'inhouse', 'closed', 'client'].includes(normalized)) return 'private'

  return defaultDeliveryType
}

const normalizeBookingStatus = (value: string) => {
  const normalized = normalizeMatch(value).replace(/[^a-z]/g, '_')

  if (!normalized) return 'scheduled'
  if (['cancelled', 'canceled'].includes(normalized)) return 'cancelled'
  if (['completed', 'complete'].includes(normalized)) return 'completed'
  if (['draft', 'pending', 'confirmed', 'scheduled'].includes(normalized)) return 'scheduled'

  return normalized
}

const buildConsecutiveImportSessions = (
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string
) => {
  const sessions: BookingImportSessionData[] = []
  let nextDate = startDate

  while (nextDate && nextDate <= endDate) {
    sessions.push({
      session_date: nextDate,
      start_time: startTime,
      end_time: endTime,
      sort_order: sessions.length + 1,
    })

    const followingDate = addDaysToImportDate(nextDate, 1)
    if (!followingDate || followingDate === nextDate) break
    nextDate = followingDate
  }

  return sessions
}

const buildBookingImportSessions = (
  row: Record<string, string>,
  courseTemplate?: ExistingCourseTemplateForImport | null
) => {
  const startTime =
    normalizeTimeValue(getValue(row, bookingAliases.startTime)) ||
    normalizeTimeValue(courseTemplate?.default_start_time)
  const endTime =
    normalizeTimeValue(getValue(row, bookingAliases.endTime)) ||
    normalizeTimeValue(courseTemplate?.default_end_time)
  const explicitSessionDates = bookingSessionDateAliases
    .map((aliases) => normalizeDateValue(getValue(row, aliases)))
    .filter(Boolean)

  if (explicitSessionDates.length > 0) {
    return Array.from(new Set(explicitSessionDates)).map((sessionDate, index) => ({
      session_date: sessionDate,
      start_time: startTime,
      end_time: endTime,
      sort_order: index + 1,
    }))
  }

  const startDate = normalizeDateValue(getValue(row, bookingAliases.date))
  const templateDuration = Math.max(
    Math.floor(Number(courseTemplate?.duration_days) || 1),
    1
  )
  const endDate =
    normalizeDateValue(getValue(row, bookingAliases.endDate)) ||
    (templateDuration > 1
      ? addDaysToImportDate(startDate, templateDuration - 1)
      : startDate)

  if (!startDate) return []

  return buildConsecutiveImportSessions(startDate, endDate, startTime, endTime)
}

const buildClientAddress = (row: Record<string, string>) => {
  const fullAddress = getValue(row, clientAliases.address)

  if (fullAddress) return fullAddress

  return [
    getValue(row, clientAddressPartAliases.line1),
    getValue(row, clientAddressPartAliases.line2),
    getValue(row, clientAddressPartAliases.townCity),
    getValue(row, clientAddressPartAliases.countyRegion),
    getValue(row, clientAddressPartAliases.postcode),
    getValue(row, clientAddressPartAliases.country),
  ]
    .filter(Boolean)
    .join(', ')
}

const parseCsvLine = (line: string) => {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)

  return values.map(normalizeValue)
}

export const parseCsv = (csvText: string) => {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)

  const headerLineIndex = lines.findIndex((line) => line.trim().length > 0)

  if (headerLineIndex === -1) {
    return {
      headers: [] as string[],
      duplicateHeaders: [] as string[],
      rows: [] as Record<string, string>[],
      blankRows: 0,
    }
  }

  const rawHeaders = parseCsvLine(lines[headerLineIndex])
  const seenHeaders = new Map<string, number>()
  const duplicateHeaders: string[] = []
  const headers = rawHeaders.map((header) => {
    const normalized = normalizeHeader(header)
    const seenCount = seenHeaders.get(normalized) || 0

    seenHeaders.set(normalized, seenCount + 1)

    if (seenCount > 0) {
      duplicateHeaders.push(normalized)
      return `${normalized}__duplicate_${seenCount + 1}`
    }

    return normalized
  })
  const rows: Record<string, string>[] = []
  let blankRows = 0

  lines.slice(headerLineIndex + 1).forEach((line) => {
    const values = parseCsvLine(line)
    const isBlank = values.every((value) => value.trim().length === 0)

    if (isBlank) {
      blankRows += line.length > 0 ? 1 : 0
      return
    }

    const row = headers.reduce<Record<string, string>>((result, header, index) => {
      result[header] = values[index] || ''
      return result
    }, {})

    rows.push(row)
  })

  return { headers, duplicateHeaders, rows, blankRows }
}

const buildPreview = <T>(
  requiredHeaders: string[],
  headers: string[],
  duplicateHeaders: string[],
  rows: ImportPreviewRow<T>[],
  blankRows: number,
  missingHeadersOverride?: string[]
): ImportPreview<T> => {
  const missingHeaders =
    missingHeadersOverride ||
    requiredHeaders.filter((header) => !headers.includes(normalizeHeader(header)))

  const rowsWithHeaderErrors =
    missingHeaders.length === 0
      ? rows
      : rows.map((row) => ({
          ...row,
          status: 'error' as ImportStatus,
          errors: [
            ...row.errors,
            `Missing required column: ${missingHeaders.join(', ')}`,
          ],
          willImport: false,
        }))

  return {
    requiredHeaders,
    headers,
    duplicateHeaders,
    missingHeaders,
    totalRows: rowsWithHeaderErrors.length,
    blankRows,
    validRows: rowsWithHeaderErrors.filter((row) => row.status === 'valid').length,
    warningRows: rowsWithHeaderErrors.filter((row) => row.status === 'warning').length,
    errorRows: rowsWithHeaderErrors.filter((row) => row.status === 'error').length,
    importableRows: rowsWithHeaderErrors.filter((row) => row.willImport).length,
    skippedRows: rowsWithHeaderErrors.filter((row) => !row.willImport).length,
    rows: rowsWithHeaderErrors,
  }
}

export const buildClientImportPreview = (
  csvText: string,
  existingClients: ExistingClientForImport[]
) => {
  const { headers, duplicateHeaders, rows, blankRows } = parseCsv(csvText)
  const existingNames = new Set(existingClients.map((client) => normalizeMatch(client.company)))
  const existingEmails = new Set(
    existingClients
      .map((client) => normalizeMatch(client.email))
      .filter(Boolean)
  )
  const seenNames = new Set<string>()
  const seenEmails = new Set<string>()

  const previewRows = rows.map<ImportPreviewRow<ClientImportData>>((row, index) => {
    const data: ClientImportData = {
      client_name: getValue(row, clientAliases.clientName),
      primary_contact: getValue(row, clientAliases.primaryContact),
      email: getValue(row, clientAliases.email),
      phone: getValue(row, clientAliases.phone),
      address: buildClientAddress(row),
      notes: getValue(row, clientAliases.notes),
    }

    const errors: string[] = []
    const warnings: string[] = []
    const normalizedName = normalizeMatch(data.client_name)
    const normalizedEmail = normalizeMatch(data.email)

    if (!data.client_name) errors.push('client_name is required')
    if (!isValidEmail(data.email)) errors.push('Email is not valid')

    if (normalizedName && existingNames.has(normalizedName)) {
      warnings.push('A client with this name already exists')
    }

    if (normalizedEmail && existingEmails.has(normalizedEmail)) {
      warnings.push('A client with this email already exists')
    }

    if (normalizedName && seenNames.has(normalizedName)) {
      warnings.push('Another row in this file uses this client name')
    }

    if (normalizedEmail && seenEmails.has(normalizedEmail)) {
      warnings.push('Another row in this file uses this email')
    }

    if (normalizedName) seenNames.add(normalizedName)
    if (normalizedEmail) seenEmails.add(normalizedEmail)

    const hasDuplicateWarning = warnings.length > 0
    const willImport = errors.length === 0 && !hasDuplicateWarning

    return {
      rowNumber: index + 2,
      data,
      status: errors.length > 0 ? 'error' : hasDuplicateWarning ? 'warning' : 'valid',
      errors,
      warnings,
      willImport,
    }
  })

  const hasClientNameHeader = hasAnyHeader(headers, clientAliases.clientName)

  return buildPreview(
    ['client_name'],
    headers,
    duplicateHeaders,
    previewRows,
    blankRows,
    hasClientNameHeader ? [] : ['client_name']
  )
}

export const buildDelegateImportPreview = (
  csvText: string,
  existingClients: ExistingClientForImport[],
  existingDelegates: ExistingDelegateForImport[],
  createMissingClients: boolean
) => {
  const { headers, duplicateHeaders, rows, blankRows } = parseCsv(csvText)
  const clientsByName = new Map(
    existingClients.flatMap((client) =>
      [client.company, client.name]
        .map((value) => normalizeMatch(value))
        .filter(Boolean)
        .map((value) => [value, client] as const)
    )
  )
  const existingDelegateEmails = new Set(
    existingDelegates
      .map((delegate) => normalizeMatch(delegate.email))
      .filter(Boolean)
  )
  const existingDelegateNameClient = new Set(
    existingDelegates.map(
      (delegate) => `${normalizeMatch(delegate.full_name)}|${delegate.client_id || ''}`
    )
  )
  const seenEmails = new Set<string>()
  const seenNameClient = new Set<string>()

  const previewRows = rows.map<ImportPreviewRow<DelegateImportData>>((row, index) => {
    const providedFirstName = getValue(row, delegateAliases.firstName)
    const providedLastName = getValue(row, delegateAliases.lastName)
    const providedFullName = getValue(row, delegateAliases.fullName)
    const splitName =
      !providedFirstName && !providedLastName && providedFullName
        ? splitFullName(providedFullName)
        : { firstName: '', lastName: '' }
    const firstName = providedFirstName || splitName.firstName
    const lastName = providedLastName || splitName.lastName
    const fullName = providedFullName || [firstName, lastName].filter(Boolean).join(' ')
    const clientName = getValue(row, delegateAliases.clientName)
    const matchedClient = clientName ? clientsByName.get(normalizeMatch(clientName)) : undefined
    const shouldCreateClient = Boolean(clientName && !matchedClient && createMissingClients)
    const clientPreview = clientName
      ? matchedClient
        ? `Matched existing client: ${matchedClient.company || matchedClient.name || clientName}`
        : shouldCreateClient
          ? `Will create client: ${clientName}`
          : 'Client not found, will skip unless create missing clients is ticked'
      : 'No client'

    const data: DelegateImportData = {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email: getValue(row, delegateAliases.email),
      phone: getValue(row, delegateAliases.phone),
      client_name: clientName,
      notes: getValue(row, delegateAliases.notes),
      matchedClientId: matchedClient?.id || null,
      shouldCreateClient,
      clientPreview,
    }

    const errors: string[] = []
    const warnings: string[] = []
    const normalizedEmail = normalizeMatch(data.email)
    const normalizedNameClient = `${normalizeMatch(data.full_name)}|${data.matchedClientId || normalizeMatch(clientName)}`

    if (!data.full_name) {
      errors.push('first_name and last_name, or full_name, are required')
    }

    if (providedFirstName && !lastName && !providedFullName) {
      errors.push('last_name is required')
    }

    if (providedFullName && !providedFirstName && !providedLastName && !lastName) {
      errors.push('full_name must include first and last name')
    }

    if (!isValidEmail(data.email)) errors.push('Email is not valid')

    if (clientName && matchedClient) {
      warnings.push(data.clientPreview)
    }

    if (clientName && !matchedClient) {
      warnings.push(data.clientPreview)
    }

    if (normalizedEmail && existingDelegateEmails.has(normalizedEmail)) {
      warnings.push('This email is already used by another delegate')
    }

    if (existingDelegateNameClient.has(normalizedNameClient)) {
      warnings.push('A delegate with this name and client already exists')
    }

    if (normalizedEmail && seenEmails.has(normalizedEmail)) {
      warnings.push('Another row in this file uses this email')
    }

    if (seenNameClient.has(normalizedNameClient)) {
      warnings.push('Another row in this file uses this name and client')
    }

    if (normalizedEmail) seenEmails.add(normalizedEmail)
    if (normalizeMatch(data.full_name)) seenNameClient.add(normalizedNameClient)

    const hasStrongDuplicateWarning = warnings.some((warning) =>
      warning === 'A delegate with this name and client already exists' ||
      warning === 'Another row in this file uses this name and client'
    )
    const hasMissingClientBlock = Boolean(clientName && !matchedClient && !createMissingClients)
    const willImport = errors.length === 0 && !hasStrongDuplicateWarning && !hasMissingClientBlock

    return {
      rowNumber: index + 2,
      data,
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
      errors,
      warnings,
      willImport,
    }
  })

  const hasFirstAndLastName =
    hasAnyHeader(headers, delegateAliases.firstName) &&
    hasAnyHeader(headers, delegateAliases.lastName)
  const hasFullName = hasAnyHeader(headers, delegateAliases.fullName)

  return buildPreview(
    ['first_name', 'last_name or full_name'],
    headers,
    duplicateHeaders,
    previewRows,
    blankRows,
    hasFirstAndLastName || hasFullName ? [] : ['first_name + last_name or full_name']
  )
}

const buildClientsByLooseName = (existingClients: ExistingClientForImport[]) =>
  new Map(
    existingClients.flatMap((client) =>
      [client.company, client.name]
        .map((value) => normalizeLooseMatch(value))
        .filter(Boolean)
        .map((value) => [value, client] as const)
    )
  )

const findCourseTemplateForImport = (
  courseName: string,
  courseTemplates: ExistingCourseTemplateForImport[]
) => {
  const normalizedCourse = normalizeLooseMatch(courseName)

  if (!normalizedCourse) return null

  return courseTemplates.find((template) =>
    [template.name, template.code]
      .map((value) => normalizeLooseMatch(value))
      .filter(Boolean)
      .includes(normalizedCourse)
  ) || null
}

const findTrainerForImport = (
  trainerName: string,
  trainers: ExistingTrainerForImport[]
) => {
  const normalizedTrainer = normalizeLooseMatch(trainerName)
  const normalizedTrainerEmail = normalizeMatch(trainerName)

  if (!normalizedTrainer) return null

  return trainers.find((trainer) =>
    normalizeLooseMatch(trainer.name) === normalizedTrainer ||
    normalizeMatch(trainer.email) === normalizedTrainerEmail
  ) || null
}

const getExistingBookingFirstDate = (booking: ExistingBookingForImport) => {
  const sessions = Array.isArray(booking.booking_sessions)
    ? booking.booking_sessions
        .map((session) => normalizeDateValue(session.session_date))
        .filter(Boolean)
        .sort()
    : []

  return sessions[0] || normalizeDateValue(booking.date)
}

const getBookingDuplicateKey = (
  courseName: string,
  firstSessionDate: string,
  deliveryType: 'private' | 'public',
  clientNameOrId: string,
  location: string
) =>
  [
    normalizeLooseMatch(courseName),
    firstSessionDate,
    deliveryType,
    deliveryType === 'private' ? normalizeLooseMatch(clientNameOrId) : '',
    normalizeLooseMatch(location),
  ].join('|')

const findMatchingDelegateForBookingImport = (
  delegateData: {
    full_name: string
    first_name: string
    last_name: string
    email: string
  },
  clientId: string | null,
  existingDelegates: ExistingDelegateForImport[]
) => {
  const normalizedEmail = normalizeMatch(delegateData.email)
  const normalizedFullName = normalizeMatch(delegateData.full_name)
  const emailMatches = normalizedEmail
    ? existingDelegates.filter((delegate) => normalizeMatch(delegate.email) === normalizedEmail)
    : []

  if (emailMatches.length === 1) {
    const emailMatchName = normalizeMatch(emailMatches[0].full_name)

    if (!emailMatchName || emailMatchName === normalizedFullName) {
      return { delegate: emailMatches[0], ambiguous: false }
    }

    return { delegate: null, ambiguous: true }
  }

  if (emailMatches.length > 1) {
    const sameNameEmailMatches = emailMatches.filter(
      (delegate) => normalizeMatch(delegate.full_name) === normalizedFullName
    )

    if (sameNameEmailMatches.length === 1) {
      return { delegate: sameNameEmailMatches[0], ambiguous: false }
    }

    return { delegate: null, ambiguous: true }
  }

  if (clientId && normalizedFullName) {
    const nameClientMatches = existingDelegates.filter(
      (delegate) =>
        delegate.client_id === clientId &&
        normalizeMatch(delegate.full_name) === normalizedFullName
    )

    if (nameClientMatches.length === 1) {
      return { delegate: nameClientMatches[0], ambiguous: false }
    }

    if (nameClientMatches.length > 1) {
      return { delegate: null, ambiguous: true }
    }
  }

  if (normalizedFullName) {
    const nameMatches = existingDelegates.filter(
      (delegate) => normalizeMatch(delegate.full_name) === normalizedFullName
    )

    if (nameMatches.length === 1) {
      return { delegate: nameMatches[0], ambiguous: false }
    }

    if (nameMatches.length > 1) {
      return { delegate: null, ambiguous: true }
    }
  }

  return { delegate: null, ambiguous: false }
}

export const buildBookingImportPreview = (
  csvText: string,
  existingClients: ExistingClientForImport[],
  existingDelegates: ExistingDelegateForImport[],
  existingBookings: ExistingBookingForImport[],
  trainers: ExistingTrainerForImport[],
  courseTemplates: ExistingCourseTemplateForImport[],
  existingBookingDelegateLinks: ExistingBookingDelegateLinkForImport[],
  options: {
    defaultDeliveryType: 'private' | 'public'
    createMissingClients: boolean
    createMissingDelegates: boolean
  }
) => {
  const { headers, duplicateHeaders, rows, blankRows } = parseCsv(csvText)
  const clientsByLooseName = buildClientsByLooseName(existingClients)
  const existingBookingKeys = new Map(
    existingBookings.map((booking) => {
      const deliveryType = normalizeDeliveryType(
        booking.course_delivery_type || '',
        'private'
      )
      const clientKey = booking.client_id || booking.client_name || ''

      return [
        getBookingDuplicateKey(
          booking.course_name || '',
          getExistingBookingFirstDate(booking),
          deliveryType,
          clientKey,
          booking.location || ''
        ),
        booking,
      ] as const
    })
  )
  const existingLinkKeys = new Set(
    existingBookingDelegateLinks
      .filter((link) => link.booking_id && link.delegate_id)
      .map((link) => `${link.booking_id}|${link.delegate_id}`)
  )
  const seenBookingKeys = new Set<string>()

  const previewRows = rows.map<ImportPreviewRow<BookingImportData>>((row, index) => {
    const courseName = getValue(row, bookingAliases.courseName)
    const clientName = getValue(row, bookingAliases.clientName)
    const deliveryType = normalizeDeliveryType(
      getValue(row, bookingAliases.deliveryType),
      options.defaultDeliveryType
    )
    const matchedClient = clientName
      ? clientsByLooseName.get(normalizeLooseMatch(clientName))
      : undefined
    const shouldCreateClient = Boolean(
      deliveryType === 'private' &&
      clientName &&
      !matchedClient &&
      options.createMissingClients
    )
    const courseTemplate = findCourseTemplateForImport(courseName, courseTemplates)
    const trainerName = getValue(row, bookingAliases.trainerName)
    const trainer = findTrainerForImport(trainerName, trainers)
    const sessions = buildBookingImportSessions(row, courseTemplate)
    const firstSessionDate = sessions[0]?.session_date || ''
    const duplicateKey = getBookingDuplicateKey(
      courseName,
      firstSessionDate,
      deliveryType,
      matchedClient?.id || clientName,
      getValue(row, bookingAliases.location)
    )
    const duplicateBooking = existingBookingKeys.get(duplicateKey)
    const providedDelegateFirstName = getValue(row, bookingAliases.delegateFirstName)
    const providedDelegateLastName = getValue(row, bookingAliases.delegateLastName)
    const providedDelegateFullName = getValue(row, bookingAliases.delegateFullName)
    const splitDelegateName =
      !providedDelegateFirstName && !providedDelegateLastName && providedDelegateFullName
        ? splitFullName(providedDelegateFullName)
        : { firstName: '', lastName: '' }
    const delegateFirstName = providedDelegateFirstName || splitDelegateName.firstName
    const delegateLastName = providedDelegateLastName || splitDelegateName.lastName
    const delegateFullName =
      providedDelegateFullName ||
      [delegateFirstName, delegateLastName].filter(Boolean).join(' ')
    const delegateEmail = getValue(row, bookingAliases.delegateEmail)
    const delegatePhone = getValue(row, bookingAliases.delegatePhone)
    const hasDelegateData = Boolean(
      delegateFullName || delegateFirstName || delegateLastName || delegateEmail || delegatePhone
    )
    const effectiveClientId = matchedClient?.id || null
    const delegateMatch = hasDelegateData
      ? findMatchingDelegateForBookingImport(
          {
            full_name: delegateFullName,
            first_name: delegateFirstName,
            last_name: delegateLastName,
            email: delegateEmail,
          },
          effectiveClientId,
          existingDelegates
        )
      : { delegate: null, ambiguous: false }
    const shouldCreateDelegate = Boolean(
      hasDelegateData &&
      !delegateMatch.delegate &&
      !delegateMatch.ambiguous &&
      options.createMissingDelegates
    )
    const delegatePreview = !hasDelegateData
      ? 'No delegate in row'
      : delegateMatch.delegate
        ? `Matched existing delegate: ${delegateMatch.delegate.full_name || delegateFullName}`
        : delegateMatch.ambiguous
          ? 'Ambiguous delegate match, will skip delegate attachment'
          : shouldCreateDelegate
            ? `Will create delegate: ${delegateFullName || delegateEmail}`
            : 'Delegate not found, will skip unless create missing delegates is ticked'

    const data: BookingImportData = {
      course_name: courseName,
      client_name: clientName,
      booking_contact_name: getValue(row, bookingAliases.bookingContactName),
      booking_contact_email: getValue(row, bookingAliases.bookingContactEmail),
      booking_contact_phone: getValue(row, bookingAliases.bookingContactPhone),
      location: getValue(row, bookingAliases.location),
      trainer_name: trainerName,
      status: normalizeBookingStatus(getValue(row, bookingAliases.status)),
      course_delivery_type: deliveryType,
      notes: getValue(row, bookingAliases.notes),
      matchedClientId: matchedClient?.id || null,
      shouldCreateClient,
      clientPreview: clientName
        ? matchedClient
          ? `Matched existing client: ${matchedClient.company || matchedClient.name || clientName}`
          : shouldCreateClient
            ? `Will create client: ${clientName}`
            : 'Client not found, row will skip unless create missing clients is ticked'
        : deliveryType === 'private'
          ? 'Client required for private booking'
          : 'No client',
      matchedCourseTemplateId: courseTemplate?.id || null,
      matchedTrainerId: trainer?.id || null,
      sessions,
      delegate: hasDelegateData
        ? {
            first_name: delegateFirstName,
            last_name: delegateLastName,
            full_name: delegateFullName,
            email: delegateEmail,
            phone: delegatePhone,
            matchedDelegateId: delegateMatch.delegate?.id || null,
            shouldCreateDelegate,
            delegatePreview,
          }
        : null,
      duplicateBookingId: duplicateBooking?.id || null,
    }

    const errors: string[] = []
    const warnings: string[] = []

    if (!data.course_name) errors.push('course_name is required')
    if (!firstSessionDate) errors.push('first session date is required')
    if (data.booking_contact_email && !isValidEmail(data.booking_contact_email)) {
      errors.push('Booking contact email is not valid')
    }

    if (hasDelegateData) {
      if (!delegateFullName) {
        errors.push('delegate name is required when delegate fields are provided')
      }

      if (providedDelegateFirstName && !delegateLastName && !providedDelegateFullName) {
        errors.push('delegate last name is required')
      }

      if (
        providedDelegateFullName &&
        !providedDelegateFirstName &&
        !providedDelegateLastName &&
        !delegateLastName
      ) {
        errors.push('delegate name must include first and last name')
      }

      if (!isValidEmail(delegateEmail)) errors.push('Delegate email is not valid')
      warnings.push(delegatePreview)
    }

    if (deliveryType === 'private' && !clientName) {
      errors.push('client_name is required for private bookings')
    }

    if (deliveryType === 'private' && clientName && !matchedClient && !options.createMissingClients) {
      warnings.push(data.clientPreview)
    }

    if (deliveryType === 'private' && matchedClient) {
      warnings.push(data.clientPreview)
    }

    if (deliveryType === 'private' && shouldCreateClient) {
      warnings.push(data.clientPreview)
    }

    if (courseName && !courseTemplate) {
      warnings.push('No matching course template; booking will use the course name from the CSV')
    }

    if (trainerName && !trainer) {
      warnings.push('Trainer not found; booking will import without a trainer')
    }

    if (duplicateBooking) {
      warnings.push('A likely matching booking already exists')
    }

    if (seenBookingKeys.has(duplicateKey)) {
      warnings.push('Another row in this file looks like the same booking')
    }

    if (duplicateKey) seenBookingKeys.add(duplicateKey)

    if (
      duplicateBooking &&
      data.delegate?.matchedDelegateId &&
      existingLinkKeys.has(`${duplicateBooking.id}|${data.delegate.matchedDelegateId}`)
    ) {
      warnings.push('This delegate is already attached to the matching booking')
    }

    const hasBlockingMissingClient = Boolean(
      deliveryType === 'private' &&
      clientName &&
      !matchedClient &&
      !options.createMissingClients
    )
    const hasDuplicateBooking = Boolean(duplicateBooking || seenBookingKeys.has(duplicateKey) && warnings.includes('Another row in this file looks like the same booking'))
    const willImport = errors.length === 0 && !hasBlockingMissingClient && !hasDuplicateBooking

    return {
      rowNumber: index + 2,
      data,
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
      errors,
      warnings,
      willImport,
    }
  })

  const hasCourseHeader = hasAnyHeader(headers, bookingAliases.courseName)
  const hasDateHeader =
    hasAnyHeader(headers, bookingAliases.date) ||
    bookingSessionDateAliases.some((aliases) => hasAnyHeader(headers, aliases))

  return buildPreview(
    ['course_name', 'date or session 1 date'],
    headers,
    duplicateHeaders,
    previewRows,
    blankRows,
    [
      ...(hasCourseHeader ? [] : ['course_name']),
      ...(hasDateHeader ? [] : ['date or session 1 date']),
    ]
  )
}

export const clientCsvTemplate =
  'client_name,primary_contact,email,phone,address,notes\nAcme Training Ltd,Jordan Smith,jordan@example.com,01234 567890,"1 High Street, London",Key account\n'

export const delegateCsvTemplate =
  'first_name,last_name,email,phone,client_name,notes\nSam,Learner,sam@example.com,07123 456789,Acme Training Ltd,Requires renewal reminder\n'

export const bookingCsvTemplate =
  'course_name,client_name,delivery type,contact name,contact email,contact phone,location,trainer,date,start time,end time,session 2 date,session 3 date,delegate name,delegate email,delegate phone,notes\nEmergency First Aid,Acme Training Ltd,Private,Jordan Smith,jordan@example.com,01234 567890,"Training Room, Leeds",Alex Trainer,2026-09-01,09:00,16:30,2026-09-08,2026-09-15,Sam Learner,sam@example.com,07123 456789,Imported booking\n'

export const buildClientInsertRecords = (
  rows: ImportPreviewRow<ClientImportData>[],
  organisationId: string,
  userId: string | null
): ClientInsertRecord[] =>
  rows
    .filter((row) => row.willImport)
    .map((row) => {
      const clientName = normalizeImportName(row.data.client_name)
      const primaryContact = normalizeImportName(row.data.primary_contact)

      return {
        organisation_id: organisationId,
        user_id: userId,
        company: clientName,
        name: primaryContact || clientName,
        email: row.data.email || null,
        phone: row.data.phone || null,
        address: row.data.address || null,
        notes: row.data.notes || null,
      }
    })

export const getMissingClientNamesForDelegateImport = (
  rows: ImportPreviewRow<DelegateImportData>[]
) =>
  Array.from(
    new Set(
      rows
        .filter((row) => row.willImport && row.data.shouldCreateClient)
        .map((row) => normalizeImportName(row.data.client_name))
        .filter(Boolean)
    )
  )

export const buildMissingClientInsertRecords = (
  rows: ImportPreviewRow<DelegateImportData>[],
  organisationId: string,
  userId: string | null
): MissingClientInsertRecord[] =>
  getMissingClientNamesForDelegateImport(rows).map((clientName) => ({
    organisation_id: organisationId,
    user_id: userId,
    company: clientName,
    name: clientName,
    email: null,
    phone: null,
    address: null,
    notes: 'Created during delegate CSV import',
  }))

export const resolveImportedDelegateClientId = (
  delegate: DelegateImportData,
  createdClientIdsByName: Map<string, string>
) =>
  delegate.matchedClientId ||
  createdClientIdsByName.get(normalizeMatch(delegate.client_name)) ||
  null

export const getMissingClientNamesForBookingImport = (
  rows: ImportPreviewRow<BookingImportData>[]
) =>
  Array.from(
    new Set(
      rows
        .filter((row) => row.willImport && row.data.shouldCreateClient)
        .map((row) => normalizeImportName(row.data.client_name))
        .filter(Boolean)
    )
  )

export const buildMissingClientInsertRecordsForBookingImport = (
  rows: ImportPreviewRow<BookingImportData>[],
  organisationId: string,
  userId: string | null
): MissingClientInsertRecord[] =>
  getMissingClientNamesForBookingImport(rows).map((clientName) => ({
    organisation_id: organisationId,
    user_id: userId,
    company: clientName,
    name: clientName,
    email: null,
    phone: null,
    address: null,
    notes: 'Created during booking CSV import',
  }))

export const resolveImportedBookingClientId = (
  booking: BookingImportData,
  createdClientIdsByName: Map<string, string>
) =>
  booking.matchedClientId ||
  createdClientIdsByName.get(normalizeMatch(booking.client_name)) ||
  createdClientIdsByName.get(normalizeLooseMatch(booking.client_name)) ||
  null

const getCourseTemplatePrice = (
  courseTemplate: ExistingCourseTemplateForImport | null | undefined
) => {
  if (!courseTemplate?.price && courseTemplate?.price !== 0) return null

  const parsed = Number(courseTemplate.price)

  return Number.isFinite(parsed) ? parsed : null
}

export const buildBookingInsertRecord = (
  row: ImportPreviewRow<BookingImportData>,
  organisationId: string,
  userId: string | null,
  clientId: string | null,
  courseTemplates: ExistingCourseTemplateForImport[]
): BookingInsertRecord => {
  const firstSession = row.data.sessions[0]
  const finalSession = row.data.sessions[row.data.sessions.length - 1] || firstSession
  const courseTemplate = row.data.matchedCourseTemplateId
    ? courseTemplates.find((template) => template.id === row.data.matchedCourseTemplateId)
    : null

  return {
    user_id: userId,
    organisation_id: organisationId,
    course_delivery_type: row.data.course_delivery_type,
    client_id: clientId,
    trainer_id: row.data.matchedTrainerId,
    course_template_id: row.data.matchedCourseTemplateId,
    client_name:
      row.data.course_delivery_type === 'public' && !clientId
        ? 'Public course'
        : row.data.client_name || null,
    course_name: row.data.course_name,
    date: firstSession.session_date,
    end_date: finalSession.session_date,
    start_time: firstSession.start_time || null,
    end_time: finalSession.end_time || null,
    location: row.data.location || null,
    booking_contact_name:
      row.data.course_delivery_type === 'private'
        ? row.data.booking_contact_name || null
        : null,
    booking_contact_email:
      row.data.course_delivery_type === 'private'
        ? row.data.booking_contact_email || null
        : null,
    booking_contact_phone:
      row.data.course_delivery_type === 'private'
        ? row.data.booking_contact_phone || null
        : null,
    price: getCourseTemplatePrice(courseTemplate),
    notes: row.data.notes || null,
    status: row.data.status || 'scheduled',
  }
}

export const buildBookingSessionInsertRecords = (
  bookingId: string,
  organisationId: string,
  sessions: BookingImportSessionData[]
): BookingSessionInsertRecord[] =>
  sessions.map((session, index) => ({
    booking_id: bookingId,
    organisation_id: organisationId,
    session_date: session.session_date,
    start_time: session.start_time || null,
    end_time: session.end_time || null,
    sort_order: index + 1,
  }))

export const getMissingDelegateRowsForBookingImport = (
  rows: ImportPreviewRow<BookingImportData>[]
) =>
  rows.filter(
    (row) =>
      row.willImport &&
      row.data.delegate &&
      row.data.delegate.shouldCreateDelegate
  )

export const buildMissingDelegateInsertRecordForBookingImport = (
  row: ImportPreviewRow<BookingImportData>,
  organisationId: string,
  clientId: string | null
) => {
  if (!row.data.delegate) return null

  return {
    organisation_id: organisationId,
    client_id: clientId,
    booking_id: null,
    full_name: row.data.delegate.full_name,
    email: row.data.delegate.email || null,
    phone: row.data.delegate.phone || null,
    notes: 'Created during booking CSV import',
  }
}

export const resolveImportedBookingDelegateId = (
  booking: BookingImportData,
  createdDelegateIdsByRowNumber: Map<number, string>,
  rowNumber: number
) =>
  booking.delegate?.matchedDelegateId ||
  createdDelegateIdsByRowNumber.get(rowNumber) ||
  null

export const buildBookingDelegateInsertRecord = (
  bookingId: string,
  organisationId: string,
  delegateId: string,
  unitPrice = 0
): BookingDelegateInsertRecord => ({
  organisation_id: organisationId,
  booking_id: bookingId,
  delegate_id: delegateId,
  attendance_status: 'not_marked',
  result_status: 'not_assessed',
  attendance_notes: null,
  unit_price: unitPrice,
})
