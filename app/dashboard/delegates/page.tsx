'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { fetchPaginatedImportRecords } from '@/lib/importCsv'

const DELEGATES_PAGE_SIZE = 50

const cleanSearchTerm = (value: string) =>
  value.trim().replace(/[%_,]/g, ' ')

export default function DelegatesPage() {
  const [delegates, setDelegates] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalDelegates, setTotalDelegates] = useState(0)
  const [matchingDelegates, setMatchingDelegates] = useState(0)
  const [delegatesWithEmailCount, setDelegatesWithEmailCount] = useState(0)
  const [delegatesWithPhoneCount, setDelegatesWithPhoneCount] = useState(0)
  const [delegatesWithClientCount, setDelegatesWithClientCount] = useState(0)

  const [clientId, setClientId] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState('')
  const [editClientId, setEditClientId] = useState('')
  const [editFullName, setEditFullName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')

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

  const getMatchingClientIds = async (organisationIdValue: string, searchTerm: string) => {
    const cleanTerm = cleanSearchTerm(searchTerm)

    if (!cleanTerm) return []

    const term = `%${cleanTerm}%`

    return fetchPaginatedImportRecords<any>(
      async (from, to) =>
        await supabase
          .from('clients')
          .select('id')
          .eq('organisation_id', organisationIdValue)
          .or(`company.ilike.${term},name.ilike.${term}`)
          .order('company', { ascending: true })
          .range(from, to)
    )
  }

  const applyDelegateSearch = (query: any, searchTerm: string, matchingClientIds: string[]) => {
    const cleanTerm = cleanSearchTerm(searchTerm)

    if (!cleanTerm) return query

    const term = `%${cleanTerm}%`
    const filters = [
      `full_name.ilike.${term}`,
      `email.ilike.${term}`,
      `phone.ilike.${term}`,
      `notes.ilike.${term}`,
    ]

    if (matchingClientIds.length > 0) {
      filters.push(`client_id.in.(${matchingClientIds.join(',')})`)
    }

    return query.or(filters.join(','))
  }

  const load = async (page = currentPage, searchTerm = search) => {
    setLoading(true)

    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const clientsData = await fetchPaginatedImportRecords<any>(
      async (from, to) =>
        await supabase
          .from('clients')
          .select('*')
          .eq('organisation_id', profile.organisation_id)
          .order('company', { ascending: true })
          .range(from, to)
    )

    const matchingClientRows = await getMatchingClientIds(profile.organisation_id, searchTerm)
    const matchingClientIds = matchingClientRows.map((client) => client.id)
    const from = (page - 1) * DELEGATES_PAGE_SIZE
    const to = from + DELEGATES_PAGE_SIZE - 1

    const delegateQuery = supabase
      .from('delegates')
      .select('*', { count: 'exact' })
      .eq('organisation_id', profile.organisation_id)
      .order('full_name', { ascending: true })
      .range(from, to)

    const { data: delegatesData, count, error } = await applyDelegateSearch(
      delegateQuery,
      searchTerm,
      matchingClientIds
    )

    const { count: allCount } = await supabase
      .from('delegates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)

    const { count: emailCount } = await supabase
      .from('delegates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)
      .not('email', 'is', null)
      .neq('email', '')

    const { count: phoneCount } = await supabase
      .from('delegates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)
      .not('phone', 'is', null)
      .neq('phone', '')

    const { count: linkedCount } = await supabase
      .from('delegates')
      .select('id', { count: 'exact', head: true })
      .eq('organisation_id', profile.organisation_id)
      .not('client_id', 'is', null)

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setClients(clientsData || [])
    setDelegates(delegatesData || [])
    setMatchingDelegates(count || 0)
    setTotalDelegates(allCount || 0)
    setDelegatesWithEmailCount(emailCount || 0)
    setDelegatesWithPhoneCount(phoneCount || 0)
    setDelegatesWithClientCount(linkedCount || 0)
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
  }, [search, organisationId])

  const getClientForDelegate = (delegate: any) => {
    return clients.find((client) => client.id === delegate.client_id)
  }

  const addDelegate = async () => {
    if (!clientId || !fullName) {
      alert('Client and delegate name are required')
      return
    }

    const { error } = await supabase.from('delegates').insert({
      organisation_id: organisationId,
      client_id: clientId,
      booking_id: null,
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    })

    if (error) {
      alert(error.message)
      return
    }

    setClientId('')
    setFullName('')
    setEmail('')
    setPhone('')
    setNotes('')

    setCurrentPage(1)
    load(1, search)
  }

  const startEditing = (delegate: any) => {
    setEditingId(delegate.id)
    setEditClientId(delegate.client_id || '')
    setEditFullName(delegate.full_name || '')
    setEditEmail(delegate.email || '')
    setEditPhone(delegate.phone || '')
    setEditNotes(delegate.notes || '')
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditClientId('')
    setEditFullName('')
    setEditEmail('')
    setEditPhone('')
    setEditNotes('')
  }

  const saveDelegate = async (delegateId: string) => {
    if (!editClientId || !editFullName) {
      alert('Client and delegate name are required')
      return
    }

    const { error } = await supabase
      .from('delegates')
      .update({
        client_id: editClientId,
        full_name: editFullName,
        email: editEmail || null,
        phone: editPhone || null,
        notes: editNotes || null,
      })
      .eq('id', delegateId)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    load(currentPage, search)
  }

  const deleteDelegate = async (delegateId: string) => {
    const confirmDelete = confirm(
      'Are you sure you want to delete this delegate? This may remove their booking links.'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('delegates')
      .delete()
      .eq('id', delegateId)

    if (error) {
      alert(error.message)
      return
    }

    load(currentPage, search)
  }

  const clearSearch = () => {
    setSearch('')
  }

  const totalPages = Math.max(1, Math.ceil(matchingDelegates / DELEGATES_PAGE_SIZE))
  const pageStart = matchingDelegates === 0 ? 0 : (currentPage - 1) * DELEGATES_PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * DELEGATES_PAGE_SIZE, matchingDelegates)

  const goToPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages)

    setCurrentPage(nextPage)
    load(nextPage, search)
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
          Loading delegates...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total delegates"
          value={totalDelegates}
          detail="All learner profiles"
        />

        <StatCard
          label="With email"
          value={delegatesWithEmailCount}
          detail="Can receive certificates"
        />

        <StatCard
          label="With phone"
          value={delegatesWithPhoneCount}
          detail="Phone number saved"
        />

        <StatCard
          label="Search results"
          value={matchingDelegates}
          detail="Matching current filter"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div id="add-delegate" className={`xl:col-span-4 ${panelClass} h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Add delegate
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Create a learner profile and assign them to a client.
            </p>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <select
              className={inputClass}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select client / company</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company} - {client.name}
                </option>
              ))}
            </select>

            <input
              className={inputClass}
              placeholder="Delegate full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Delegate email optional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Delegate phone optional"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <textarea
              className={`${inputClass} min-h-24`}
              placeholder="Notes optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button
              className={buttonPrimary}
              onClick={addDelegate}
            >
              Add delegate
            </button>
          </div>
        </div>

        <div className="xl:col-span-8 grid gap-4">
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Search delegates
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Find learners by name, email, phone, client or notes.
              </p>
            </div>

            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Search delegates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <button
                  className={buttonSecondary}
                  onClick={clearSearch}
                >
                  Clear
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-3">
                {loading
                  ? 'Loading delegates...'
                  : `Showing ${pageStart}-${pageEnd} of ${matchingDelegates} matching delegates. Total delegates: ${totalDelegates}. ${delegatesWithClientCount} linked to clients.`}
              </p>
            </div>
          </div>

          <div className={panelClass}>
            <div className={`${panelHeaderClass} flex items-center justify-between`}>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Delegate list
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Open a delegate to view bookings, certificates and history.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {delegates.map((delegate) => {
                const client = getClientForDelegate(delegate)
                const isEditing = editingId === delegate.id

                return (
                  <div
                    key={delegate.id}
                    className="p-4"
                  >
                    {!isEditing ? (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-950">
                                {delegate.full_name}
                              </h3>

                              <span className="border border-emerald-100 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                Active
                              </span>

                              {delegate.email ? (
                                <span className="border border-blue-100 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                  Email set
                                </span>
                              ) : (
                                <span className="border border-slate-200 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                  No email
                                </span>
                              )}
                            </div>

                            <p className="text-sm text-slate-600 mt-1">
                              {client?.company || 'No client assigned'}
                            </p>

                            {client?.name && (
                              <p className="text-xs text-slate-500 mt-1">
                                Primary contact: {client.name}
                              </p>
                            )}
                          </div>

                          <Link
                            href={`/dashboard/delegates/${delegate.id}`}
                            className={buttonPrimary}
                          >
                            View profile
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4 text-xs text-slate-600">
                          <div>
                            <p className="text-slate-400">Email</p>
                            <p className="font-medium text-slate-800 mt-1 break-all">
                              {delegate.email || 'Not set'}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">Phone</p>
                            <p className="font-medium text-slate-800 mt-1">
                              {delegate.phone || 'Not set'}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">Notes</p>
                            <p className="font-medium text-slate-800 mt-1">
                              {delegate.notes || 'No notes'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          {client && (
                            <Link
                              href={`/dashboard/clients/${client.id}`}
                              className={buttonSecondary}
                            >
                              View client
                            </Link>
                          )}

                          <button
                            className={buttonSecondary}
                            onClick={() => startEditing(delegate)}
                          >
                            Edit
                          </button>

                          <button
                            className={buttonDanger}
                            onClick={() => deleteDelegate(delegate.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-slate-950">
                            Edit delegate
                          </h3>

                          <p className="text-xs text-slate-500 mt-1">
                            Update learner details.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select
                            className={`${inputClass} md:col-span-2`}
                            value={editClientId}
                            onChange={(e) => setEditClientId(e.target.value)}
                          >
                            <option value="">Select client / company</option>

                            {clients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.company} - {client.name}
                              </option>
                            ))}
                          </select>

                          <input
                            className={inputClass}
                            placeholder="Delegate full name"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                          />

                          <input
                            className={inputClass}
                            placeholder="Email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                          />

                          <input
                            className={inputClass}
                            placeholder="Phone"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                          />

                          <textarea
                            className={`${inputClass} min-h-20`}
                            placeholder="Notes"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            className={buttonPrimary}
                            onClick={() => saveDelegate(delegate.id)}
                          >
                            Save delegate
                          </button>

                          <button
                            className={buttonSecondary}
                            onClick={cancelEditing}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}

              {delegates.length === 0 && !loading && (
                <div className="p-6">
                  <p className="text-sm font-semibold text-slate-950">
                    {search ? 'No matching delegates' : 'No delegates yet'}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    {search
                      ? 'Try a different search term or clear the filter.'
                      : 'Add delegates directly or attach them while creating bookings.'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href="#add-delegate"
                      className={buttonPrimary}
                    >
                      Add delegate
                    </a>

                    <Link
                      href="/dashboard/import"
                      className={buttonSecondary}
                    >
                      Import delegates
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {matchingDelegates > DELEGATES_PAGE_SIZE && (
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
      </div>
    </div>
  )
}
