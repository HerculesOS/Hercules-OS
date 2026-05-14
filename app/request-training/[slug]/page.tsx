'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function PublicTrainingRequestPage() {
  const params = useParams()

  const [organisation, setOrganisation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

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

  const submitRequest = async () => {
    if (!organisation) return

    if (!companyName || !contactName || !email || !courseName) {
      alert('Company, contact name, email and course are required')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('training_requests').insert({
      organisation_id: organisation.id,
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      course_name: courseName,
      preferred_date: preferredDate || null,
      learner_count: learnerCount ? Number(learnerCount) : null,
      location,
      notes,
      status: 'new',
    })

    setSubmitting(false)

    if (error) {
      alert(error.message)
      return
    }

    setSubmitted(true)

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          Loading request form...
        </div>
      </div>
    )
  }

  if (!organisation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white border rounded-2xl p-8 shadow-sm max-w-md text-center">
          <h1 className="text-2xl font-bold">
            Request form not found
          </h1>

          <p className="text-gray-500 mt-3">
            This training request link does not exist or is no longer available.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white border rounded-3xl p-8 shadow-sm max-w-lg text-center">
          <div className="w-14 h-14 bg-green-100 text-green-700 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl">
            ✓
          </div>

          <h1 className="text-3xl font-bold">
            Request sent
          </h1>

          <p className="text-gray-500 mt-3">
            Your training enquiry has been sent to {organisation.name}. They will contact you soon.
          </p>

          <button
            className="bg-black text-white px-5 py-3 rounded-xl mt-6"
            onClick={() => setSubmitted(false)}
          >
            Submit another request
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-5xl mx-auto p-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-black text-white rounded-3xl p-8 shadow-sm sticky top-6">
              <div className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center font-bold text-xl mb-6">
                H
              </div>

              <h1 className="text-3xl font-bold">
                Request training
              </h1>

              <p className="text-gray-300 mt-4">
                Complete this form to send a training enquiry directly to:
              </p>

              <h2 className="text-xl font-semibold mt-4">
                {organisation.name}
              </h2>

              <div className="border-t border-white/20 mt-8 pt-6 text-sm text-gray-300">
                <p>
                  Your enquiry will be reviewed by the training provider.
                </p>

                <p className="mt-3">
                  This form is powered by Hercules OS.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white border rounded-3xl p-8 shadow-sm">
              <div className="mb-8">
                <h2 className="text-3xl font-bold">
                  Training enquiry form
                </h2>

                <p className="text-gray-500 mt-2">
                  Tell us what training you need and the provider will get back to you.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">
                    Company / organisation name *
                  </label>

                  <input
                    className="border p-3 rounded-xl w-full mt-1"
                    placeholder="Example Primary School"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">
                    Contact name *
                  </label>

                  <input
                    className="border p-3 rounded-xl w-full mt-1"
                    placeholder="Sarah James"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">
                    Email *
                  </label>

                  <input
                    className="border p-3 rounded-xl w-full mt-1"
                    type="email"
                    placeholder="sarah@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">
                    Phone
                  </label>

                  <input
                    className="border p-3 rounded-xl w-full mt-1"
                    placeholder="01234 567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">
                    Course required *
                  </label>

                  <input
                    className="border p-3 rounded-xl w-full mt-1"
                    placeholder="Emergency First Aid at Work"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">
                    Preferred date
                  </label>

                  <input
                    className="border p-3 rounded-xl w-full mt-1"
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600">
                    Number of learners
                  </label>

                  <input
                    className="border p-3 rounded-xl w-full mt-1"
                    type="number"
                    min="1"
                    placeholder="12"
                    value={learnerCount}
                    onChange={(e) => setLearnerCount(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">
                    Training location
                  </label>

                  <input
                    className="border p-3 rounded-xl w-full mt-1"
                    placeholder="Oxford, Buckinghamshire, client site, etc."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-gray-600">
                    Extra notes
                  </label>

                  <textarea
                    className="border p-3 rounded-xl w-full mt-1 min-h-32"
                    placeholder="Tell the provider anything useful, such as deadlines, previous training dates, parking info, accessibility needs, or preferred times."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <button
                className="bg-black text-white px-6 py-3 rounded-xl mt-6 disabled:bg-gray-400"
                onClick={submitRequest}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Training Request'}
              </button>

              <p className="text-xs text-gray-400 mt-4">
                By submitting this form, your enquiry will be sent to {organisation.name}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}