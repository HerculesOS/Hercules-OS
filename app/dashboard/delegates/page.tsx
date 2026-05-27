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

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading delegates...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Delegates
        </h1>

        <p className="text-gray-500 mt-1">
          Manage learners across all clients and bookings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Total Delegates</p>
          <h2 className="text-3xl font-bold mt-2">{delegates.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">With Email</p>
          <h2 className="text-3xl font-bold mt-2">{delegatesWithEmail.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Search Results</p>
          <h2 className="text-3xl font-bold mt-2">{filteredDelegates.length}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Add Delegate
          </h2>

          <div className="flex flex-col gap-3">
            <select
              className="border p-3 rounded-lg"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select Client / Company</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company} - {client.name}
                </option>
              ))}
            </select>

            <input
              className="border p-3 rounded-lg"
              placeholder="Delegate full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Delegate email optional"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Delegate phone optional"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <textarea
              className="border p-3 rounded-lg"
              placeholder="Notes optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button
              className="bg-black text-white p-3 rounded-lg"
              onClick={addDelegate}
            >
              Add Delegate
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border rounded-2xl p-4 shadow-sm mb-4">
            <input
              className="w-full border p-3 rounded-lg"
              placeholder="Search delegates by name, email, client or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-4">
            {filteredDelegates.map((delegate) => {
              const client = getClientForDelegate(delegate)
              const isEditing = editingId === delegate.id

              return (
                <div
                  key={delegate.id}
                  className="bg-white border rounded-2xl p-5 shadow-sm"
                >
                  {!isEditing ? (
                    <>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-semibold">
                            {delegate.full_name}
                          </h2>

                          <p className="text-gray-500 mt-1">
                            {client?.company || 'No client assigned'}
                          </p>

                          {client?.name && (
                            <p className="text-sm text-gray-400 mt-1">
                              Primary contact: {client.name}
                            </p>
                          )}
                        </div>

                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm w-fit">
                          Active
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm text-gray-600">
                        <p>Email: {delegate.email || 'Not set'}</p>
                        <p>Phone: {delegate.phone || 'Not set'}</p>

                        {delegate.notes && (
                          <p className="md:col-span-2">
                            Notes: {delegate.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 mt-5">
                        <Link
                          href={`/dashboard/delegates/${delegate.id}`}
                          className="bg-black text-white px-4 py-2 rounded-lg"
                        >
                          View Profile
                        </Link>

                        {client && (
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="border px-4 py-2 rounded-lg"
                          >
                            View Client
                          </Link>
                        )}

                        <button
                          className="border px-4 py-2 rounded-lg"
                          onClick={() => startEditing(delegate)}
                        >
                          Edit
                        </button>

                        <button
                          className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
                          onClick={() => deleteDelegate(delegate.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-5">
                        <h2 className="text-xl font-semibold">
                          Edit Delegate
                        </h2>

                        <p className="text-gray-500 mt-1">
                          Update learner details
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select
                          className="border p-3 rounded-lg md:col-span-2"
                          value={editClientId}
                          onChange={(e) => setEditClientId(e.target.value)}
                        >
                          <option value="">Select Client / Company</option>

                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.company} - {client.name}
                            </option>
                          ))}
                        </select>

                        <input
                          className="border p-3 rounded-lg"
                          placeholder="Delegate full name"
                          value={editFullName}
                          onChange={(e) => setEditFullName(e.target.value)}
                        />

                        <input
                          className="border p-3 rounded-lg"
                          placeholder="Email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />

                        <input
                          className="border p-3 rounded-lg"
                          placeholder="Phone"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                        />

                        <textarea
                          className="border p-3 rounded-lg"
                          placeholder="Notes"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-3 mt-5">
                        <button
                          className="bg-black text-white px-4 py-2 rounded-lg"
                          onClick={() => saveDelegate(delegate.id)}
                        >
                          Save Delegate
                        </button>

                        <button
                          className="border px-4 py-2 rounded-lg"
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
              <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
                No delegates found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}