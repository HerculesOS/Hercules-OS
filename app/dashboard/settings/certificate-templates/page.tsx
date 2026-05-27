'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function CertificateTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [courseTemplates, setCourseTemplates] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [courseTemplateId, setCourseTemplateId] = useState('')
  const [certificateTitle, setCertificateTitle] = useState('Certificate of Completion')
  const [certificateBody, setCertificateBody] = useState(
    'This is to certify that {{delegate_name}} has successfully completed {{course_name}} on {{issue_date}}.'
  )
  const [footerText, setFooterText] = useState(
    'This certificate can be verified online using the certificate number.'
  )
  const [signatureName, setSignatureName] = useState('')
  const [signatureTitle, setSignatureTitle] = useState('')
  const [validityYears, setValidityYears] = useState('3')
  const [isDefault, setIsDefault] = useState(false)

  const [editingId, setEditingId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [editName, setEditName] = useState('')
  const [editCourseTemplateId, setEditCourseTemplateId] = useState('')
  const [editCertificateTitle, setEditCertificateTitle] = useState('')
  const [editCertificateBody, setEditCertificateBody] = useState('')
  const [editFooterText, setEditFooterText] = useState('')
  const [editSignatureName, setEditSignatureName] = useState('')
  const [editSignatureTitle, setEditSignatureTitle] = useState('')
  const [editValidityYears, setEditValidityYears] = useState('3')
  const [editIsDefault, setEditIsDefault] = useState(false)

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonPrimary =
    'bg-slate-950 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:bg-slate-400'

  const buttonSecondary =
    'border border-slate-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const buttonDanger =
    'border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-50'

  const panelClass =
    'bg-white border border-slate-200 rounded-lg'

  const panelHeaderClass =
    'px-4 py-3 border-b border-slate-200'

  const placeholders = [
    '{{delegate_name}}',
    '{{course_name}}',
    '{{issue_date}}',
    '{{expiry_date}}',
    '{{certificate_number}}',
    '{{business_name}}',
    '{{trainer_name}}',
  ]

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data: templatesData, error: templatesError } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true })

    if (templatesError) {
      alert(templatesError.message)
      setLoading(false)
      return
    }

    const { data: courseTemplatesData } = await supabase
      .from('course_templates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('name', { ascending: true })

    setTemplates(templatesData || [])
    setCourseTemplates(courseTemplatesData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const resetCreateForm = () => {
    setName('')
    setCourseTemplateId('')
    setCertificateTitle('Certificate of Completion')
    setCertificateBody(
      'This is to certify that {{delegate_name}} has successfully completed {{course_name}} on {{issue_date}}.'
    )
    setFooterText('This certificate can be verified online using the certificate number.')
    setSignatureName('')
    setSignatureTitle('')
    setValidityYears('3')
    setIsDefault(false)
  }

  const createTemplate = async () => {
    if (!name || !certificateTitle || !certificateBody) {
      alert('Template name, title and body are required')
      return
    }

    const years = Number(validityYears)

    if (Number.isNaN(years) || years < 0 || years > 20) {
      alert('Validity years must be between 0 and 20')
      return
    }

    if (isDefault) {
      await supabase
        .from('certificate_templates')
        .update({ is_default: false })
        .eq('organisation_id', organisationId)
    }

    const { error } = await supabase.from('certificate_templates').insert({
      organisation_id: organisationId,
      course_template_id: courseTemplateId || null,
      name,
      certificate_title: certificateTitle,
      certificate_body: certificateBody,
      footer_text: footerText,
      signature_name: signatureName,
      signature_title: signatureTitle,
      validity_years: years,
      is_default: isDefault,
    })

    if (error) {
      alert(error.message)
      return
    }

    resetCreateForm()
    load()
  }

  const startEditing = (template: any) => {
    setEditingId(template.id)
    setEditName(template.name || '')
    setEditCourseTemplateId(template.course_template_id || '')
    setEditCertificateTitle(template.certificate_title || '')
    setEditCertificateBody(template.certificate_body || '')
    setEditFooterText(template.footer_text || '')
    setEditSignatureName(template.signature_name || '')
    setEditSignatureTitle(template.signature_title || '')
    setEditValidityYears(String(template.validity_years ?? 3))
    setEditIsDefault(Boolean(template.is_default))
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditName('')
    setEditCourseTemplateId('')
    setEditCertificateTitle('')
    setEditCertificateBody('')
    setEditFooterText('')
    setEditSignatureName('')
    setEditSignatureTitle('')
    setEditValidityYears('3')
    setEditIsDefault(false)
  }

  const saveTemplate = async (templateId: string) => {
    if (!editName || !editCertificateTitle || !editCertificateBody) {
      alert('Template name, title and body are required')
      return
    }

    const years = Number(editValidityYears)

    if (Number.isNaN(years) || years < 0 || years > 20) {
      alert('Validity years must be between 0 and 20')
      return
    }

    setSavingEdit(true)

    if (editIsDefault) {
      await supabase
        .from('certificate_templates')
        .update({ is_default: false })
        .eq('organisation_id', organisationId)
        .neq('id', templateId)
    }

    const { error } = await supabase
      .from('certificate_templates')
      .update({
        course_template_id: editCourseTemplateId || null,
        name: editName,
        certificate_title: editCertificateTitle,
        certificate_body: editCertificateBody,
        footer_text: editFooterText,
        signature_name: editSignatureName,
        signature_title: editSignatureTitle,
        validity_years: years,
        is_default: editIsDefault,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)

    setSavingEdit(false)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    load()
  }

  const deleteTemplate = async (template: any) => {
    if (template.is_default) {
      alert('You cannot delete the default certificate template.')
      return
    }

    const confirmDelete = confirm(
      'Are you sure you want to delete this certificate template?'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('certificate_templates')
      .delete()
      .eq('id', template.id)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const getCourseTemplateName = (courseTemplateId: string | null) => {
    if (!courseTemplateId) return 'Any course'

    const course = courseTemplates.find((item) => item.id === courseTemplateId)

    if (!course) return 'Course template not found'

    return `${course.code ? `${course.code} - ` : ''}${course.name}`
  }

  const previewText = (text: string) => {
    const values: Record<string, string> = {
      '{{delegate_name}}': 'Alex Smith',
      '{{course_name}}': 'Emergency First Aid at Work',
      '{{issue_date}}': '2026-05-27',
      '{{expiry_date}}': '2029-05-27',
      '{{certificate_number}}': 'CERT-12345',
      '{{business_name}}': 'Your Training Company',
      '{{trainer_name}}': 'Trainer Name',
    }

    let output = text || ''

    Object.entries(values).forEach(([key, value]) => {
      output = output.replaceAll(key, value)
    })

    return output
  }

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading certificate templates...
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
            Certificate templates
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Customise certificate wording, validity and course-specific templates.
          </p>
        </div>
      </div>

      <div className={`${panelClass} mb-4`}>
        <div className={panelHeaderClass}>
          <h2 className="text-sm font-semibold text-slate-950">
            Available placeholders
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Use these placeholders in certificate wording. They will be replaced automatically when certificates are generated.
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

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-4 ${panelClass} h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Create template
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Create default or course-specific certificate wording.
            </p>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <input
              className={inputClass}
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <select
              className={inputClass}
              value={courseTemplateId}
              onChange={(e) => setCourseTemplateId(e.target.value)}
            >
              <option value="">Any course</option>

              {courseTemplates.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code ? `${course.code} - ` : ''}
                  {course.name}
                </option>
              ))}
            </select>

            <input
              className={inputClass}
              placeholder="Certificate title"
              value={certificateTitle}
              onChange={(e) => setCertificateTitle(e.target.value)}
            />

            <textarea
              className={`${inputClass} min-h-36`}
              placeholder="Certificate body"
              value={certificateBody}
              onChange={(e) => setCertificateBody(e.target.value)}
            />

            <textarea
              className={`${inputClass} min-h-20`}
              placeholder="Footer text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Signature name"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Signature title"
              value={signatureTitle}
              onChange={(e) => setSignatureTitle(e.target.value)}
            />

            <input
              className={inputClass}
              type="number"
              min="0"
              max="20"
              placeholder="Validity years"
              value={validityYears}
              onChange={(e) => setValidityYears(e.target.value)}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Set as default template
            </label>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Body preview
              </p>

              <p className="text-xs text-slate-700 mt-2 whitespace-pre-line leading-5">
                {previewText(certificateBody)}
              </p>
            </div>

            <button
              className={buttonPrimary}
              onClick={createTemplate}
            >
              Create template
            </button>
          </div>
        </div>

        <div className={`xl:col-span-8 ${panelClass}`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Template list
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Manage default, course-specific and signature wording.
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

                            {template.is_default && (
                              <span className="border border-emerald-100 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                Default
                              </span>
                            )}

                            <span className="border border-slate-200 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                              {getCourseTemplateName(template.course_template_id)}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-2">
                            Validity: {template.validity_years ?? 3} year
                            {Number(template.validity_years ?? 3) === 1 ? '' : 's'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            className={buttonPrimary}
                            onClick={() => startEditing(template)}
                          >
                            Edit
                          </button>

                          {!template.is_default && (
                            <button
                              className={buttonDanger}
                              onClick={() => deleteTemplate(template)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 mt-4">
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Title
                          </p>

                          <p className="text-sm text-slate-950 mt-2">
                            {template.certificate_title}
                          </p>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Body preview
                          </p>

                          <p className="text-sm text-slate-700 mt-2 whitespace-pre-line leading-6">
                            {previewText(template.certificate_body)}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Footer
                            </p>

                            <p className="text-sm text-slate-700 mt-2">
                              {template.footer_text || 'No footer text'}
                            </p>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              Signature
                            </p>

                            <p className="text-sm text-slate-700 mt-2">
                              {template.signature_name || 'No signature name'}
                              {template.signature_title ? `, ${template.signature_title}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-950">
                          Edit certificate template
                        </h3>

                        <p className="text-xs text-slate-500 mt-1">
                          Update the wording and settings used when certificates are generated.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          className={inputClass}
                          placeholder="Template name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />

                        <select
                          className={inputClass}
                          value={editCourseTemplateId}
                          onChange={(e) => setEditCourseTemplateId(e.target.value)}
                        >
                          <option value="">Any course</option>

                          {courseTemplates.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.code ? `${course.code} - ` : ''}
                              {course.name}
                            </option>
                          ))}
                        </select>

                        <input
                          className={`${inputClass} md:col-span-2`}
                          placeholder="Certificate title"
                          value={editCertificateTitle}
                          onChange={(e) => setEditCertificateTitle(e.target.value)}
                        />

                        <textarea
                          className={`${inputClass} md:col-span-2 min-h-40`}
                          placeholder="Certificate body"
                          value={editCertificateBody}
                          onChange={(e) => setEditCertificateBody(e.target.value)}
                        />

                        <textarea
                          className={`${inputClass} md:col-span-2 min-h-20`}
                          placeholder="Footer text"
                          value={editFooterText}
                          onChange={(e) => setEditFooterText(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          placeholder="Signature name"
                          value={editSignatureName}
                          onChange={(e) => setEditSignatureName(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          placeholder="Signature title"
                          value={editSignatureTitle}
                          onChange={(e) => setEditSignatureTitle(e.target.value)}
                        />

                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          max="20"
                          placeholder="Validity years"
                          value={editValidityYears}
                          onChange={(e) => setEditValidityYears(e.target.value)}
                        />

                        <label className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editIsDefault}
                            onChange={(e) => setEditIsDefault(e.target.checked)}
                          />
                          Set as default template
                        </label>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                          Body preview
                        </p>

                        <p className="text-sm text-slate-700 whitespace-pre-line leading-6">
                          {previewText(editCertificateBody)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          className={buttonPrimary}
                          onClick={() => saveTemplate(template.id)}
                          disabled={savingEdit}
                        >
                          {savingEdit ? 'Saving...' : 'Save changes'}
                        </button>

                        <button
                          className={buttonSecondary}
                          onClick={cancelEditing}
                          disabled={savingEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}

            {templates.length === 0 && (
              <div className="p-6 text-sm text-slate-500">
                No certificate templates found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}