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

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().replace(/[\s_-]+/g, '_')

const normalizeValue = (value: string) => value.trim()

const normalizeMatch = (value?: string | null) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ')

export const normalizeImportName = (value?: string | null) =>
  (value || '').trim().replace(/\s+/g, ' ')

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
  ],
  email: ['email', 'email address', 'contact email', 'primary email'],
  phone: ['phone', 'phone number', 'telephone', 'tel', 'mobile', 'contact number'],
  address: ['address', 'full address', 'postal address', 'site address', 'location'],
  notes: ['notes', 'note', 'comments', 'comment', 'additional notes'],
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
      address: getValue(row, clientAliases.address),
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

export const clientCsvTemplate =
  'client_name,primary_contact,email,phone,address,notes\nAcme Training Ltd,Jordan Smith,jordan@example.com,01234 567890,"1 High Street, London",Key account\n'

export const delegateCsvTemplate =
  'first_name,last_name,email,phone,client_name,notes\nSam,Learner,sam@example.com,07123 456789,Acme Training Ltd,Requires renewal reminder\n'

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
