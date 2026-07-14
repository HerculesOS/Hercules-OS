'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { formatAppDate } from '@/lib/formatters'

const REQUESTS_PAGE_SIZE = 50

const cleanSearchTerm = (value: string) =>
  value.trim().replace(/[%_,]/g, ' ')

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [organisation, setOrganisation] = useState<any>(null)
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [convertingId, setConvertingId] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRequests, setTotalRequests] = useState(0)
  const [matchingRequests, setMatchingRequests] = useState(0)
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [contactedRequestsCount, setContactedRequestsCount] = useState(0)
  const [convertedRequestsCount, setConvertedRequestsCount] = useState(0)
  const [closedRequestsCount, setClosedRequestsCount] = useState(0)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [requestTypeFilter, setRequestTypeFilter] = useState('all')

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const buttonDanger =
    'border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-50'

  const panelClass =
    'bg-white border border-slate-200 rounded-lg'

  const panelHeaderClass =
    'px-4 py-3 border-b border-slate-200'

  const applyRequestFilters = (query: any, searchTerm: string) => {
    const cleanTerm = cleanSearchTerm(searchTerm)

    if (!cleanTerm) return query

    const term = `%${cleanTerm}%`

    return query.or(
      [
        `company_name.ilike.${term}`,
        `contact_name.ilike.${term}`,
        `email.ilike.${term}`,
        `phone.ilike.${term}`,
        `course_name.ilike.${term}`,
        `location.ilike.${term}`,
        `notes.ilike.${term}`,
        `status.ilike.${term}`,
      ].join(',')
    )
  }

  const applyRequestTypeFilter = (query: any) => {
    if (requestTypeFilter === 'public') {
      return query.or('notes.ilike.%public%,notes.ilike.%open course%')
    }

    if (requestTypeFilter === 'private') {
      return query.not('notes', 'ilike', '%public%').not('notes', 'ilike', '%open course%')
    }

    return query
  }

  const load = async (page = currentPage, searchTerm = search) => {
    setLoading(true)

    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data: organisationData } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single()

    const from = (page - 1) * REQUESTS_PAGE_SIZE
    const to = from + REQUESTS_PAGE_SIZE - 1
    let requestQuery = supabase
      .from('training_requests')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (statusFilter !== 'all') {
      requestQuery = requestQuery.eq('status', statusFilter)
    }

    requestQuery = applyRequestTypeFilter(requestQuery)
    requestQuery = applyRequestFilters(requestQuery, searchTerm)

    const { data, count, error } = await requestQuery

    const { count: allCount } = await supabase
      .from('training_requests')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)

    const getStatusCount = async (status: string) => {
      const { count: statusCount } = await supabase
        .from('training_requests')
        .select('id', { count: 'exact', head: true })
        .eq('organisation_id', profile.organisation_id)
        .eq('status', status)

      return statusCount || 0
    }

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setOrganisation(organisationData || null)
    setRequests(data || [])
    setMatchingRequests(count || 0)
    setTotalRequests(allCount || 0)
    setNewRequestsCount(await getStatusCount('new'))
    setContactedRequestsCount(await getStatusCount('contacted'))
    setConvertedRequestsCount(await getStatusCount('converted'))
    setClosedRequestsCount(await getStatusCount('closed'))
    setLoading(false)
  }

  useEffect(() => {
    load(1, '')
  }, [])

  useEffect(() => {
    if (!organisationId) return

    const timeout = window.setTimeout(() => {
      setCurrentPage(1)
      load(1, search)
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [search, statusFilter, requestTypeFilter, organisationId])

  const getFormattedDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return 'Not set'

    const dateOnly = String(dateValue).split('T')[0]

    return formatAppDate(dateOnly, organisation)
  }

  const publicRequestUrl = organisation?.public_request_slug
    ? `${window.location.origin}/request-training/${organisation.public_request_slug}`
    : ''

  const copyPublicRequestLink = async () => {
    if (!publicRequestUrl) return

    await navigator.clipboard.writeText(publicRequestUrl)
    alert('Public request link copied')
  }

  const getRequestType = (request: any) => {
    const notes = String(request.notes || '').toLowerCase()

    if (
      notes.includes('public/open course enquiry') ||
      notes.includes('public / open course') ||
      notes.includes('public course') ||
      notes.includes('open course')
    ) {
      return 'public'
    }

    return 'private'
  }

  const getRequestTypeLabel = (request: any) => {
    return getRequestType(request) === 'public'
      ? 'Public / open course'
      : 'Private / in-house'
  }

  const getRequestTypeStyle = (request: any) => {
    return getRequestType(request) === 'public'
      ? 'bg-purple-50 text-purple-700 border-purple-100'
      : 'bg-slate-50 text-slate-700 border-slate-200'
  }

  const getCleanNotes = (request: any) => {
    const notes = String(request.notes || '')

    return notes
      .replace(/^Request type:.*$/gim, '')
      .replace(/^Notes:\s*/gim, '')
      .trim()
  }

  const updateStatus = async (requestId: string, status: string) => {
    const { error } = await supabase
      .from('training_requests')
      .update({ status })
      .eq('id', requestId)

    if (error) {
      alert(error.message)
      return
    }

    load(currentPage, search)
  }

  const deleteRequest = async (requestId: string) => {
    const confirmDelete = confirm(
      'Are you sure you want to delete this training request?'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('training_requests')
      .delete()
      .eq('id', requestId)

    if (error) {
      alert(error.message)
      return
    }

    load(currentPage, search)
  }

  const convertRequest = async (request: any) => {
    const requestType = getRequestType(request)
    const confirmConvert = confirm(
      requestType === 'public'
        ? 'Create a public booking from this request? No main client will be attached.'
        : 'Create a client and private booking from this request?'
    )

    if (!confirmConvert) return

    setConvertingId(request.id)

    try {
      const { data: bookingId, error } = await supabase.rpc(
        'convert_training_request_to_booking',
        { p_request_id: request.id }
      )

      if (error) {
        throw new Error(error.message)
      }

      alert(
        requestType === 'public'
          ? 'Public booking created successfully.'
          : 'Client and booking created successfully.'
      )

      window.location.href = `/dashboard/bookings/${bookingId}`
    } catch (error: any) {
      alert(error.message || 'Could not convert request')
      setConvertingId('')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setRequestTypeFilter('all')
  }

  const publicRequestsCount = requests.filter(
    (request) => getRequestType(request) === 'public'
  ).length
  const privateRequestsCount = requests.filter(
    (request) => getRequestType(request) === 'private'
  ).length
  const totalPages = Math.max(1, Math.ceil(matchingRequests / REQUESTS_PAGE_SIZE))
  const pageStart = matchingRequests === 0 ? 0 : (currentPage - 1) * REQUESTS_PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * REQUESTS_PAGE_SIZE, matchingRequests)

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)

    setCurrentPage(nextPage)
    load(nextPage, search)
  }

  const getStatusStyle = (status: string) => {
    if (status === 'converted') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100'
    }

    if (status === 'contacted') {
      return 'bg-blue-50 text-blue-700 border-blue-100'
    }

    if (status === 'closed') {
      return 'bg-slate-50 text-slate-700 border-slate-200'
    }

    return 'bg-amber-50 text-amber-700 border-amber-100'
  }

  const StatCard = ({
    label,
    value,
    detail,
  }: {
    label: string
    value: string | number
    detail?: string
  }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h2 className="text-2xl font-semibold tracking-tight text-slate-950 mt-2">
        {value}
      </h2>

      {detail && (
        <p className="text-xs text-slate-500 mt-1">
          {detail}
        </p>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading training requests...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <StatCard
          label="Total"
          value={totalRequests}
          detail="All submitted requests"
        />

        <StatCard
          label="New"
          value={newRequestsCount}
          detail="Awaiting action"
        />

        <StatCard
          label="Private"
          value={privateRequestsCount}
          detail="On this page"
        />

        <StatCard
          label="Public"
          value={publicRequestsCount}
          detail="On this page"
        />

        <StatCard
          label="Converted"
          value={convertedRequestsCount}
          detail="Client or booking created"
        />
      </div>

      {(contactedRequestsCount > 0 || closedRequestsCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-800 text-sm">
            Contacted requests: {contactedRequestsCount}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-700 text-sm">
            Closed requests: {closedRequestsCount}
          </div>
        </div>
      )}

      <div className={`${panelClass} mb-4`}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Filters
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Search enquiries by company, contact, course, location, request type or notes.
          </p>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              className={`${inputClass} md:col-span-2`}
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="closed">Closed</option>
            </select>

            <select
              className={inputClass}
              value={requestTypeFilter}
              onChange={(e) => setRequestTypeFilter(e.target.value)}
            >
              <option value="all">All request types</option>
              <option value="private">Private only</option>
              <option value="public">Public only</option>
            </select>

            <button
              className={buttonSecondary}
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            {loading
              ? 'Loading requests...'
              : `Showing ${pageStart}-${pageEnd} of ${matchingRequests} matching requests. Total requests: ${totalRequests}.`}
          </p>
        </div>
      </div>

      <div className={panelClass}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Request list
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Convert enquiries into clients and correctly typed bookings, or manage their status.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {requests.map((request) => {
            const cleanNotes = getCleanNotes(request)

            return (
              <div
                key={request.id}
                className="p-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-950">
                        {request.company_name || 'Unnamed company'}
                      </h3>

                      <span
                        className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getStatusStyle(
                          request.status
                        )}`}
                      >
                        {request.status || 'new'}
                      </span>

                      <span
                        className={`border px-2.5 py-1 rounded-md text-xs font-medium ${getRequestTypeStyle(
                          request
                        )}`}
                      >
                        {getRequestTypeLabel(request)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 mt-1">
                      {request.contact_name || 'No contact name'}
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Submitted: {getFormattedDate(request.created_at)}
                    </p>
                  </div>

                  {request.status !== 'converted' && (
                    <button
                      className={buttonPrimary}
                      onClick={() => convertRequest(request)}
                      disabled={convertingId === request.id}
                    >
                      {convertingId === request.id
                        ? 'Converting...'
                        : `Create client & ${getRequestType(request) === 'public' ? 'public booking' : 'booking'}`}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-4 text-xs text-slate-600">
                  <div>
                    <p className="text-slate-400">Course</p>
                    <p className="font-medium text-slate-800 mt-1">
                      {request.course_name || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Preferred date</p>
                    <p className="font-medium text-slate-800 mt-1">
                      {getFormattedDate(request.preferred_date)}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Learners</p>
                    <p className="font-medium text-slate-800 mt-1">
                      {request.learner_count || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Location</p>
                    <p className="font-medium text-slate-800 mt-1">
                      {request.location || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Email</p>
                    <p className="font-medium text-slate-800 mt-1 break-all">
                      {request.email || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <p className="text-slate-400">Phone</p>
                    <p className="font-medium text-slate-800 mt-1">
                      {request.phone || 'Not set'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                    Request details
                  </p>

                  <p className="text-xs text-slate-700 leading-5">
                    Type: <span className="font-semibold">{getRequestTypeLabel(request)}</span>
                  </p>

                  {cleanNotes ? (
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-5 mt-2">
                      {cleanNotes}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-2">
                      No extra notes provided.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {request.status !== 'contacted' && (
                    <button
                      className={buttonSecondary}
                      onClick={() => updateStatus(request.id, 'contacted')}
                    >
                      Mark contacted
                    </button>
                  )}

                  {request.status !== 'converted' && (
                    <button
                      className={buttonSecondary}
                      onClick={() => updateStatus(request.id, 'converted')}
                    >
                      Mark converted
                    </button>
                  )}

                  {request.status !== 'closed' && (
                    <button
                      className={buttonSecondary}
                      onClick={() => updateStatus(request.id, 'closed')}
                    >
                      Close
                    </button>
                  )}

                  {request.status !== 'new' && (
                    <button
                      className={buttonSecondary}
                      onClick={() => updateStatus(request.id, 'new')}
                    >
                      Mark new
                    </button>
                  )}

                  {request.status === 'converted' && (
                    <Link
                      href="/dashboard/bookings"
                      className={buttonSecondary}
                    >
                      View bookings
                    </Link>
                  )}

                  <button
                    className={buttonDanger}
                    onClick={() => deleteRequest(request.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}

          {requests.length === 0 && !loading && (
            <div className="p-6">
              <p className="text-sm font-semibold text-slate-950">
                No training requests yet
              </p>

              <p className="text-sm text-slate-500 mt-1">
                New enquiries from your public request form will appear here.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {publicRequestUrl ? (
                  <>
                    <Link
                      href={publicRequestUrl}
                      target="_blank"
                      className={buttonPrimary}
                    >
                      Open public form
                    </Link>

                    <button
                      className={buttonSecondary}
                      onClick={copyPublicRequestLink}
                    >
                      Copy public link
                    </button>
                  </>
                ) : (
                  <Link
                    href="/dashboard/settings"
                    className={buttonPrimary}
                  >
                    Set public request link
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {matchingRequests > REQUESTS_PAGE_SIZE && (
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
