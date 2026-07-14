'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate } from '@/lib/formatters'
import { createCertificateVerificationId } from '@/lib/certificateVerification'
import { fetchPaginatedImportRecords } from '@/lib/importCsv'
import {
  buildRenewalOpportunities,
  canSendRenewalReminder,
  getRenewalReminderSkipReason,
  groupRenewalOpportunitiesByClient,
  type RenewalWindow,
} from '@/lib/renewals'

const RENEWALS_PAGE_SIZE = 50

const toLocalDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const windowLabels: Record<RenewalWindow, string> = {
  expired: 'Expired',
  '30': '30 days',
  '60': '60 days',
  '90': '90 days',
  future: 'Future',
}

const windowStyles: Record<RenewalWindow, string> = {
  expired: 'bg-red-50 text-red-700 border-red-100',
  '30': 'bg-amber-50 text-amber-700 border-amber-100',
  '60': 'bg-blue-50 text-blue-700 border-blue-100',
  '90': 'bg-slate-50 text-slate-700 border-slate-200',
  future: 'bg-slate-50 text-slate-700 border-slate-200',
}

export default function RenewalsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [organisation, setOrganisation] = useState<any>(null)
  const [certificates, setCertificates] = useState<any[]>([])
  const [delegates, setDelegates] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [matchingRenewals, setMatchingRenewals] = useState(0)
  const [summary, setSummary] = useState({
    expired: 0,
    within30: 0,
    within60: 0,
    within90: 0,
    clientsAffected: 0,
    potentialRenewalDelegates: 0,
  })
  const [windowFilter, setWindowFilter] = useState<'all' | RenewalWindow>('all')
  const [reminderFilter, setReminderFilter] = useState<'all' | 'sent' | 'not_sent'>('all')

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const panelClass =
    'bg-white border border-slate-200 rounded-lg'

  const panelHeaderClass =
    'px-4 py-3 border-b border-slate-200'

  const getRenewalDateWindows = () => {
    const todayDate = new Date()
    const today = new Date(
      todayDate.getFullYear(),
      todayDate.getMonth(),
      todayDate.getDate()
    )
    const day30 = new Date(today)
    const day60 = new Date(today)
    const day90 = new Date(today)

    day30.setDate(today.getDate() + 30)
    day60.setDate(today.getDate() + 60)
    day90.setDate(today.getDate() + 90)

    return {
      today: toLocalDateInputValue(today),
      day30: toLocalDateInputValue(day30),
      day60: toLocalDateInputValue(day60),
      day90: toLocalDateInputValue(day90),
    }
  }

  const applyRenewalFilters = (query: any) => {
    const { today, day30, day60, day90 } = getRenewalDateWindows()
    let nextQuery = query

    if (windowFilter === 'expired') {
      nextQuery = nextQuery.lt('expiry_date', today)
    } else if (windowFilter === '30') {
      nextQuery = nextQuery.gte('expiry_date', today).lte('expiry_date', day30)
    } else if (windowFilter === '60') {
      nextQuery = nextQuery.gt('expiry_date', day30).lte('expiry_date', day60)
    } else if (windowFilter === '90') {
      nextQuery = nextQuery.gt('expiry_date', day60).lte('expiry_date', day90)
    } else {
      nextQuery = nextQuery.lte('expiry_date', day90)
    }

    if (reminderFilter === 'sent') {
      nextQuery = nextQuery.not('expiry_reminder_sent_at', 'is', null)
    }

    if (reminderFilter === 'not_sent') {
      nextQuery = nextQuery.is('expiry_reminder_sent_at', null)
    }

    return nextQuery
  }

  const countRenewals = async (
    organisationId: string,
    filter: 'expired' | '30' | '60' | '90' | 'all'
  ) => {
    const { today, day30, day60, day90 } = getRenewalDateWindows()
    let query = supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', organisationId)
      .neq('status', 'revoked')

    if (filter === 'expired') {
      query = query.lt('expiry_date', today)
    } else if (filter === '30') {
      query = query.gte('expiry_date', today).lte('expiry_date', day30)
    } else if (filter === '60') {
      query = query.gt('expiry_date', day30).lte('expiry_date', day60)
    } else if (filter === '90') {
      query = query.gt('expiry_date', day60).lte('expiry_date', day90)
    } else {
      query = query.lte('expiry_date', day90)
    }

    const { count } = await query

    return count || 0
  }

  const countAffectedClients = async (organisationId: string) => {
    const { day90 } = getRenewalDateWindows()
    const { count: unlinkedCount } = await supabase
      .from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', organisationId)
      .neq('status', 'revoked')
      .lte('expiry_date', day90)
      .is('delegate_id', null)
    const renewalDelegateRows = await fetchPaginatedImportRecords<{
      delegate_id: string | null
    }>(
      async (from, to) =>
        await supabase
          .from('certificates')
          .select('delegate_id')
          .eq('organisation_id', organisationId)
          .neq('status', 'revoked')
          .lte('expiry_date', day90)
          .range(from, to)
    )
    const renewalDelegateIds = new Set(
      renewalDelegateRows
        .map((certificate) => certificate.delegate_id)
        .filter(Boolean) as string[]
    )
    const affectedClients = new Set<string>()

    if ((unlinkedCount || 0) > 0) {
      affectedClients.add('no-client')
    }

    if (renewalDelegateIds.size === 0) return affectedClients.size

    const delegateRows = await fetchPaginatedImportRecords<{
      id: string
      client_id: string | null
    }>(
      async (from, to) =>
        await supabase
          .from('delegates')
          .select('id, client_id')
          .eq('organisation_id', organisationId)
          .range(from, to)
    )

    delegateRows.forEach((delegate) => {
      if (!renewalDelegateIds.has(delegate.id)) return

      affectedClients.add(delegate.client_id || 'no-client')
    })

    return affectedClients.size
  }

  const load = async (page = currentPage) => {
    setLoading(true)

    const currentProfile = await getOrCreateAccount()

    setProfile(currentProfile)

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', currentProfile.organisation_id)
      .single()

    const from = (page - 1) * RENEWALS_PAGE_SIZE
    const to = from + RENEWALS_PAGE_SIZE - 1
    let certificatesQuery = supabase
      .from('certificates')
      .select('*', { count: 'exact' })
      .eq('organisation_id', currentProfile.organisation_id)
      .neq('status', 'revoked')
      .order('expiry_date', { ascending: true })
      .range(from, to)

    certificatesQuery = applyRenewalFilters(certificatesQuery)

    const {
      data: certificatesData,
      count: renewalCount,
      error: certificatesError,
    } = await certificatesQuery

    if (certificatesError) {
      alert(certificatesError.message)
      setLoading(false)
      return
    }

    const delegateIds = Array.from(
      new Set(
        (certificatesData || [])
          .map((certificate) => certificate.delegate_id)
          .filter(Boolean) as string[]
      )
    )
    let delegatesData: any[] = []
    let clientsData: any[] = []

    if (delegateIds.length > 0) {
      const { data: delegateResults } = await supabase
        .from('delegates')
        .select('*')
        .eq('organisation_id', currentProfile.organisation_id)
        .in('id', delegateIds)

      delegatesData = delegateResults || []

      const clientIds = Array.from(
        new Set(
          delegatesData
            .map((delegate) => delegate.client_id)
            .filter(Boolean) as string[]
        )
      )

      if (clientIds.length > 0) {
        const { data: clientResults } = await supabase
          .from('clients')
          .select('*')
          .eq('organisation_id', currentProfile.organisation_id)
          .in('id', clientIds)

        clientsData = clientResults || []
      }
    }

    const [expired, within30, within60, within90, totalRenewals, affectedClients] =
      await Promise.all([
        countRenewals(currentProfile.organisation_id, 'expired'),
        countRenewals(currentProfile.organisation_id, '30'),
        countRenewals(currentProfile.organisation_id, '60'),
        countRenewals(currentProfile.organisation_id, '90'),
        countRenewals(currentProfile.organisation_id, 'all'),
        countAffectedClients(currentProfile.organisation_id),
      ])

    setOrganisation(organisationData || null)
    setCertificates(certificatesData || [])
    setDelegates(delegatesData)
    setClients(clientsData)
    setMatchingRenewals(renewalCount || 0)
    setSummary({
      expired,
      within30,
      within60,
      within90,
      clientsAffected: affectedClients,
      potentialRenewalDelegates: totalRenewals,
    })
    setLoading(false)
  }

  useEffect(() => {
    load(1)
  }, [])

  useEffect(() => {
    if (!profile?.organisation_id) return

    const timeout = window.setTimeout(() => {
      setCurrentPage(1)
      load(1)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [windowFilter, reminderFilter, profile?.organisation_id])

  const opportunities = useMemo(
    () => buildRenewalOpportunities(certificates, delegates, clients),
    [certificates, delegates, clients]
  )

  const groupedOpportunities = groupRenewalOpportunitiesByClient(opportunities)
  const remindersEnabled = organisation?.send_certificate_expiry_reminders !== false
  const reminderDays = Number(organisation?.certificate_expiry_reminder_days || 60)

  const getFormattedDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return 'Not set'

    return formatAppDate(String(dateValue).split('T')[0], organisation)
  }

  const ensureCertificateVerificationId = async (certificate: any) => {
    if (certificate.verification_id) return certificate.verification_id

    const verificationId = createCertificateVerificationId()

    const { data, error } = await supabase
      .from('certificates')
      .update({ verification_id: verificationId })
      .eq('id', certificate.id)
      .eq('organisation_id', profile.organisation_id)
      .select('verification_id')
      .single()

    if (error) throw new Error(error.message)

    return data?.verification_id || verificationId
  }

  const markReminderSent = async (certificateId: string) => {
    const sentAt = new Date().toISOString()

    const { error } = await supabase
      .from('certificates')
      .update({ expiry_reminder_sent_at: sentAt })
      .eq('id', certificateId)
      .eq('organisation_id', profile.organisation_id)

    if (error) throw new Error(error.message)

    setCertificates((previous) =>
      previous.map((certificate) =>
        certificate.id === certificateId
          ? { ...certificate, expiry_reminder_sent_at: sentAt }
          : certificate
      )
    )
  }

  const sendRenewalReminder = async (opportunity: any) => {
    if (!remindersEnabled) {
      return { sent: 0, skippedMissingEmail: 0, skippedAlreadySent: 1, failed: 0 }
    }

    const skipReason = getRenewalReminderSkipReason(
      opportunity.certificate,
      opportunity.delegate
    )

    if (skipReason === 'missing_email') {
      return { sent: 0, skippedMissingEmail: 1, skippedAlreadySent: 0, failed: 0 }
    }

    if (skipReason === 'already_reminded') {
      return { sent: 0, skippedMissingEmail: 0, skippedAlreadySent: 1, failed: 0 }
    }

    let verificationUrl = ''

    try {
      const verificationId = await ensureCertificateVerificationId(opportunity.certificate)
      verificationUrl = `${window.location.origin}/verify/${verificationId}`
    } catch {
      verificationUrl = ''
    }

    const response = await fetch('/api/send-expiry-reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: opportunity.delegate.email,
        learnerName:
          opportunity.certificate.learner_name ||
          opportunity.delegate.full_name,
        courseName: opportunity.certificate.course_name,
        expiryDate: getFormattedDate(opportunity.certificate.expiry_date),
        certificateNumber: opportunity.certificate.certificate_number,
        verificationUrl,
        businessName: organisation?.name || 'Hercules OS',
        businessEmail: organisation?.email || '',
        businessPhone: organisation?.phone || '',
        organisationId: profile.organisation_id,
      }),
    })

    if (!response.ok) {
      return { sent: 0, skippedMissingEmail: 0, skippedAlreadySent: 0, failed: 1 }
    }

    try {
      await markReminderSent(opportunity.certificate.id)
    } catch {
      return { sent: 0, skippedMissingEmail: 0, skippedAlreadySent: 0, failed: 1 }
    }

    return { sent: 1, skippedMissingEmail: 0, skippedAlreadySent: 0, failed: 0 }
  }

  const sendSingleReminder = async (opportunity: any) => {
    setSending(true)
    setMessage('')

    const result = await sendRenewalReminder(opportunity)

    setSending(false)
    setMessage(
      `Sent: ${result.sent}. Missing email: ${result.skippedMissingEmail}. Already reminded: ${result.skippedAlreadySent}. Failed: ${result.failed}.`
    )
  }

  const sendGroupReminders = async (items: any[]) => {
    setSending(true)
    setMessage('')

    const totals = {
      sent: 0,
      skippedMissingEmail: 0,
      skippedAlreadySent: 0,
      failed: 0,
    }

    for (const item of items) {
      const result = await sendRenewalReminder(item)
      totals.sent += result.sent
      totals.skippedMissingEmail += result.skippedMissingEmail
      totals.skippedAlreadySent += result.skippedAlreadySent
      totals.failed += result.failed
    }

    setSending(false)
    setMessage(
      `Sent: ${totals.sent}. Missing email: ${totals.skippedMissingEmail}. Already reminded: ${totals.skippedAlreadySent}. Failed: ${totals.failed}.`
    )
  }

  const totalPages = Math.max(1, Math.ceil(matchingRenewals / RENEWALS_PAGE_SIZE))
  const pageStart = matchingRenewals === 0 ? 0 : (currentPage - 1) * RENEWALS_PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * RENEWALS_PAGE_SIZE, matchingRenewals)

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)

    setCurrentPage(nextPage)
    load(nextPage)
  }

  const getEmptyStateMessage = () => {
    const windowText =
      windowFilter === 'expired'
        ? 'Expired certificates'
        : windowFilter === '30'
          ? 'Certificates expiring within 30 days'
          : windowFilter === '60'
            ? 'Certificates expiring within 60 days'
            : windowFilter === '90'
              ? 'Certificates expiring within 90 days'
              : 'Expired and upcoming certificates'

    if (reminderFilter === 'sent') {
      return `${windowText} with reminders already sent will appear here.`
    }

    if (reminderFilter === 'not_sent') {
      return `${windowText} still needing reminders will appear here.`
    }

    return `${windowText} will appear here.`
  }

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading renewals...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Renewal opportunities
            </p>

            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Expiring certificates
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Find expired and upcoming certificates, send renewal reminders, and create follow-up bookings.
            </p>
          </div>

          <Link
            href="/dashboard/bookings"
            className={buttonPrimary}
          >
            Create booking
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {[
          ['Expired', summary.expired],
          ['30 days', summary.within30],
          ['60 days', summary.within60],
          ['90 days', summary.within90],
          ['Clients affected', summary.clientsAffected],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </p>

            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className={panelClass}>
        <div className={`${panelHeaderClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Renewal list
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {summary.potentialRenewalDelegates} potential renewal delegate{summary.potentialRenewalDelegates === 1 ? '' : 's'}.
              Reminder setting: {remindersEnabled ? `enabled at ${reminderDays} days` : 'disabled'}.
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {loading
                ? 'Loading renewal records...'
                : `Showing ${pageStart}-${pageEnd} of ${matchingRenewals} renewal records.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              className={inputClass}
              value={windowFilter}
              onChange={(event) => setWindowFilter(event.target.value as any)}
            >
              <option value="all">All windows</option>
              <option value="expired">Expired</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>

            <select
              className={inputClass}
              value={reminderFilter}
              onChange={(event) => setReminderFilter(event.target.value as any)}
            >
              <option value="all">All reminders</option>
              <option value="not_sent">Reminder not sent</option>
              <option value="sent">Reminder sent</option>
            </select>
          </div>
        </div>

        {message && (
          <div className="border-b border-slate-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {groupedOpportunities.map((group) => {
            const sendableCount = group.opportunities.filter((opportunity) =>
              canSendRenewalReminder(opportunity.certificate, opportunity.delegate)
            ).length

            return (
              <div key={group.key} className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      {group.label}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {group.opportunities.length} certificate{group.opportunities.length === 1 ? '' : 's'} · {sendableCount} ready to remind
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className={buttonSecondary}
                      onClick={() => sendGroupReminders(group.opportunities)}
                      disabled={sending || !remindersEnabled || sendableCount === 0}
                    >
                      Send group reminders
                    </button>

                    <Link
                      href="/dashboard/bookings"
                      className={buttonPrimary}
                    >
                      Create renewal booking
                    </Link>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  {group.opportunities.map((opportunity) => {
                    const certificate = opportunity.certificate
                    const delegate = opportunity.delegate
                    const skipReason = getRenewalReminderSkipReason(certificate, delegate)

                    return (
                      <div
                        key={certificate.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-950">
                                {certificate.learner_name || delegate?.full_name || 'Unnamed learner'}
                              </p>

                              <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${windowStyles[opportunity.window]}`}>
                                {windowLabels[opportunity.window]}
                              </span>

                              {certificate.expiry_reminder_sent_at ? (
                                <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                  Reminder sent
                                </span>
                              ) : delegate?.email ? (
                                <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                                  Reminder not sent
                                </span>
                              ) : (
                                <span className="rounded-md border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                                  No email
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm text-slate-600">
                              {certificate.course_name || 'No course'}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Expires {getFormattedDate(certificate.expiry_date)}
                              {opportunity.daysUntilExpiry < 0
                                ? ` · ${Math.abs(opportunity.daysUntilExpiry)} days overdue`
                                : ` · ${opportunity.daysUntilExpiry} days left`}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 break-all">
                              Email: {delegate?.email || 'Not set'}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              className={buttonSecondary}
                              onClick={() => sendSingleReminder(opportunity)}
                              disabled={sending || !remindersEnabled || Boolean(skipReason)}
                            >
                              Send reminder
                            </button>

                            {delegate && (
                              <Link
                                href={`/dashboard/delegates/${delegate.id}`}
                                className={buttonSecondary}
                              >
                                View delegate
                              </Link>
                            )}

                            {group.client && (
                              <Link
                                href={`/dashboard/clients/${group.client.id}`}
                                className={buttonSecondary}
                              >
                                View client
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {groupedOpportunities.length === 0 && (
            <div className="p-6">
              <p className="text-sm font-semibold text-slate-950">
                No renewal opportunities found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {getEmptyStateMessage()}
              </p>
            </div>
          )}
        </div>

        {matchingRenewals > RENEWALS_PAGE_SIZE && (
          <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                className={buttonSecondary}
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
              >
                Previous
              </button>

              <button
                className={buttonSecondary}
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
