'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function SettingsPage() {
  const [organisation, setOrganisation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [publicRequestSlug, setPublicRequestSlug] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()

    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', profile.organisation_id)
      .single()

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setOrganisation(data)
    setName(data?.name || '')
    setEmail(data?.email || '')
    setPhone(data?.phone || '')
    setPublicRequestSlug(data?.public_request_slug || '')

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const saveSettings = async () => {
    if (!organisation) return

    if (!name) {
      alert('Business name is required')
      return
    }

    setSaving(true)

    const cleanSlug = publicRequestSlug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    const { error } = await supabase
      .from('organisations')
      .update({
        name,
        email,
        phone,
        public_request_slug: cleanSlug || null,
      })
      .eq('id', organisation.id)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Settings saved')
    load()
  }

  const publicRequestUrl = publicRequestSlug
    ? `${window.location.origin}/request-training/${publicRequestSlug}`
    : ''

  const examplePublicRequestUrl = `${window.location.origin}/request-training/your-business-name`

  const copyPublicLink = async () => {
    if (!publicRequestUrl) {
      alert('Add and save a public enquiry link name first')
      return
    }

    await navigator.clipboard.writeText(publicRequestUrl)
    alert('Public enquiry link copied')
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading settings...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Settings
        </h1>

        <p className="text-gray-500 mt-1">
          Manage your business details, public enquiry link and automated templates
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">
            Business Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-500">
                Business name
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1"
                placeholder="Business name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">
                Business email
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1"
                placeholder="Business email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-500">
                Business phone
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1"
                placeholder="Business phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-500">
                Public enquiry link name
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1"
                placeholder="your-business-name"
                value={publicRequestSlug}
                onChange={(e) => setPublicRequestSlug(e.target.value)}
              />

              <p className="text-sm text-gray-500 mt-2">
                Choose a short version of your business name. This creates a public link you can send to customers so they can request training.
              </p>

              {!publicRequestSlug && (
                <div className="bg-gray-50 border rounded-xl p-4 mt-3 text-sm text-gray-600">
                  Example: if you enter <span className="font-semibold">whiteleaftraining</span>, your enquiry form link will become:
                  <p className="font-medium break-all mt-2">
                    {window.location.origin}/request-training/whiteleaftraining
                  </p>
                </div>
              )}
            </div>

            {publicRequestSlug ? (
              <div className="md:col-span-2 bg-gray-50 border rounded-xl p-4">
                <p className="text-sm text-gray-500">
                  Your public enquiry form
                </p>

                <p className="font-medium break-all mt-1">
                  {publicRequestUrl}
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Send this link to customers when you want them to request training online.
                </p>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    className="border px-4 py-2 rounded-lg bg-white"
                    onClick={copyPublicLink}
                  >
                    Copy Link
                  </button>

                  <Link
                    href={`/request-training/${publicRequestSlug}`}
                    className="bg-black text-white px-4 py-2 rounded-lg"
                    target="_blank"
                  >
                    Open Form
                  </Link>
                </div>
              </div>
            ) : (
              <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800">
                Add a public enquiry link name before sharing your request form with customers.
              </div>
            )}

            <div className="md:col-span-2">
              <button
                className="bg-black text-white px-4 py-3 rounded-lg disabled:bg-gray-400"
                onClick={saveSettings}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <Link
            href="/dashboard/settings/email-templates"
            className="bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition block"
          >
            <h2 className="text-2xl font-semibold">
              Email Templates
            </h2>

            <p className="text-gray-500 mt-2">
              Edit automated emails for booking confirmations, reminders, certificates, invoices and expiry reminders.
            </p>

            <p className="text-sm text-gray-400 mt-5">
              Open email templates →
            </p>
          </Link>

          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
              Certificate Templates
            </h2>

            <p className="text-gray-500 mt-2">
              Coming soon: customise certificate wording, layout and course-specific certificate templates.
            </p>

            <p className="text-sm text-gray-400 mt-5">
              Added to build list
            </p>
          </div>

          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="text-2xl font-semibold">
              Public Enquiry Form
            </h2>

            <p className="text-gray-500 mt-2">
              This is the form customers use to request training. Submitted enquiries appear in your Requests page.
            </p>

            {publicRequestSlug ? (
              <Link
                href={`/request-training/${publicRequestSlug}`}
                target="_blank"
                className="inline-block mt-5 border px-4 py-2 rounded-lg"
              >
                View enquiry form
              </Link>
            ) : (
              <p className="text-sm text-gray-400 mt-5">
                Add a public enquiry link name first
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}