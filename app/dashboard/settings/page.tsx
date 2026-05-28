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

  const [timezone, setTimezone] = useState('Europe/London')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [timeFormat, setTimeFormat] = useState('24h')

  const [autoExpireCertificates, setAutoExpireCertificates] = useState(true)
  const [sendCertificateExpiryReminders, setSendCertificateExpiryReminders] = useState(true)
  const [certificateExpiryReminderDays, setCertificateExpiryReminderDays] = useState('60')

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const panelClass =
    'bg-white border border-slate-200 rounded-lg'

  const panelHeaderClass =
    'px-4 py-3 border-b border-slate-200'

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

    setTimezone(data?.timezone || 'Europe/London')
    setDateFormat(data?.date_format || 'DD/MM/YYYY')
    setTimeFormat(data?.time_format || '24h')

    setAutoExpireCertificates(data?.auto_expire_certificates !== false)
    setSendCertificateExpiryReminders(data?.send_certificate_expiry_reminders !== false)
    setCertificateExpiryReminderDays(String(data?.certificate_expiry_reminder_days || 60))

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

    const reminderDays = Number(certificateExpiryReminderDays)

    if (Number.isNaN(reminderDays) || reminderDays < 1 || reminderDays > 365) {
      alert('Certificate reminder days must be between 1 and 365')
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
        timezone,
        date_format: dateFormat,
        time_format: timeFormat,
        auto_expire_certificates: autoExpireCertificates,
        send_certificate_expiry_reminders: sendCertificateExpiryReminders,
        certificate_expiry_reminder_days: reminderDays,
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
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading settings...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Settings
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
            Business settings
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Manage business details, public enquiry links, date/time preferences, certificate automation and templates.
          </p>
        </div>

        <button
          className={buttonPrimary}
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-8 grid gap-4">
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Business details
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                These details are used across emails, invoices, certificates and public forms.
              </p>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500">
                    Business name
                  </label>

                  <input
                    className={`${inputClass} w-full mt-1`}
                    placeholder="Business name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500">
                    Business email
                  </label>

                  <input
                    className={`${inputClass} w-full mt-1`}
                    placeholder="Business email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500">
                    Business phone
                  </label>

                  <input
                    className={`${inputClass} w-full mt-1`}
                    placeholder="Business phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Date, time and timezone
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Choose how dates and times should appear across Hercules OS.
              </p>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">
                    Timezone
                  </label>

                  <select
                    className={`${inputClass} w-full mt-1`}
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="Europe/London">Europe/London</option>
                    <option value="Europe/Dublin">Europe/Dublin</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="Europe/Berlin">Europe/Berlin</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Chicago">America/Chicago</option>
                    <option value="America/Denver">America/Denver</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Australia/Sydney">Australia/Sydney</option>
                    <option value="Australia/Melbourne">Australia/Melbourne</option>
                    <option value="Asia/Dubai">Asia/Dubai</option>
                    <option value="Asia/Singapore">Asia/Singapore</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500">
                    Date format
                  </label>

                  <select
                    className={`${inputClass} w-full mt-1`}
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD MMM YYYY">DD MMM YYYY</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500">
                    Time format
                  </label>

                  <select
                    className={`${inputClass} w-full mt-1`}
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value)}
                  >
                    <option value="24h">24-hour</option>
                    <option value="12h">12-hour AM/PM</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Current display preference
                </p>

                <p className="text-sm text-slate-700 mt-2">
                  Timezone: <span className="font-semibold text-slate-950">{timezone}</span>
                </p>

                <p className="text-sm text-slate-700 mt-1">
                  Date format: <span className="font-semibold text-slate-950">{dateFormat}</span>
                </p>

                <p className="text-sm text-slate-700 mt-1">
                  Time format: <span className="font-semibold text-slate-950">{timeFormat === '24h' ? '24-hour' : '12-hour AM/PM'}</span>
                </p>

                <p className="text-xs text-slate-500 mt-3">
                  Next we’ll apply these preferences across bookings, calendars, invoices, certificates and emails.
                </p>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Public enquiry link
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Create a simple link customers can use to request training online.
              </p>
            </div>

            <div className="p-4">
              <label className="text-xs text-slate-500">
                Public enquiry link name
              </label>

              <input
                className={`${inputClass} w-full mt-1`}
                placeholder="your-business-name"
                value={publicRequestSlug}
                onChange={(e) => setPublicRequestSlug(e.target.value)}
              />

              <p className="text-xs text-slate-500 mt-2">
                Use a short, simple version of your business name. Spaces and symbols will be cleaned when saved.
              </p>

              {!publicRequestSlug && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                  <p className="text-xs text-slate-600">
                    Example: if you enter <span className="font-semibold text-slate-950">whiteleaftraining</span>, your enquiry form link will become:
                  </p>

                  <p className="text-xs font-medium text-slate-950 break-all mt-2">
                    {window.location.origin}/request-training/whiteleaftraining
                  </p>
                </div>
              )}

              {publicRequestSlug ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Your public enquiry form
                  </p>

                  <p className="text-sm font-medium text-slate-950 break-all mt-2">
                    {publicRequestUrl}
                  </p>

                  <p className="text-xs text-slate-500 mt-2">
                    Send this link to customers when you want them to request training online.
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      className={buttonSecondary}
                      onClick={copyPublicLink}
                    >
                      Copy link
                    </button>

                    <Link
                      href={`/request-training/${publicRequestSlug}`}
                      className={buttonPrimary}
                      target="_blank"
                    >
                      Open form
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4 text-sm text-amber-800">
                  Add a public enquiry link name before sharing your request form with customers.
                </div>
              )}
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Certificate automation
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Control how Hercules OS handles expired certificates and upcoming expiry reminders.
              </p>
            </div>

            <div className="p-4 grid gap-3">
              <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={autoExpireCertificates}
                  onChange={(e) => setAutoExpireCertificates(e.target.checked)}
                />

                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Automatically mark expired certificates
                  </p>

                  <p className="text-xs text-slate-500 mt-1 leading-5">
                    When a certificate expiry date has passed, Hercules OS will automatically change its status to expired during the daily expiry check.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={sendCertificateExpiryReminders}
                  onChange={(e) => setSendCertificateExpiryReminders(e.target.checked)}
                />

                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Send automatic expiry reminder emails
                  </p>

                  <p className="text-xs text-slate-500 mt-1 leading-5">
                    Hercules OS will email delegates before their certificate expires, as long as the delegate has an email address.
                  </p>
                </div>
              </label>

              <div>
                <label className="text-xs text-slate-500">
                  Send expiry reminder this many days before expiry
                </label>

                <input
                  className={`${inputClass} w-full mt-1`}
                  type="number"
                  min="1"
                  max="365"
                  value={certificateExpiryReminderDays}
                  onChange={(e) => setCertificateExpiryReminderDays(e.target.value)}
                />

                <p className="text-xs text-slate-500 mt-2">
                  Example: 60 means the reminder email will be sent when the certificate is within 60 days of expiring. Each certificate only gets one automatic reminder.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-xs leading-5">
                Automatic checks run daily. The reminder email wording can be edited under Email Templates.
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className={buttonPrimary}
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 grid gap-4 h-fit">
          <Link
            href="/dashboard/settings/email-templates"
            className={`${panelClass} block hover:border-slate-300 transition`}
          >
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Email templates
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Automated email wording
              </p>
            </div>

            <div className="p-4">
              <p className="text-sm text-slate-600 leading-6">
                Edit booking confirmations, reminders, certificates, invoices and expiry reminder emails.
              </p>

              <p className="text-xs font-medium text-slate-500 mt-4">
                Open email templates →
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard/settings/certificate-templates"
            className={`${panelClass} block hover:border-slate-300 transition`}
          >
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Certificate templates
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Certificate wording and validity
              </p>
            </div>

            <div className="p-4">
              <p className="text-sm text-slate-600 leading-6">
                Customise certificate wording, signatures, validity periods and course-specific certificate templates.
              </p>

              <p className="text-xs font-medium text-slate-500 mt-4">
                Open certificate templates →
              </p>
            </div>
          </Link>

          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Public enquiry form
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Customer-facing request form
              </p>
            </div>

            <div className="p-4">
              <p className="text-sm text-slate-600 leading-6">
                This is the form customers use to request training. Submitted enquiries appear in your Requests page.
              </p>

              {publicRequestSlug ? (
                <Link
                  href={`/request-training/${publicRequestSlug}`}
                  target="_blank"
                  className={`${buttonSecondary} inline-block mt-4`}
                >
                  View enquiry form
                </Link>
              ) : (
                <p className="text-xs text-slate-500 mt-4">
                  Add a public enquiry link name first.
                </p>
              )}
            </div>
          </div>

          <div className="bg-slate-950 text-white border border-slate-900 rounded-lg p-4">
            <p className="text-sm font-semibold">
              Settings checklist
            </p>

            <div className="grid gap-2 mt-3 text-xs text-slate-300">
              <p>
                {name ? '✓' : '•'} Business name saved
              </p>

              <p>
                {email ? '✓' : '•'} Business email saved
              </p>

              <p>
                {publicRequestSlug ? '✓' : '•'} Public enquiry link set
              </p>

              <p>
                {timezone ? '✓' : '•'} Timezone selected
              </p>

              <p>
                {dateFormat ? '✓' : '•'} Date format selected
              </p>

              <p>
                {timeFormat ? '✓' : '•'} Time format selected
              </p>

              <p>
                {autoExpireCertificates ? '✓' : '•'} Auto-expiry enabled
              </p>

              <p>
                {sendCertificateExpiryReminders ? '✓' : '•'} Expiry reminders enabled
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}