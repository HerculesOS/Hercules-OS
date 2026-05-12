'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<any[]>([])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [organisationId, setOrganisationId] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data } = await supabase
      .from('trainers')
      .select('*')
      .eq('organisation_id', profile.organisation_id)

    setTrainers(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const addTrainer = async () => {
    if (!name) {
      alert('Trainer name is required')
      return
    }

    await supabase.from('trainers').insert({
      organisation_id: organisationId,
      name,
      email,
      phone,
      notes,
    })

    setName('')
    setEmail('')
    setPhone('')
    setNotes('')

    load()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Trainers
        </h1>

        <p className="text-gray-500 mt-1">
          Manage trainers and delivery staff
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Total Trainers
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {trainers.length}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Add Trainer
          </h2>

          <div className="flex flex-col gap-3">
            <input
              className="border p-3 rounded-lg"
              placeholder="Trainer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

            <textarea
              className="border p-3 rounded-lg"
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button
              className="bg-black text-white p-3 rounded-lg"
              onClick={addTrainer}
            >
              Add Trainer
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 grid gap-4">
          {trainers.map((trainer) => (
            <div
              key={trainer.id}
              className="bg-white border rounded-2xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">
                    {trainer.name}
                  </h2>

                  <p className="text-gray-500 mt-1">
                    {trainer.email}
                  </p>
                </div>

                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                  Active
                </div>
              </div>

              <p className="text-sm text-gray-600 mt-4">
                {trainer.phone}
              </p>

              <p className="text-sm text-gray-500 mt-2">
                {trainer.notes}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}