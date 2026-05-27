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

  const getStatusStyle = (status: string) => {
    if (status === 'converted') {
      return 'bg-green-100 text-green-700'
    }

    if (status === 'contacted') {
      return 'bg-blue-100 text-blue-700'
    }

    if (status === 'closed') {
      return 'bg-gray-200 text-gray-700'
    }

    return 'bg-yellow-100 text-yellow-700'
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading training requests...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Training Requests
        </h1>

        <p className="text-gray-500 mt-1">
          Review enquiries submitted through your public training request link
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Total Requests</p>
          <h2 className="text-3xl font-bold mt-2">{requests.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">New</p>
          <h2 className="text-3xl font-bold mt-2">{newRequests.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Contacted</p>
          <h2 className="text-3xl font-bold mt-2">{contactedRequests.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Converted</p>
          <h2 className="text-3xl font-bold mt-2">{convertedRequests.length}</h2>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5 shadow-sm mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="border p-3 rounded-lg md:col-span-2"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="border p-3 rounded-lg"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="closed">Closed</option>
          </select>

          <button
            className="border px-4 py-2 rounded-lg"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Showing {filteredRequests.length} of {requests.length} requests
        </p>
      </div>

      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <div
            key={request.id}
            className="bg-white border rounded-2xl p-5 shadow-sm"
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {request.company_name || 'Unnamed company'}
                </h2>

                <p className="text-gray-500 mt-1">
                  {request.contact_name || 'No contact name'}
                </p>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-sm w-fit ${getStatusStyle(
                  request.status
                )}`}
              >
                {request.status || 'new'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-5 text-sm text-gray-700">
              <div>
                <p className="text-gray-500">Course</p>
                <p className="font-medium mt-1">
                  {request.course_name || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Preferred date</p>
                <p className="font-medium mt-1">
                  {request.preferred_date || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Learners</p>
                <p className="font-medium mt-1">
                  {request.learner_count || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Location</p>
                <p className="font-medium mt-1">
                  {request.location || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium mt-1 break-all">
                  {request.email || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Phone</p>
                <p className="font-medium mt-1">
                  {request.phone || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Submitted</p>
                <p className="font-medium mt-1">
                  {request.created_at
                    ? new Date(request.created_at).toLocaleDateString()
                    : 'Not set'}
                </p>
              </div>
            </div>

            {request.notes && (
              <div className="bg-gray-50 border rounded-xl p-4 mt-5 text-sm text-gray-700">
                <p className="text-gray-500 mb-1">Notes</p>
                <p>{request.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-5">
              {request.status !== 'converted' && (
                <button
                  className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                  onClick={() => convertRequest(request)}
                  disabled={convertingId === request.id}
                >
                  {convertingId === request.id
                    ? 'Converting...'
                    : 'Create Client & Booking'}
                </button>
              )}

              {request.status !== 'contacted' && (
                <button
                  className="border px-4 py-2 rounded-lg"
                  onClick={() => updateStatus(request.id, 'contacted')}
                >
                  Mark Contacted
                </button>
              )}

              {request.status !== 'converted' && (
                <button
                  className="border px-4 py-2 rounded-lg"
                  onClick={() => updateStatus(request.id, 'converted')}
                >
                  Mark Converted
                </button>
              )}

              {request.status !== 'closed' && (
                <button
                  className="border px-4 py-2 rounded-lg"
                  onClick={() => updateStatus(request.id, 'closed')}
                >
                  Close
                </button>
              )}

              {request.status !== 'new' && (
                <button
                  className="border px-4 py-2 rounded-lg"
                  onClick={() => updateStatus(request.id, 'new')}
                >
                  Mark New
                </button>
              )}

              {request.status === 'converted' && (
                <Link
                  href="/dashboard/bookings"
                  className="border px-4 py-2 rounded-lg"
                >
                  View Bookings
                </Link>
              )}

              <button
                className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
                onClick={() => deleteRequest(request.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
            No training requests found.
          </div>
        )}
      </div>
    </div>
  )
}