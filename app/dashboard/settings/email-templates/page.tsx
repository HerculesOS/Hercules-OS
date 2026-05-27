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
    '{{client_name}}',
    '{{delegate_name}}',
    '{{course_name}}',
    '{{booking_date}}',
    '{{start_time}}',
    '{{end_time}}',
    '{{location}}',
    '{{trainer_name}}',
    '{{certificate_number}}',
    '{{issue_date}}',
    '{{expiry_date}}',
    '{{verification_url}}',
    '{{invoice_number}}',
    '{{invoice_amount}}',
    '{{due_date}}',
    '{{business_name}}',
  ]

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading email templates...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard/settings"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to settings
        </Link>

        <h1 className="text-4xl font-bold mt-4">
          Email Templates
        </h1>

        <p className="text-gray-500 mt-1">
          Customise automated emails sent by Hercules OS
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Available Placeholders
        </h2>

        <p className="text-gray-500 mb-4">
          Use these placeholders inside subjects or email bodies. They will be replaced automatically when emails are sent.
        </p>

        <div className="flex flex-wrap gap-2">
          {placeholders.map((placeholder) => (
            <span
              key={placeholder}
              className="bg-gray-100 border px-3 py-1 rounded-full text-sm"
            >
              {placeholder}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5">
        {templates.map((template) => {
          const isEditing = editingId === template.id

          return (
            <div
              key={template.id}
              className="bg-white border rounded-2xl p-6 shadow-sm"
            >
              {!isEditing ? (
                <>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-semibold">
                        {template.name}
                      </h2>

                      <p className="text-gray-500 mt-1">
                        Template key: {template.template_key}
                      </p>
                    </div>

                    <button
                      className="bg-black text-white px-4 py-2 rounded-lg"
                      onClick={() => startEditing(template)}
                    >
                      Edit Template
                    </button>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm text-gray-500">
                      Subject
                    </p>

                    <div className="bg-gray-50 border rounded-xl p-4 mt-2">
                      {template.subject}
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="text-sm text-gray-500">
                      Body
                    </p>

                    <div className="bg-gray-50 border rounded-xl p-4 mt-2 whitespace-pre-line">
                      {template.body}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-5">
                    <h2 className="text-2xl font-semibold">
                      Edit {template.name}
                    </h2>

                    <p className="text-gray-500 mt-1">
                      Use placeholders like {'{{client_name}}'} or {'{{course_name}}'}.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-sm text-gray-500">
                        Subject
                      </label>

                      <input
                        className="border p-3 rounded-lg w-full mt-1"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-gray-500">
                        Body
                      </label>

                      <textarea
                        className="border p-3 rounded-lg w-full mt-1 min-h-72"
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                        onClick={() => saveTemplate(template.id)}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>

                      <button
                        className="border px-4 py-2 rounded-lg"
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
          <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
            No email templates found.
          </div>
        )}
      </div>
    </div>
  )
}