'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [organisationId, setOrganisationId] = useState('')
  const [loading, setLoading] = useState(true)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [defaultPrice, setDefaultPrice] = useState('')
  const [defaultDuration, setDefaultDuration] = useState('')
  const [certificateValidityYears, setCertificateValidityYears] = useState('')
  const [notes, setNotes] = useState('')

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [editCode, setEditCode] = useState('')
  const [editName, setEditName] = useState('')
  const [editDefaultPrice, setEditDefaultPrice] = useState('')
  const [editDefaultDuration, setEditDefaultDuration] = useState('')
  const [editCertificateValidityYears, setEditCertificateValidityYears] = useState('')
  const [editNotes, setEditNotes] = useState('')

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

    const { error } = await supabase.from('course_templates').insert({
      organisation_id: organisationId,
      code: code.trim() || null,
      name: name.trim(),
      default_price: defaultPrice ? Number(defaultPrice) : null,
      default_duration: defaultDuration.trim() || null,
      certificate_validity_years: certificateValidityYears
        ? Number(certificateValidityYears)
        : null,
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
    setEditCertificateValidityYears('')
    setEditNotes('')
  }

  const saveCourseEdit = async (courseId: string) => {
    if (!editName) {
      alert('Course name is required')
      return
    }

    setSavingEdit(true)

    const { error } = await supabase
      .from('course_templates')
      .update({
        code: editCode.trim() || null,
        name: editName.trim(),
        default_price: editDefaultPrice ? Number(editDefaultPrice) : null,
        default_duration: editDefaultDuration.trim() || null,
        certificate_validity_years: editCertificateValidityYears
          ? Number(editCertificateValidityYears)
          : null,
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

  const filteredCourses = courses.filter((course) => {
    const searchableText = `
      ${course.code || ''}
      ${course.name || ''}
      ${course.default_duration || ''}
      ${course.notes || ''}
    `.toLowerCase()

    return searchableText.includes(search.toLowerCase())
  })

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        Loading courses...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold">
          Courses
        </h1>

        <p className="text-gray-500 mt-1">
          Create reusable course templates for faster bookings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Total Courses</p>
          <h2 className="text-3xl font-bold mt-2">{courses.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Search Results</p>
          <h2 className="text-3xl font-bold mt-2">{filteredCourses.length}</h2>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <p className="text-gray-500">Templates</p>
          <h2 className="text-3xl font-bold mt-2">{courses.length}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Add Course Template
          </h2>

          <div className="flex flex-col gap-3">
            <input
              className="border p-3 rounded-lg"
              placeholder="Course code e.g. EFAW"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Course name e.g. Emergency First Aid at Work"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Default price e.g. 650"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Default duration e.g. 1 day"
              value={defaultDuration}
              onChange={(e) => setDefaultDuration(e.target.value)}
            />

            <input
              className="border p-3 rounded-lg"
              placeholder="Certificate validity years e.g. 3"
              value={certificateValidityYears}
              onChange={(e) => setCertificateValidityYears(e.target.value)}
            />

            <textarea
              className="border p-3 rounded-lg"
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <button
              className="bg-black text-white p-3 rounded-lg"
              onClick={addCourse}
            >
              Add Course
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white border rounded-2xl p-4 shadow-sm mb-4">
            <input
              className="w-full border p-3 rounded-lg"
              placeholder="Search courses by code, name, duration or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-4">
            {filteredCourses.map((course) => {
              const isEditing = editingId === course.id

              return (
                <div
                  key={course.id}
                  className="bg-white border rounded-2xl p-5 shadow-sm"
                >
                  {!isEditing ? (
                    <>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            {course.code && (
                              <div className="bg-black text-white px-3 py-1 rounded-full text-sm font-semibold">
                                {course.code}
                              </div>
                            )}

                            <h2 className="text-xl font-semibold">
                              {course.name}
                            </h2>
                          </div>

                          <p className="text-gray-500 mt-2">
                            Course template
                          </p>
                        </div>

                        <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm w-fit">
                          Active
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 text-sm text-gray-700">
                        <div>
                          <p className="text-gray-500">Default price</p>
                          <p className="font-medium mt-1">
                            {course.default_price
                              ? `£${Number(course.default_price).toFixed(2)}`
                              : 'Not set'}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">Duration</p>
                          <p className="font-medium mt-1">
                            {course.default_duration || 'Not set'}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">Certificate validity</p>
                          <p className="font-medium mt-1">
                            {course.certificate_validity_years
                              ? `${course.certificate_validity_years} years`
                              : 'Not set'}
                          </p>
                        </div>
                      </div>

                      {course.notes && (
                        <div className="bg-gray-50 border rounded-xl p-4 mt-5 text-sm text-gray-700">
                          <p className="text-gray-500 mb-1">Notes</p>
                          <p>{course.notes}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3 mt-5">
                        <button
                          className="border px-4 py-2 rounded-lg"
                          onClick={() => startEditing(course)}
                        >
                          Edit
                        </button>

                        <button
                          className="border border-red-300 text-red-600 px-4 py-2 rounded-lg"
                          onClick={() => deleteCourse(course.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-5">
                        <h2 className="text-xl font-semibold">
                          Edit Course Template
                        </h2>

                        <p className="text-gray-500 mt-1">
                          Update reusable course details
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          className="border p-3 rounded-lg"
                          placeholder="Course code"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                        />

                        <input
                          className="border p-3 rounded-lg"
                          placeholder="Course name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />

                        <input
                          className="border p-3 rounded-lg"
                          placeholder="Default price"
                          value={editDefaultPrice}
                          onChange={(e) => setEditDefaultPrice(e.target.value)}
                        />

                        <input
                          className="border p-3 rounded-lg"
                          placeholder="Default duration"
                          value={editDefaultDuration}
                          onChange={(e) => setEditDefaultDuration(e.target.value)}
                        />

                        <input
                          className="border p-3 rounded-lg"
                          placeholder="Certificate validity years"
                          value={editCertificateValidityYears}
                          onChange={(e) =>
                            setEditCertificateValidityYears(e.target.value)
                          }
                        />

                        <textarea
                          className="border p-3 rounded-lg md:col-span-2"
                          placeholder="Notes"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap gap-3 mt-5">
                        <button
                          className="bg-black text-white px-4 py-2 rounded-lg disabled:bg-gray-400"
                          onClick={() => saveCourseEdit(course.id)}
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

            {filteredCourses.length === 0 && (
              <div className="bg-white border rounded-2xl p-6 shadow-sm text-gray-500">
                No course templates found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}