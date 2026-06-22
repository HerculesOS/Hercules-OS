'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')

  const [company, setCompany] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')

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

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('company', { ascending: true })
      .order('name', { ascending: true })

    setClients(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const addClient = async () => {
    if (!company || !name) {
      alert('Company and primary contact name are required')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from('clients').insert({
      company,
      name,
      email,
      phone,
      address,
      notes,
      user_id: userData.user?.id,
      organisation_id: organisationId,
    })

    if (error) {
      alert(error.message)
      return
    }

    setCompany('')
    setName('')
    setEmail('')
    setPhone('')
    setAddress('')
    setNotes('')

    load()
  }

  const clearSearch = () => {
    setSearch('')
  }

  const filteredClients = clients.filter((client) =>
    `
      ${client.company || ''}
      ${client.name || ''}
      ${client.email || ''}
      ${client.phone || ''}
      ${client.address || ''}
      ${client.notes || ''}
    `
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const clientsWithEmail = clients.filter((client) => client.email)
  const clientsWithPhone = clients.filter((client) => client.phone)

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

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total clients"
          value={clients.length}
          detail="All client records"
        />

        <StatCard
          label="With email"
          value={clientsWithEmail.length}
          detail="Can receive booking emails"
        />

        <StatCard
          label="With phone"
          value={clientsWithPhone.length}
          detail="Phone number saved"
        />

        <StatCard
          label="Search results"
          value={filteredClients.length}
          detail="Matching current filter"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div id="add-client" className={`xl:col-span-4 ${panelClass} h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Add client
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Create a company, school or customer profile.
            </p>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <input
              className={inputClass}
              placeholder="Company / school name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Primary contact name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Primary contact email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Primary contact phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <textarea
              className={`${inputClass} min-h-20`}
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <textarea
              className={`${inputClass} min-h-20`}
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button
              className={buttonPrimary}
              onClick={addClient}
            >
              Add client
            </button>
          </div>
        </div>

        <div className="xl:col-span-8 grid gap-4">
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Search clients
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Find clients by company, contact, email, phone, address or notes.
              </p>
            </div>

            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Search clients..."
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
                Showing {filteredClients.length} of {clients.length} clients
              </p>
            </div>
          </div>

          <div className={panelClass}>
            <div className={`${panelHeaderClass} flex items-center justify-between`}>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  Client list
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Open a client to view bookings, delegates and history.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="p-3"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1.2fr_auto] gap-3 lg:items-center">
                    <h3 className="text-sm font-semibold text-slate-950">
                      {client.company || 'Unnamed company'}
                    </h3>

                    <p className="text-sm text-slate-600">
                      {client.name || 'No primary contact'}
                    </p>

                    <p className="text-sm text-slate-600 break-all">
                      {client.email || 'No email'}
                    </p>

                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className={buttonPrimary}
                    >
                      View client
                    </Link>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-950">
                      Details
                    </summary>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-600">
                      <div>
                        <p className="text-slate-400">Phone</p>
                        <p className="font-medium text-slate-800 mt-1">
                          {client.phone || 'Not set'}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-400">Address</p>
                        <p className="font-medium text-slate-800 mt-1 whitespace-pre-line">
                          {client.address || 'Not set'}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <p className="text-slate-400">Notes</p>
                        <p className="font-medium text-slate-800 mt-1 whitespace-pre-line">
                          {client.notes || 'No notes'}
                        </p>
                      </div>

                      <div className="md:col-span-2 flex flex-wrap gap-2 pt-1">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className={buttonSecondary}
                        >
                          Open profile
                        </Link>
                      </div>
                    </div>
                  </details>
                </div>
              ))}

              {filteredClients.length === 0 && (
                <div className="p-6">
                  <p className="text-sm font-semibold text-slate-950">
                    No clients yet
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Add your first client to start managing bookings, delegates and invoices.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href="#add-client"
                      className={buttonPrimary}
                    >
                      Add client
                    </a>

                    <Link
                      href="/dashboard/import"
                      className={buttonSecondary}
                    >
                      Import clients
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
