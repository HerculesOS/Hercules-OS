'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function RequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [convertingId, setConvertingId] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

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

  const load = async () => {
    const profile = await getOrCreateAccount()
    const { data: userData } = await supabase.auth.getUser()

    setOrganisationId(profile.organisation_id)
    setUserId(userData.user?.id || '')

    const { data, error } = await supabase
      .from('training_requests')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setRequests(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const updateStatus = async (requestId: string, status: string) => {
    const { error } = await supabase
      .from('training_requests')
      .update({ status })
      .eq('id', requestId)

    if (error) {
      alert(error.message)
      return
    }

    load()
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

    load()
  }

  const findExistingClient = async (request: any) => {
    const companyName = request.company_name?.trim()

    if (!companyName) return null

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', organisationId)
      .ilike('company', companyName)
      .maybeSingle()

    return data
  }

  const createClientFromRequest = async (request: any) => {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        organisation_id: organisationId,
        company: request.company_name || 'Unnamed company',
        name: request.contact_name || 'Primary contact',
        email: request.email || '',
        phone: request.phone || '',
        address: request.location || '',
        notes: request.notes || '',
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  const createBookingFromRequest = async (request: any, client: any) => {
    if (!request.preferred_date) {
      throw new Error(
        'This request has no preferred date. Add a date to the booking manually or update the request first.'
      )
    }

    const bookingNotes = [
      request.notes ? `Request notes: ${request.notes}` : '',
      request.learner_count ? `Learners requested: ${request.learner_count}` : '',
      `Created from public request.`,
    ]
      .filter(Boolean)
      .join('\n')

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        organisation_id: organisationId,
        client_id: client.id,
        trainer_id: null,
        client_name: client.name,
        course_name: request.course_name || 'Training course',
        date: request.preferred_date,
        start_time: null,
        end_time: null,
        location: request.location || '',
        price: null,
        notes: bookingNotes,
        status: 'scheduled',
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  const convertRequest = async (request: any) => {
    const confirmConvert = confirm(
      'Create a client and booking from this request?'
    )

    if (!confirmConvert) return

    setConvertingId(request.id)

    try {
      let client = await findExistingClient(request)

      if (!client) {
        client = await createClientFromRequest(request)
      }

      const booking = await createBookingFromRequest(request, client)

      const { error: updateError } = await supabase
        .from('training_requests')
        .update({ status: 'converted' })
        .eq('id', request.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      alert('Client and booking created successfully.')

      window.location.href = `/dashboard/bookings/${booking.id}`
    } catch (error: any) {
      alert(error.message || 'Could not convert request')
      setConvertingId('')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  const filteredRequests = requests.filter((request) => {
    const searchableText = `
      ${request.company_name || ''}
      ${request.contact_name || ''}
      ${request.email || ''}
      ${request.phone || ''}
      ${request.course_name || ''}
      ${request.location || ''}
      ${request.notes || ''}
      ${request.status || ''}
    `.toLowerCase()

    const matchesSearch = searchableText.includes(search.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' || request.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const newRequests = requests.filter((request) => request.status === 'new')
  const contactedRequests = requests.filter(
    (request) => request.status === 'contacted'
  )
  const convertedRequests = requests.filter(
    (request) => request.status === 'converted'
  )
  const closedRequests = requests.filter((request) => request.status === 'closed')

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
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Requests
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
            Training requests
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Review enquiries submitted through your public training request link.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        <StatCard
          label="Total"
          value={requests.length}
          detail="All submitted requests"
        />

        <StatCard
          label="New"
          value={newRequests.length}
          detail="Awaiting action"
        />

        <StatCard
          label="Contacted"
          value={contactedRequests.length}
          detail="Follow-up started"
        />

        <StatCard
          label="Converted"
          value={convertedRequests.length}
          detail="Client or booking created"
        />

        <StatCard
          label="Closed"
          value={closedRequests.length}
          detail="No further action"
        />
      </div>

      <div className={`${panelClass} mb-4`}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Filters
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Search enquiries by company, contact, course, location or notes.
          </p>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

            <button
              className={buttonSecondary}
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            Showing {filteredRequests.length} of {requests.length} requests
          </p>
        </div>
      </div>

      <div className={panelClass}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Request list
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Convert enquiries into clients and bookings, or manage their status.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredRequests.map((request) => (
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
                  </div>

                  <p className="text-sm text-slate-600 mt-1">
                    {request.contact_name || 'No contact name'}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    Submitted:{' '}
                    {request.created_at
                      ? new Date(request.created_at).toLocaleDateString()
                      : 'Not set'}
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
                      : 'Create client & booking'}
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
                    {request.preferred_date || 'Not set'}
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

              {request.notes && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                    Notes
                  </p>

                  <p className="text-xs text-slate-700 whitespace-pre-line leading-5">
                    {request.notes}
                  </p>
                </div>
              )}

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
          ))}

          {filteredRequests.length === 0 && (
            <div className="p-6 text-sm text-slate-500">
              No training requests found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}