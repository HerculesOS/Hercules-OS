'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState('')
  const [saving, setSaving] = useState(false)

  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')

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
      .from('email_templates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('name', { ascending: true })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setTemplates(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const startEditing = (template: any) => {
    setEditingId(template.id)
    setEditSubject(template.subject || '')
    setEditBody(template.body || '')
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditSubject('')
    setEditBody('')
  }

  const saveTemplate = async (templateId: string) => {
    if (!editSubject || !editBody) {
      alert('Subject and body are required')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('email_templates')
      .update({
        subject: editSubject,
        body: editBody,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    load()
  }

  const placeholders = [
    '{{clientName}}',
    '{{client_name}}',
    '{{learnerName}}',
    '{{delegate_name}}',
    '{{courseName}}',
    '{{course_name}}',
    '{{date}}',
    '{{booking_date}}',
    '{{startTime}}',
    '{{start_time}}',
    '{{endTime}}',
    '{{end_time}}',
    '{{location}}',
    '{{trainerName}}',
    '{{trainer_name}}',
    '{{certificateNumber}}',
    '{{certificate_number}}',
    '{{issueDate}}',
    '{{issue_date}}',
    '{{expiryDate}}',
    '{{expiry_date}}',
    '{{verificationUrl}}',
    '{{verification_url}}',
    '{{invoiceNumber}}',
    '{{invoice_number}}',
    '{{invoiceAmount}}',
    '{{invoice_amount}}',
    '{{dueDate}}',
    '{{due_date}}',
    '{{businessName}}',
    '{{business_name}}',
    '{{businessEmail}}',
    '{{businessPhone}}',
    '{{paymentDetails}}',
  ]

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading email templates...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="text-sm text-slate-500 hover:text-slate-950"
        >
          ← Back to settings
        </Link>

        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Settings
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
            Email templates
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Customise automated emails sent by Hercules OS.
          </p>
        </div>
      </div>

      <div className={`${panelClass} mb-4`}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Available placeholders
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Use these placeholders inside subjects or email bodies. They will be replaced automatically when emails are sent.
          </p>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {placeholders.map((placeholder) => (
              <span
                key={placeholder}
                className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700"
              >
                {placeholder}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Template list
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Edit subjects and body text for automated emails.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {templates.map((template) => {
            const isEditing = editingId === template.id

            return (
              <div
                key={template.id}
                className="p-4"
              >
                {!isEditing ? (
                  <>
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-slate-950">
                            {template.name}
                          </h3>

                          <span className="border border-slate-200 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                            {template.template_key}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                          Automated email template
                        </p>
                      </div>

                      <button
                        className={buttonPrimary}
                        onClick={() => startEditing(template)}
                      >
                        Edit template
                      </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mt-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Subject
                        </p>

                        <p className="text-sm text-slate-950 mt-2">
                          {template.subject}
                        </p>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                          Body
                        </p>

                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-line leading-6">
                          {template.body}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-950">
                        Edit {template.name}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        Use placeholders like {'{{client_name}}'} or {'{{course_name}}'}.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs text-slate-500">
                          Subject
                        </label>

                        <input
                          className={`${inputClass} w-full mt-1`}
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-500">
                          Body
                        </label>

                        <textarea
                          className={`${inputClass} w-full mt-1 min-h-72`}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className={buttonPrimary}
                          onClick={() => saveTemplate(template.id)}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save changes'}
                        </button>

                        <button
                          className={buttonSecondary}
                          onClick={cancelEditing}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {templates.length === 0 && (
            <div className="p-6 text-sm text-slate-500">
              No email templates found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
