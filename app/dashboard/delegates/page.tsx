'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function DelegatesPage() {
  const [delegates, setDelegates] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)

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

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('company', { ascending: true })

    const { data: delegatesData, error } = await supabase
      .from('delegates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('full_name', { ascending: true })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setClients(clientsData || [])
    setDelegates(delegatesData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

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

    load()
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
    load()
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

    load()
  }

  const clearSearch = () => {
    setSearch('')
  }

  const filteredDelegates = delegates.filter((delegate) => {
    const client = getClientForDelegate(delegate)

    const searchableText = `
      ${delegate.full_name || ''}
      ${delegate.email || ''}
      ${delegate.phone || ''}
      ${delegate.notes || ''}
      ${client?.company || ''}
      ${client?.name || ''}
    `.toLowerCase()

    return searchableText.includes(search.toLowerCase())
  })

  const delegatesWithEmail = delegates.filter((delegate) => delegate.email)
  const delegatesWithPhone = delegates.filter((delegate) => delegate.phone)
  const delegatesWithClient = delegates.filter((delegate) => delegate.client_id)

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
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Delegates
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
            Learner records
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage learners across all clients, bookings and certificates.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total delegates"
          value={delegates.length}
          detail="All learner profiles"
        />

        <StatCard
          label="With email"
          value={delegatesWithEmail.length}
          detail="Can receive certificates"
        />

        <StatCard
          label="With phone"
          value={delegatesWithPhone.length}
          detail="Phone number saved"
        />

        <StatCard
          label="Search results"
          value={filteredDelegates.length}
          detail="Matching current filter"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-4 ${panelClass} h-fit`}>
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
                Showing {filteredDelegates.length} of {delegates.length} delegates · {delegatesWithClient.length} linked to clients
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
              {filteredDelegates.map((delegate) => {
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

              {filteredDelegates.length === 0 && (
                <div className="p-6 text-sm text-slate-500">
                  No delegates found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}