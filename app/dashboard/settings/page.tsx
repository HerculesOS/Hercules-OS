'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function SettingsPage() {
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [invoicePaymentDetails, setInvoicePaymentDetails] = useState('')
  const [publicSlug, setPublicSlug] = useState('')

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

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

    setName(data?.name || '')
    setEmail(data?.email || '')
    setPhone(data?.phone || '')
    setWebsite(data?.website || '')
    setAddress(data?.address || '')
    setInvoicePaymentDetails(data?.invoice_payment_details || '')
    setPublicSlug(data?.public_slug || '')

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const formatSlug = (value: string) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const saveSettings = async () => {
    if (!name) {
      alert('Business name is required')
      return
    }

    const cleanSlug = formatSlug(publicSlug)

    if (!cleanSlug) {
      alert('Public request link is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('organisations')
      .update({
        name,
        email,
        phone,
        website,
        address,
        invoice_payment_details: invoicePaymentDetails,
        public_slug: cleanSlug,
      })
      .eq('id', organisationId)

    setSaving(false)

    if (error) {
      if (error.message.includes('duplicate')) {
        alert('That public request link is already taken. Try another one.')
        return
      }

      alert(error.message)
      return
    }

    setPublicSlug(cleanSlug)
    alert('Settings saved')
  }

  const publicRequestUrl = publicSlug
    ? `${window.location.origin}/request-training/${publicSlug}`
    : ''

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
          Manage your business details, invoice information and public request link
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">
            Business Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">
                Business name
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1"
                placeholder="Whiteleaf Training"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                Email
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1"
                placeholder="info@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-600">
                Phone
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1"
                placeholder="01234 567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">
                Website
              </label>

              <input
                className="border p-3 rounded-lg w-full mt-1"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm text-gray-600">
                Address
              </label>

              <textarea
                className="border p-3 rounded-lg w-full mt-1"
                placeholder="Business address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">
            Public Request Link
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            This is the link clients use to submit training enquiries to your business.
          </p>

          <label className="text-sm text-gray-600">
            Public slug
          </label>

          <input
            className="border p-3 rounded-lg w-full mt-1"
            placeholder="whiteleaf-training"
            value={publicSlug}
            onChange={(e) => setPublicSlug(formatSlug(e.target.value))}
          />

          <div className="bg-gray-50 border rounded-xl p-4 mt-4 text-sm text-gray-600 break-all">
            {publicSlug ? (
              <>
                <p className="font-medium text-gray-800 mb-1">
                  Your public enquiry link:
                </p>

                <p>
                  {publicRequestUrl}
                </p>
              </>
            ) : (
              <p>
                Choose a slug to create your public enquiry link.
              </p>
            )}
          </div>
        </div>

        <div className="xl:col-span-3 bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">
            Invoice Payment Details
          </h2>

          <p className="text-sm text-gray-500 mb-3">
            These details appear on invoice PDFs and invoice emails.
          </p>

          <textarea
            className="border p-3 rounded-lg w-full min-h-32"
            placeholder={`Bank: Example Bank
Account Name: Your Business
Sort Code: 00-00-00
Account Number: 00000000`}
            value={invoicePaymentDetails}
            onChange={(e) => setInvoicePaymentDetails(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8">
        <button
          className="bg-black text-white px-6 py-3 rounded-lg disabled:bg-gray-400"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}