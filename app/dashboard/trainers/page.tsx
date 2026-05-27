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

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [editName, setEditName] = useState('')
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

  const clearSearch = () => {
    setSearch('')
  }

  const filteredTrainers = trainers.filter((trainer) => {
    const searchableText = `
      ${trainer.name || ''}
      ${trainer.email || ''}
      ${trainer.phone || ''}
      ${trainer.notes || ''}
    `.toLowerCase()

    return searchableText.includes(search.toLowerCase())
  })

  const trainersWithEmail = trainers.filter((trainer) => trainer.email)
  const trainersWithPhone = trainers.filter((trainer) => trainer.phone)

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
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Trainers
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
            Trainer records
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage trainers, delivery staff and contact details.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total trainers"
          value={trainers.length}
          detail="All trainer records"
        />

        <StatCard
          label="With email"
          value={trainersWithEmail.length}
          detail="Email address saved"
        />

        <StatCard
          label="With phone"
          value={trainersWithPhone.length}
          detail="Phone number saved"
        />

        <StatCard
          label="Search results"
          value={filteredTrainers.length}
          detail="Matching current filter"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-4 ${panelClass} h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Add trainer
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Create a trainer profile for booking assignment.
            </p>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <input
              className={inputClass}
              placeholder="Trainer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <textarea
              className={`${inputClass} min-h-24`}
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button
              className={buttonPrimary}
              onClick={addTrainer}
            >
              Add trainer
            </button>
          </div>
        </div>

        <div className="xl:col-span-8 grid gap-4">
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Search trainers
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Find trainers by name, email, phone or notes.
              </p>
            </div>

            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Search trainers..."
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
                Showing {filteredTrainers.length} of {trainers.length} trainers
              </p>
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Trainer list
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Edit trainer contact details or remove unused records.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredTrainers.map((trainer) => {
                const isEditing = editingId === trainer.id

                return (
                  <div
                    key={trainer.id}
                    className="p-4"
                  >
                    {!isEditing ? (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-950">
                                {trainer.name}
                              </h3>

                              <span className="border border-emerald-100 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                Active
                              </span>

                              {trainer.email ? (
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
                              {trainer.email || 'No email set'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs text-slate-600">
                          <div>
                            <p className="text-slate-400">Phone</p>
                            <p className="font-medium text-slate-800 mt-1">
                              {trainer.phone || 'Not set'}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">Notes</p>
                            <p className="font-medium text-slate-800 mt-1">
                              {trainer.notes || 'No notes'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            className={buttonSecondary}
                            onClick={() => startEditing(trainer)}
                          >
                            Edit
                          </button>

                          <button
                            className={buttonDanger}
                            onClick={() => deleteTrainer(trainer.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-slate-950">
                            Edit trainer
                          </h3>

                          <p className="text-xs text-slate-500 mt-1">
                            Update trainer contact details and notes.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            className={inputClass}
                            placeholder="Trainer name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
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
                            className={`${inputClass} md:col-span-2 min-h-24`}
                            placeholder="Notes"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            className={buttonPrimary}
                            onClick={() => saveTrainerEdit(trainer.id)}
                            disabled={savingEdit}
                          >
                            {savingEdit ? 'Saving...' : 'Save changes'}
                          </button>

                          <button
                            className={buttonSecondary}
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

              {filteredTrainers.length === 0 && (
                <div className="p-6 text-sm text-slate-500">
                  No trainers found. Add your first trainer.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}