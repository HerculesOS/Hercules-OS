'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import { parseOptionalPositiveInteger, parseOptionalNonNegativeNumber } from '@/lib/numberValidation'

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [defaultPrice, setDefaultPrice] = useState('')
  const [defaultDuration, setDefaultDuration] = useState('')
  const [durationDays, setDurationDays] = useState('1')
  const [defaultStartTime, setDefaultStartTime] = useState('')
  const [defaultEndTime, setDefaultEndTime] = useState('')
  const [certificateValidityYears, setCertificateValidityYears] = useState('')
  const [notes, setNotes] = useState('')

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editDefaultPrice, setEditDefaultPrice] = useState('')
  const [editDefaultDuration, setEditDefaultDuration] = useState('')
  const [editDurationDays, setEditDurationDays] = useState('1')
  const [editDefaultStartTime, setEditDefaultStartTime] = useState('')
  const [editDefaultEndTime, setEditDefaultEndTime] = useState('')
  const [editCertificateValidityYears, setEditCertificateValidityYears] = useState('')
  const [editNotes, setEditNotes] = useState('')

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

  const load = async () => {
    const profile = await getOrCreateAccount()

    setOrganisationId(profile.organisation_id)

    const { data, error } = await supabase
      .from('course_templates')
      .select('*')
      .eq('organisation_id', profile.organisation_id)
      .order('name', { ascending: true })

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setCourses(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const addCourse = async () => {
    if (!name) {
      alert('Course name is required')
      return
    }

    const parsedPrice = parseOptionalNonNegativeNumber(defaultPrice, 'Default price')
    const parsedDurationDays = parseOptionalPositiveInteger(durationDays, 'Duration days')
    const parsedValidityYears = parseOptionalPositiveInteger(
      certificateValidityYears,
      'Certificate validity years'
    )

    if (parsedPrice.error || parsedDurationDays.error || parsedValidityYears.error) {
      alert(parsedPrice.error || parsedDurationDays.error || parsedValidityYears.error)
      return
    }

    const { error } = await supabase.from('course_templates').insert({
      organisation_id: organisationId,
      code: code.trim() || null,
      name: name.trim(),
      default_price: parsedPrice.value,
      default_duration: defaultDuration.trim() || null,
      duration_days: parsedDurationDays.value || 1,
      default_start_time: defaultStartTime || null,
      default_end_time: defaultEndTime || null,
      certificate_validity_years: parsedValidityYears.value,
      notes: notes.trim() || null,
    })

    if (error) {
      alert(error.message)
      return
    }

    setCode('')
    setName('')
    setDefaultPrice('')
    setDefaultDuration('')
    setDurationDays('1')
    setDefaultStartTime('')
    setDefaultEndTime('')
    setCertificateValidityYears('')
    setNotes('')

    load()
  }

  const startEditing = (course: any) => {
    setEditingId(course.id)
    setEditCode(course.code || '')
    setEditName(course.name || '')
    setEditDefaultPrice(course.default_price ? String(course.default_price) : '')
    setEditDefaultDuration(course.default_duration || '')
    setEditDurationDays(String(course.duration_days || 1))
    setEditDefaultStartTime(course.default_start_time || '')
    setEditDefaultEndTime(course.default_end_time || '')
    setEditCertificateValidityYears(
      course.certificate_validity_years
        ? String(course.certificate_validity_years)
        : ''
    )
    setEditNotes(course.notes || '')
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditCode('')
    setEditName('')
    setEditDefaultPrice('')
    setEditDefaultDuration('')
    setEditDurationDays('1')
    setEditDefaultStartTime('')
    setEditDefaultEndTime('')
    setEditCertificateValidityYears('')
    setEditNotes('')
  }

  const saveCourseEdit = async (courseId: string) => {
    if (!editName) {
      alert('Course name is required')
      return
    }

    const parsedPrice = parseOptionalNonNegativeNumber(editDefaultPrice, 'Default price')
    const parsedDurationDays = parseOptionalPositiveInteger(editDurationDays, 'Duration days')
    const parsedValidityYears = parseOptionalPositiveInteger(
      editCertificateValidityYears,
      'Certificate validity years'
    )

    if (parsedPrice.error || parsedDurationDays.error || parsedValidityYears.error) {
      alert(parsedPrice.error || parsedDurationDays.error || parsedValidityYears.error)
      return
    }

    setSavingEdit(true)

    const { error } = await supabase
      .from('course_templates')
      .update({
        code: editCode.trim() || null,
        name: editName.trim(),
        default_price: parsedPrice.value,
        default_duration: editDefaultDuration.trim() || null,
        duration_days: parsedDurationDays.value || 1,
        default_start_time: editDefaultStartTime || null,
        default_end_time: editDefaultEndTime || null,
        certificate_validity_years: parsedValidityYears.value,
        notes: editNotes.trim() || null,
      })
      .eq('id', courseId)

    setSavingEdit(false)

    if (error) {
      alert(error.message)
      return
    }

    cancelEditing()
    load()
  }

  const deleteCourse = async (courseId: string) => {
    const confirmDelete = confirm(
      'Are you sure you want to delete this course template? Existing bookings will not be deleted.'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('course_templates')
      .delete()
      .eq('id', courseId)

    if (error) {
      alert(error.message)
      return
    }

    load()
  }

  const clearSearch = () => {
    setSearch('')
  }

  const filteredCourses = courses.filter((course) => {
    const searchableText = `
      ${course.code || ''}
      ${course.name || ''}
      ${course.default_duration || ''}
      ${course.duration_days || ''}
      ${course.default_start_time || ''}
      ${course.default_end_time || ''}
      ${course.notes || ''}
    `.toLowerCase()

    return searchableText.includes(search.toLowerCase())
  })

  const coursesWithPrice = courses.filter((course) => course.default_price)
  const coursesWithDuration = courses.filter(
    (course) => course.default_duration || Number(course.duration_days || 1) > 1
  )
  const coursesWithValidity = courses.filter(
    (course) => course.certificate_validity_years
  )

  const StatCard = ({
    label,
    value,
    detail,
  }: {
    label: string
    value: string | number
    detail?: string
  }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <h2 className="text-2xl font-semibold tracking-tight text-slate-950 mt-2">
        {value}
      </h2>

      {detail && (
        <p className="text-xs text-slate-500 mt-1">
          {detail}
        </p>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-4 text-sm text-slate-500">
          Loading courses...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total courses"
          value={courses.length}
          detail="Reusable templates"
        />

        <StatCard
          label="With price"
          value={coursesWithPrice.length}
          detail="Default price saved"
        />

        <StatCard
          label="With duration"
          value={coursesWithDuration.length}
          detail="Default duration saved"
        />

        <StatCard
          label="With validity"
          value={coursesWithValidity.length}
          detail="Certificate validity set"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`xl:col-span-4 ${panelClass} h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              Add course template
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              Set reusable course defaults for bookings and certificates.
            </p>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <input
              className={inputClass}
              placeholder="Course code e.g. EFAW"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />

            <input
              className={inputClass}
              placeholder="Course name e.g. Emergency First Aid at Work"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Default price e.g. 650"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Default duration e.g. 1 day"
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Duration days e.g. 2"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputClass}
                type="time"
                value={defaultStartTime}
                onChange={(e) => setDefaultStartTime(e.target.value)}
              />

              <input
                className={inputClass}
                type="time"
                value={defaultEndTime}
                onChange={(e) => setDefaultEndTime(e.target.value)}
              />
            </div>

            <input
              className={inputClass}
              placeholder="Certificate validity years e.g. 3"
              value={certificateValidityYears}
              onChange={(e) => setCertificateValidityYears(e.target.value)}
            />

            <textarea
              className={`${inputClass} min-h-24`}
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button
              className={buttonPrimary}
              onClick={addCourse}
            >
              Add course
            </button>
          </div>
        </div>

        <div className="xl:col-span-8 grid gap-4">
          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Search courses
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Find templates by code, name, duration or notes.
              </p>
            </div>

            <div className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  className={`${inputClass} flex-1`}
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <button
                  className={buttonSecondary}
                  onClick={clearSearch}
                >
                  Clear
                </button>
              </div>

              <p className="text-xs text-slate-500 mt-3">
                Showing {filteredCourses.length} of {courses.length} course templates
              </p>
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <h2 className="text-sm font-semibold text-slate-950">
                Course list
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Manage reusable course names, pricing, duration and certificate validity.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredCourses.map((course) => {
                const isEditing = editingId === course.id

                return (
                  <div
                    key={course.id}
                    className="p-4"
                  >
                    {!isEditing ? (
                      <>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              {course.code && (
                                <span className="bg-slate-950 text-white px-2.5 py-1 rounded-md text-xs font-semibold">
                                  {course.code}
                                </span>
                              )}

                              <h3 className="text-sm font-semibold text-slate-950">
                                {course.name}
                              </h3>

                              <span className="border border-emerald-100 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-medium">
                                Active
                              </span>
                            </div>

                            <p className="text-sm text-slate-600 mt-1">
                              Course template
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs text-slate-600">
                          <div>
                            <p className="text-slate-400">Default price</p>
                            <p className="font-medium text-slate-800 mt-1">
                              {course.default_price
                                ? `£${Number(course.default_price).toFixed(2)}`
                                : 'Not set'}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-400">Duration</p>
                            <p className="font-medium text-slate-800 mt-1">
                              {course.duration_days
                                ? `${course.duration_days} day${
                                    Number(course.duration_days) === 1 ? '' : 's'
                                  }`
                                : course.default_duration || 'Not set'}
                            </p>
                            {course.default_duration && (
                              <p className="text-slate-500 mt-1">
                                {course.default_duration}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-slate-400">Default time</p>
                            <p className="font-medium text-slate-800 mt-1">
                              {course.default_start_time || course.default_end_time
                                ? `${course.default_start_time || 'Not set'} - ${course.default_end_time || 'Not set'}`
                                : 'Not set'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs text-slate-600">
                          <div>
                            <p className="text-slate-400">Certificate validity</p>
                            <p className="font-medium text-slate-800 mt-1">
                              {course.certificate_validity_years
                                ? `${course.certificate_validity_years} year${
                                    Number(course.certificate_validity_years) === 1 ? '' : 's'
                                  }`
                                : 'Not set'}
                            </p>
                          </div>
                        </div>

                        {course.notes && (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                              Notes
                            </p>

                            <p className="text-xs text-slate-700 whitespace-pre-line leading-5">
                              {course.notes}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            className={buttonSecondary}
                            onClick={() => startEditing(course)}
                          >
                            Edit
                          </button>

                          <button
                            className={buttonDanger}
                            onClick={() => deleteCourse(course.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-slate-950">
                            Edit course template
                          </h3>

                          <p className="text-xs text-slate-500 mt-1">
                            Update reusable course details.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            className={inputClass}
                            placeholder="Course code"
                            value={editCode}
                            onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                          />

                          <input
                            className={inputClass}
                            placeholder="Course name"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />

                          <input
                            className={inputClass}
                            placeholder="Default price"
                            value={editDefaultPrice}
                            onChange={(e) => setEditDefaultPrice(e.target.value)}
                          />

                          <input
                            className={inputClass}
                            placeholder="Default duration"
                            value={editDefaultDuration}
                            onChange={(e) => setEditDefaultDuration(e.target.value)}
                          />

                          <input
                            className={inputClass}
                            placeholder="Duration days"
                            value={editDurationDays}
                            onChange={(e) => setEditDurationDays(e.target.value)}
                          />

                          <input
                            className={inputClass}
                            type="time"
                            value={editDefaultStartTime}
                            onChange={(e) => setEditDefaultStartTime(e.target.value)}
                          />

                          <input
                            className={inputClass}
                            type="time"
                            value={editDefaultEndTime}
                            onChange={(e) => setEditDefaultEndTime(e.target.value)}
                          />

                          <input
                            className={inputClass}
                            placeholder="Certificate validity years"
                            value={editCertificateValidityYears}
                            onChange={(e) =>
                              setEditCertificateValidityYears(e.target.value)
                            }
                          />

                          <textarea
                            className={`${inputClass} md:col-span-2 min-h-24`}
                            placeholder="Notes"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            className={buttonPrimary}
                            onClick={() => saveCourseEdit(course.id)}
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

              {filteredCourses.length === 0 && (
                <div className="p-6">
                  <p className="text-sm font-semibold text-slate-950">
                    No course templates yet
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    Add your first course template to speed up booking creation.
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
