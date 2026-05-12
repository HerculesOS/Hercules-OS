'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

    setClients(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const addClient = async () => {
    if (!name || !company) {
      alert('Name and company are required')
      return
    }

    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.from('clients').insert({
      name,
      email,
      company,
      phone,
      user_id: userData.user?.id,
      organisation_id: organisationId,
    })

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    setEmail('')
    setCompany('')
    setPhone('')

    load()
  }

  const filteredClients = clients.filter((client) =>
    `${client.name} ${client.company} ${client.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Clients
        </h1>

        <p className="text-gray-500 mt-1">
          Manage organisations and contacts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Total Clients
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {clients.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Active Organisations
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {clients.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Upcoming Renewals
          </p>

          <h2 className="text-3xl font-bold mt-2">
            0
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Add Client
          </h2>

          <div className="flex flex-col gap-3">
            <input
              className="border p-3 rounded-lg"
              placeholder="Contact name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <button
              className="bg-black text-white p-3 rounded-lg"
              onClick={addClient}
            >
              Add Client
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border rounded-2xl p-4 shadow-sm mb-4">
            <input
              className="w-full border p-3 rounded-lg"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-4">
            {filteredClients.map((client) => (
              <Link
                href={`/dashboard/clients/${client.id}`}
                key={client.id}
                className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition block"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {client.company}
                    </h2>

                    <p className="text-gray-500 mt-1">
                      {client.name}
                    </p>
                  </div>

                  <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                    Active
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  <p>{client.email}</p>
                  <p>{client.phone}</p>
                </div>

                <p className="text-sm text-gray-400 mt-4">
                  Click to view client profile
                </p>
              </Link>
            ))}

            {filteredClients.length === 0 && (
              <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
                No clients found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}