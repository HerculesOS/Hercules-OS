'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function SettingsPage() {
  const [organisationId, setOrganisationId] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [invoicePaymentDetails, setInvoicePaymentDetails] = useState('')

  const [saving, setSaving] = useState(false)

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
      return
    }

    setName(data.name || '')
    setEmail(data.email || '')
    setPhone(data.phone || '')
    setAddress(data.address || '')
    setWebsite(data.website || '')
    setInvoicePaymentDetails(data.invoice_payment_details || '')
  }

  useEffect(() => {
    load()
  }, [])

  const saveSettings = async () => {
    if (!name) {
      alert('Business name is required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('organisations')
      .update({
        name,
        email,
        phone,
        address,
        website,
        invoice_payment_details: invoicePaymentDetails,
      })
      .eq('id', organisationId)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('Settings saved')
    load()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Business Settings
        </h1>

        <p className="text-gray-500 mt-1">
          Manage your company details, invoice information and branding foundation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">
            Company Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="border p-3 rounded-lg"
              placeholder="Business name"
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

            <input
              className="border p-3 rounded-lg"
              placeholder="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <textarea
            className="border p-3 rounded-lg w-full mt-4 min-h-28"
            placeholder="Business address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <textarea
            className="border p-3 rounded-lg w-full mt-4 min-h-32"
            placeholder="Invoice payment details, e.g. bank details, payment terms, reference instructions"
            value={invoicePaymentDetails}
            onChange={(e) => setInvoicePaymentDetails(e.target.value)}
          />

          <button
            className="bg-black text-white px-5 py-3 rounded-lg mt-5 disabled:bg-gray-400"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Preview
          </h2>

          <div className="mt-5 border rounded-2xl p-5 bg-gray-50">
            <h3 className="text-2xl font-bold">
              {name || 'Your Business Name'}
            </h3>

            <div className="text-sm text-gray-600 mt-4 space-y-2">
              <p>{email || 'business@email.com'}</p>
              <p>{phone || 'Phone number'}</p>
              <p>{website || 'Website'}</p>
              <p>{address || 'Business address'}</p>
            </div>
          </div>

          <div className="mt-5 bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
            These details will be used later on invoices, certificates and customer emails.
          </div>
        </div>
      </div>
    </div>
  )
}