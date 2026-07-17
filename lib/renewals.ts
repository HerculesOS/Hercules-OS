export type RenewalWindow = 'expired' | '30' | '60' | '90' | 'future'

export type RenewalCertificate = {
  id: string
  expiry_date?: string | null
  expiry_reminder_sent_at?: string | null
  status?: string | null
}

export type RenewalDelegate = {
  id: string
  email?: string | null
  client_id?: string | null
}

export type RenewalClient = {
  id: string
  company?: string | null
  name?: string | null
}

export type RenewalOpportunity<TCertificate, TDelegate, TClient> = {
  certificate: TCertificate
  delegate: TDelegate | null
  client: TClient | null
  daysUntilExpiry: number
  window: RenewalWindow
}

const millisecondsPerDay = 1000 * 60 * 60 * 24

const getDaysUntilDate = (
  dateValue: string | null | undefined,
  today = new Date()
) => {
  if (!dateValue) return null

  const dateOnly = String(dateValue).split('T')[0]
  const [yearText, monthText, dayText] = dateOnly.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return null

  const expiryTime = new Date(year, month - 1, day).getTime()
  const todayTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime()

  return Math.ceil((expiryTime - todayTime) / millisecondsPerDay)
}

export const getRenewalWindow = (
  expiryDate: string | null | undefined,
  today = new Date()
): { window: RenewalWindow; daysUntilExpiry: number | null } => {
  const daysUntilExpiry = getDaysUntilDate(expiryDate, today)

  if (daysUntilExpiry === null) {
    return { window: 'future', daysUntilExpiry: null }
  }

  if (daysUntilExpiry < 0) return { window: 'expired', daysUntilExpiry }
  if (daysUntilExpiry <= 30) return { window: '30', daysUntilExpiry }
  if (daysUntilExpiry <= 60) return { window: '60', daysUntilExpiry }
  if (daysUntilExpiry <= 90) return { window: '90', daysUntilExpiry }

  return { window: 'future', daysUntilExpiry }
}

export const canSendRenewalReminder = (
  certificate: RenewalCertificate,
  delegate: RenewalDelegate | null | undefined
) => {
  return Boolean(delegate?.email && !certificate.expiry_reminder_sent_at)
}

export const getRenewalReminderSkipReason = (
  certificate: RenewalCertificate,
  delegate: RenewalDelegate | null | undefined
) => {
  if (!delegate?.email) return 'missing_email'
  if (certificate.expiry_reminder_sent_at) return 'already_reminded'

  return null
}

export const buildRenewalOpportunities = <
  TCertificate extends RenewalCertificate,
  TDelegate extends RenewalDelegate,
  TClient extends RenewalClient,
>(
  certificates: TCertificate[],
  delegates: TDelegate[],
  clients: TClient[],
  today = new Date()
) => {
  return certificates
    .filter((certificate) => certificate.status !== 'revoked')
    .map((certificate) => {
      const { window, daysUntilExpiry } = getRenewalWindow(
        certificate.expiry_date,
        today
      )

      if (daysUntilExpiry === null || window === 'future') return null

      const delegate = delegates.find(
        (item) => item.id === (certificate as any).delegate_id
      ) || null

      const client = delegate?.client_id
        ? clients.find((item) => item.id === delegate.client_id) || null
        : null

      return {
        certificate,
        delegate,
        client,
        daysUntilExpiry,
        window,
      }
    })
    .filter(Boolean) as Array<
      RenewalOpportunity<TCertificate, TDelegate, TClient>
    >
}

export const groupRenewalOpportunitiesByClient = <
  TCertificate,
  TDelegate,
  TClient extends RenewalClient,
>(
  opportunities: Array<RenewalOpportunity<TCertificate, TDelegate, TClient>>
) => {
  const groups = new Map<
    string,
    {
      key: string
      client: TClient | null
      label: string
      opportunities: Array<
        RenewalOpportunity<TCertificate, TDelegate, TClient>
      >
    }
  >()

  opportunities.forEach((opportunity) => {
    const key = opportunity.client?.id || 'no-client'
    const label =
      opportunity.client?.company ||
      opportunity.client?.name ||
      'No client / individual learners'

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        client: opportunity.client,
        label,
        opportunities: [],
      })
    }

    groups.get(key)?.opportunities.push(opportunity)
  })

  return Array.from(groups.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  )
}

export const getRenewalSummary = (
  opportunities: Array<RenewalOpportunity<any, any, any>>
) => {
  const affectedClients = new Set(
    opportunities.map((opportunity) => opportunity.client?.id || 'no-client')
  )

  return {
    expired: opportunities.filter((item) => item.window === 'expired').length,
    within30: opportunities.filter((item) => item.window === '30').length,
    within60: opportunities.filter((item) => item.window === '60').length,
    within90: opportunities.filter((item) => item.window === '90').length,
    clientsAffected: affectedClients.size,
    potentialRenewalDelegates: opportunities.length,
  }
}
