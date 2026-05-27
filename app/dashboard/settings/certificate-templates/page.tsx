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

  const previewText = (
    text: string,
    template?: any
  ) => {
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
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading certificate templates...
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
          Certificate Templates
        </h1>

        <p className="text-gray-500 mt-1">
          Customise certificate wording, validity and course-specific templates
        </p>
      </div>

      <div className="bg-white border rounded-2xl p-6 shadow-sm mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Available Placeholders
        </h2>

        <p className="text-gray-500 mb-4">
          Use these placeholders in certificate wording. They will be replaced automatically when certificates are generated.
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm h-fit">
          <h2 className="text-xl font-semibold mb-4">
            Create Template
          </h2>

          <div className="flex flex-col gap-3">
            <input
              className="border p-3 rounded-lg"
              placeholder="Template name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <select
              className="border p-3 rounded-lg"
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
              className="border p-3 rounded-lg"
              placeholder="Certificate title"
              value={certificateTitle}
              onChange={(e) => setCertificateTitle(e.target.value)}
            />

            <textarea
              className="border p-3 rounded-lg min-h-36"
              placeholder="Certificate body"
              value={certificateBody}
              onChange={(e) => setCertificateBody(e.target.value)}
            />

            <textarea
              className="border p-3 rounded-lg"
              placeholder="Footer text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Signature name"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Signature title"
              value={signatureTitle}
              onChange={(e) => setSignatureTitle(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              type="number"
              min="0"
              max="20"
              placeholder="Validity years"
              value={validityYears}
              onChange={(e) => setValidityYears(e.target.value)}
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Set as default template
            </label>

            <button
              className="bg-black text-white p-3 rounded-lg"
              onClick={createTemplate}
            >
              Create Template
            </button>
          </div>
        </div>

        <div className="xl:col-span-2 grid gap-5">
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
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-semibold">
                            {template.name}
                          </h2>

                          {template.is_default && (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                              Default
                            </span>
                          )}
                        </div>

                        <p className="text-gray-500 mt-1">
                          {getCourseTemplateName(template.course_template_id)}
                        </p>

                        <p className="text-sm text-gray-400 mt-1">
                          Validity: {template.validity_years ?? 3} year
                          {Number(template.validity_years ?? 3) === 1 ? '' : 's'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          className="bg-black text-white px-4 py-2 rounded-lg"
                          onClick={() => startEditing(template)}
                        >
                          Edit
                        </button>

                        {!template.is_default && (
                          <button
                            className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
                            onClick={() => deleteTemplate(template)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Title</p>
                        <div className="bg-gray-50 border rounded-xl p-4 mt-2">
                          {template.certificate_title}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Body preview</p>
                        <div className="bg-gray-50 border rounded-xl p-4 mt-2 whitespace-pre-line">
                          {previewText(template.certificate_body, template)}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Footer</p>
                        <div className="bg-gray-50 border rounded-xl p-4 mt-2">
                          {template.footer_text || 'No footer text'}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500">Signature</p>
                        <div className="bg-gray-50 border rounded-xl p-4 mt-2">
                          {template.signature_name || 'No signature name'}
                          {template.signature_title ? `, ${template.signature_title}` : ''}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-5">
                      <h2 className="text-2xl font-semibold">
                        Edit Certificate Template
                      </h2>

                      <p className="text-gray-500 mt-1">
                        Update the wording and settings used when certificates are generated.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        className="border p-3 rounded-lg"
                        placeholder="Template name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />

                      <select
                        className="border p-3 rounded-lg"
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
                        className="border p-3 rounded-lg md:col-span-2"
                        placeholder="Certificate title"
                        value={editCertificateTitle}
                        onChange={(e) => setEditCertificateTitle(e.target.value)}
                      />

                      <textarea
                        className="border p-3 rounded-lg md:col-span-2 min-h-40"
                        placeholder="Certificate body"
                        value={editCertificateBody}
                        onChange={(e) => setEditCertificateBody(e.target.value)}
                      />

                      <textarea
                        className="border p-3 rounded-lg md:col-span-2"
                        placeholder="Footer text"
                        value={editFooterText}
                        onChange={(e) => setEditFooterText(e.target.value)}
                      />

                      <input
                        className="border p-3 rounded-lg"
                        placeholder="Signature name"
                        value={editSignatureName}
                        onChange={(e) => setEditSignatureName(e.target.value)}
                      />

                      <input
                        className="border p-3 rounded-lg"
                        placeholder="Signature title"
                        value={editSignatureTitle}
                        onChange={(e) => setEditSignatureTitle(e.target.value)}
                      />

                      <input
                        className="border p-3 rounded-lg"
                        type="number"
                        min="0"
                        max="20"
                        placeholder="Validity years"
                        value={editValidityYears}
                        onChange={(e) => setEditValidityYears(e.target.value)}
                      />

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editIsDefault}
                          onChange={(e) => setEditIsDefault(e.target.checked)}
                        />
                        Set as default template
                      </label>
                    </div>

                    <div className="bg-gray-50 border rounded-xl p-4 mt-4">
                      <p className="text-sm text-gray-500 mb-2">
                        Body preview
                      </p>

                      <div className="whitespace-pre-line">
                        {previewText(editCertificateBody)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-5">
                      <button
                        className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                        onClick={() => saveTemplate(template.id)}
                        disabled={savingEdit}
                      >
                        {savingEdit ? 'Saving...' : 'Save Changes'}
                      </button>

                      <button
                        className="border px-4 py-2 rounded-lg"
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
            <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
              No certificate templates found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}