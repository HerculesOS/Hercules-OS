'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const [editingId, setEditingId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data } = await supabase
      .from('trainers')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('created_at', { ascending: false })

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

    const { error } = await supabase.from('trainers').insert({
      organisation_id: organisationId,
      name,
      email,
      phone,
      notes,
    })

    if (error) {
      alert(error.message)
      return
    }

    setName('')
    setEmail('')
    setPhone('')
    setNotes('')

    load()
  }

  const startEditing = (trainer: any) => {
    setEditingId(trainer.id)
    setEditName(trainer.name || '')
    setEditEmail(trainer.email || '')
    setEditPhone(trainer.phone || '')
    setEditNotes(trainer.notes || '')
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditName('')
    setEditEmail('')
    setEditPhone('')
    setEditNotes('')
  }

  const saveTrainerEdit = async (trainerId: string) => {
    if (!editName) {
      alert('Trainer name is required')
      return
    }

    setSavingEdit(true)

    const { error } = await supabase
      .from('trainers')
      .update({
        name: editName,
        email: editEmail,
        phone: editPhone,
        notes: editNotes,
      })
      .eq('id', trainerId)

    setSavingEdit(false)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    load()
  }

  const deleteTrainer = async (trainerId: string) => {
    const confirmDelete = confirm(
      'Are you sure you want to delete this trainer? Existing bookings may still reference this trainer.'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('trainers')
      .delete()
      .eq('id', trainerId)

    if (error) {
      alert(`Could not delete trainer: ${error.message}`)
      return
    }

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

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Active Trainers
          </p>

          <h2 className="text-3xl font-bold mt-2">
            {trainers.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">
            Trainer Records
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
          {trainers.map((trainer) => {
            const isEditing = editingId === trainer.id

            return (
              <div
                key={trainer.id}
                className="bg-white border rounded-2xl p-5 shadow-sm"
              >
                {!isEditing ? (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">
                          {trainer.name}
                        </h2>

                        <p className="text-gray-500 mt-1">
                          {trainer.email || 'No email set'}
                        </p>
                      </div>

                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                        Active
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-gray-600 space-y-1">
                      <p>
                        Phone: {trainer.phone || 'Not set'}
                      </p>

                      <p>
                        Notes: {trainer.notes || 'No notes'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-5">
                      <button
                        className="border px-4 py-2 rounded-lg"
                        onClick={() => startEditing(trainer)}
                      >
                        Edit
                      </button>

                      <button
                        className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
                        onClick={() => deleteTrainer(trainer.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-5">
                      <h2 className="text-xl font-semibold">
                        Edit Trainer
                      </h2>

                      <p className="text-gray-500 mt-1">
                        Update trainer contact details and notes
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        className="border p-3 rounded-lg"
                        placeholder="Trainer name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
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
                        className="border p-3 rounded-lg md:col-span-2"
                        placeholder="Notes"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3 mt-5">
                      <button
                        className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                        onClick={() => saveTrainerEdit(trainer.id)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>

                      <button
                        className="border px-4 py-2 rounded-lg"
                        onClick={cancelEditing}
                        disabled={savingEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {trainers.length === 0 && (
            <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
              No trainers yet. Add your first trainer.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}