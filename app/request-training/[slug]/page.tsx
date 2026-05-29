'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { parseOptionalPositiveInteger } from '@/lib/numberValidation'

export default function PublicTrainingRequestPage() {
  const params = useParams()

  const [organisation, setOrganisation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [requestType, setRequestType] = useState('private')
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [courseName, setCourseName] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [learnerCount, setLearnerCount] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const slug = params.slug as string

  const inputClass =
    'w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const labelClass =
    'text-xs font-medium text-slate-600'

  const buttonPrimary =
    'rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:bg-slate-400'

  const loadOrganisation = async () => {
    const { data, error } = await supabase.rpc(
      'get_public_organisation_by_slug',
      {
        p_slug: slug,
      }
    )

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    if (data && data.length > 0) {
      setOrganisation(data[0])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadOrganisation()
  }, [])

  const getInitials = (name: string) => {
    if (!name) return 'H'

    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }

  const submitRequest = async () => {
    if (!organisation) return

    if (!companyName || !contactName || !email || !courseName) {
      alert('Company, contact name, email and course are required')
      return
    }

    if (!email.includes('@')) {
      alert('Please enter a valid email address')
      return
    }

    const parsedLearnerCount = parseOptionalPositiveInteger(
      learnerCount,
      'Number of learners'
    )

    if (parsedLearnerCount.error) {
      alert(parsedLearnerCount.error)
      return
    }

    setSubmitting(true)

    const requestTypeLabel =
      requestType === 'public'
        ? 'Public/open course enquiry'
        : 'Private/in-house course enquiry'

    const finalNotes = [
      `Request type: ${requestTypeLabel}`,
      notes ? `Notes: ${notes}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const { error } = await supabase.from('training_requests').insert({
      organisation_id: organisation.id,
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      course_name: courseName,
      preferred_date: preferredDate || null,
      learner_count: parsedLearnerCount.value,
      location,
      notes: finalNotes,
      status: 'new',
    })

    setSubmitting(false)

    if (error) {
      alert(error.message)
      return
    }

    setSubmitted(true)

    setRequestType('private')
    setCompanyName('')
    setContactName('')
    setEmail('')
    setPhone('')
    setCourseName('')
    setPreferredDate('')
    setLearnerCount('')
    setLocation('')
    setNotes('')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm text-sm text-slate-600">
          Loading request form...
        </div>
      </div>
    )
  }

  if (!organisation) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm max-w-md text-center">
          <div className="w-12 h-12 rounded-md bg-slate-950 text-white flex items-center justify-center mx-auto text-lg font-semibold">
            !
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-5">
            Request form not found
          </h1>

          <p className="text-sm text-slate-500 mt-3 leading-6">
            This training request link does not exist or is no longer available.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-8 shadow-sm max-w-lg text-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-5 text-2xl font-semibold">
            ✓
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Enquiry submitted
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 mt-2">
            Request sent
          </h1>

          <p className="text-sm text-slate-500 mt-3 leading-6">
            Your training enquiry has been sent to {organisation.name}. They will contact you soon.
          </p>

          <button
            className={buttonPrimary}
            onClick={() => setSubmitted(false)}
          >
            Submit another request
          </button>

          <p className="text-xs text-slate-400 mt-5">
            Powered by Hercules OS
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-950 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white text-slate-950 rounded-md flex items-center justify-center font-semibold">
                {getInitials(organisation.name)}
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Training enquiry
                </p>

                <h1 className="text-xl font-semibold tracking-tight">
                  {organisation.name}
                </h1>
              </div>
            </div>

            {(organisation.email || organisation.phone) && (
              <div className="text-xs text-slate-300 md:text-right">
                {organisation.email && <p>{organisation.email}</p>}
                {organisation.phone && <p className="mt-1">{organisation.phone}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden lg:sticky lg:top-6">
              <div className="bg-slate-950 text-white p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Request training
                </p>

                <h2 className="text-3xl font-semibold tracking-tight mt-2">
                  Tell us what you need.
                </h2>

                <p className="text-sm text-slate-300 mt-4 leading-6">
                  Complete this short form and your enquiry will be sent directly to {organisation.name}.
                </p>
              </div>

              <div className="p-6 grid gap-4">
                <div className="border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    What happens next?
                  </p>

                  <div className="grid gap-3 mt-4 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-950">1.</span> Your enquiry is reviewed.
                    </p>

                    <p>
                      <span className="font-semibold text-slate-950">2.</span> The provider contacts you to confirm details.
                    </p>

                    <p>
                      <span className="font-semibold text-slate-950">3.</span> Your training can be booked in.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-500 leading-5">
                  Use this form for private workplace training, school training, group bookings, or enquiries about public/open courses.
                </div>

                <p className="text-xs text-slate-400">
                  Powered by Hercules OS
                </p>
              </div>
            </div>
          </aside>

          <section className="lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="px-5 py-5 border-b border-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Enquiry form
                </p>

                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
                  Training request details
                </h2>

                <p className="text-sm text-slate-500 mt-2">
                  Fields marked with * are required.
                </p>
              </div>

              <div className="p-5 grid gap-6">
                <div>
                  <p className={labelClass}>
                    Type of enquiry
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      className={`border rounded-lg p-4 text-left transition ${
                        requestType === 'private'
                          ? 'border-slate-950 bg-slate-950 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => setRequestType('private')}
                    >
                      <p className="text-sm font-semibold">
                        Private / in-house course
                      </p>

                      <p className={`text-xs mt-1 leading-5 ${
                        requestType === 'private' ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        Training for your organisation, team, workplace, school or group.
                      </p>
                    </button>

                    <button
                      type="button"
                      className={`border rounded-lg p-4 text-left transition ${
                        requestType === 'public'
                          ? 'border-slate-950 bg-slate-950 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => setRequestType('public')}
                    >
                      <p className="text-sm font-semibold">
                        Public / open course
                      </p>

                      <p className={`text-xs mt-1 leading-5 ${
                        requestType === 'public' ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        A place or enquiry for an open course with mixed attendees.
                      </p>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Company / organisation name *
                    </label>

                    <input
                      className={`${inputClass} mt-1`}
                      placeholder="Example Primary School"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Contact name *
                    </label>

                    <input
                      className={`${inputClass} mt-1`}
                      placeholder="Sarah James"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Email *
                    </label>

                    <input
                      className={`${inputClass} mt-1`}
                      type="email"
                      placeholder="sarah@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Phone
                    </label>

                    <input
                      className={`${inputClass} mt-1`}
                      placeholder="01234 567890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Course required *
                    </label>

                    <input
                      className={`${inputClass} mt-1`}
                      placeholder="Emergency First Aid at Work"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Preferred date
                    </label>

                    <input
                      className={`${inputClass} mt-1`}
                      type="date"
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Number of learners
                    </label>

                    <input
                      className={`${inputClass} mt-1`}
                      type="number"
                      min="1"
                      placeholder="12"
                      value={learnerCount}
                      onChange={(e) => setLearnerCount(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Training location
                    </label>

                    <input
                      className={`${inputClass} mt-1`}
                      placeholder="Oxford, Buckinghamshire, client site, online, etc."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={labelClass}>
                      Extra notes
                    </label>

                    <textarea
                      className={`${inputClass} mt-1 min-h-32`}
                      placeholder="Tell the provider anything useful, such as deadlines, previous training dates, parking info, accessibility needs, preferred times, or whether you need multiple dates."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Enquiry summary
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm text-slate-600">
                    <p>
                      <span className="text-slate-400">Type:</span>{' '}
                      <span className="font-medium text-slate-950">
                        {requestType === 'public' ? 'Public / open course' : 'Private / in-house course'}
                      </span>
                    </p>

                    <p>
                      <span className="text-slate-400">Learners:</span>{' '}
                      <span className="font-medium text-slate-950">
                        {learnerCount || 'Not set'}
                      </span>
                    </p>

                    <p className="md:col-span-2">
                      <span className="text-slate-400">Course:</span>{' '}
                      <span className="font-medium text-slate-950">
                        {courseName || 'Not set'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-t border-slate-200 pt-5">
                  <p className="text-xs text-slate-500 leading-5">
                    By submitting this form, your enquiry will be sent to {organisation.name}.
                  </p>

                  <button
                    className={buttonPrimary}
                    onClick={submitRequest}
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit training request'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
