'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { defaultJoiningInstructionTemplate } from '@/lib/joiningInstructions'

const placeholders = [
  '{{delegate_name}}',
  '{{client_name}}',
  '{{course_name}}',
  '{{booking_date}}',
  '{{booking_start_time}}',
  '{{booking_end_time}}',
  '{{booking_location}}',
  '{{trainer_name}}',
  '{{organisation_name}}',
  '{{organisation_email}}',
  '{{organisation_phone}}',
]

export default function JoiningInstructionsSettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [name, setName] = useState('')
  const [subject, setSubject] = useState(defaultJoiningInstructionTemplate.subject)
  const [body, setBody] = useState(defaultJoiningInstructionTemplate.body)
  const [isDefault, setIsDefault] = useState(false)

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'
  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'
  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'
  const buttonDanger =
    'border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-50'
  const panelClass = 'bg-white border border-slate-200 rounded-lg'
  const panelHeaderClass = 'px-4 py-3 border-b border-slate-200'

  const load = async () => {
    const currentProfile = await getOrCreateAccount()
    setProfile(currentProfile)

    const { data, error } = await supabase
      .from('joining_instruction_templates')
      .select('*')
      .eq('organisation_id', currentProfile.organisation_id)
      .is('archived_at', null)
      .order('is_default', { ascending: false })
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

  const resetForm = () => {
    setEditingId('')
    setName('')
    setSubject(defaultJoiningInstructionTemplate.subject)
    setBody(defaultJoiningInstructionTemplate.body)
    setIsDefault(false)
  }

  const startEditing = (template: any) => {
    setEditingId(template.id)
    setName(template.name || '')
    setSubject(template.subject || defaultJoiningInstructionTemplate.subject)
    setBody(template.body || defaultJoiningInstructionTemplate.body)
    setIsDefault(Boolean(template.is_default))
  }

  const saveTemplate = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      alert('Name, subject and body are required')
      return
    }

    setSaving(true)

    if (isDefault) {
      await supabase
        .from('joining_instruction_templates')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('organisation_id', profile.organisation_id)
    }

    const payload = {
      organisation_id: profile.organisation_id,
      user_id: profile.id,
      name: name.trim(),
      subject: subject.trim(),
      body: body.trim(),
      is_default: isDefault,
      updated_at: new Date().toISOString(),
    }

    const result = editingId
      ? await supabase
          .from('joining_instruction_templates')
          .update(payload)
          .eq('id', editingId)
          .eq('organisation_id', profile.organisation_id)
      : await supabase.from('joining_instruction_templates').insert(payload)

    setSaving(false)

    if (result.error) {
      alert(result.error.message)
      return
    }

    resetForm()
    load()
  }

  const archiveTemplate = async (template: any) => {
    if (template.is_default) {
      alert('Choose another default before archiving this template.')
      return
    }

    const confirmed = confirm('Archive this joining instruction template?')
    if (!confirmed) return

    const { error } = await supabase
      .from('joining_instruction_templates')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', template.id)
      .eq('organisation_id', profile.organisation_id)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading joining instruction templates...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/settings" className="text-sm text-slate-500 hover:text-slate-950">
          Back to settings
        </Link>

        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Settings
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 mt-1">
            Joining instruction templates
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Reusable instructions for delegates before they attend a course.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-4 ${panelClass} h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              {editingId ? 'Edit template' : 'New template'}
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Keep the wording practical and easy for delegates to follow.
            </p>
          </div>

          <div className="p-4 grid gap-3">
            <input
              className={inputClass}
              placeholder="Template name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Email subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />

            <textarea
              className={`${inputClass} min-h-72`}
              placeholder="Email body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
              />
              Set as default template
            </label>

            <div className="flex flex-wrap gap-2">
              <button className={buttonPrimary} onClick={saveTemplate} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create template'}
              </button>

              {editingId && (
                <button className={buttonSecondary} onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 grid gap-4">
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Placeholders
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                These values are replaced for each delegate when instructions are sent.
              </p>
            </div>

            <div className="p-4 flex flex-wrap gap-2">
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

          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Template list
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Select a template on a booking, then customise it if needed.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {templates.map((template) => (
                <div key={template.id} className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-950">
                          {template.name}
                        </h3>

                        {template.is_default && (
                          <span className="border border-emerald-100 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700">
                            Default
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 mt-2">
                        {template.subject}
                      </p>

                      <p className="text-xs text-slate-500 mt-2 whitespace-pre-line line-clamp-4">
                        {template.body}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button className={buttonSecondary} onClick={() => startEditing(template)}>
                        Edit
                      </button>

                      <button className={buttonDanger} onClick={() => archiveTemplate(template)}>
                        Archive
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {templates.length === 0 && (
                <div className="p-6">
                  <p className="text-sm font-semibold text-slate-950">
                    No templates yet
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Create a default template to start sending joining instructions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
