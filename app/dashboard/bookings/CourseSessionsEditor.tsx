'use client'

import type { BookingSession } from '@/lib/bookingSessions'

type CourseSessionsEditorProps = {
  sessions: BookingSession[]
  onChange: (sessions: BookingSession[]) => void
  inputClass: string
}

const normalizeSessions = (sessions: BookingSession[]) =>
  sessions.map((session, index) => ({
    ...session,
    sort_order: index + 1,
  }))

export default function CourseSessionsEditor({
  sessions,
  onChange,
  inputClass,
}: CourseSessionsEditorProps) {
  const displayedSessions =
    sessions.length > 0
      ? sessions
      : [{ session_date: '', start_time: '', end_time: '', sort_order: 1 }]

  const updateSession = (
    index: number,
    field: 'session_date' | 'start_time' | 'end_time',
    value: string
  ) => {
    onChange(
      normalizeSessions(
        displayedSessions.map((session, sessionIndex) =>
          sessionIndex === index
            ? {
                ...session,
                [field]: value,
              }
            : session
        )
      )
    )
  }

  const addSession = () => {
    const previousSession = displayedSessions[displayedSessions.length - 1]

    onChange(
      normalizeSessions([
        ...displayedSessions,
        {
          session_date: previousSession?.session_date || '',
          start_time: previousSession?.start_time || '',
          end_time: previousSession?.end_time || '',
        },
      ])
    )
  }

  const removeSession = (index: number) => {
    if (displayedSessions.length <= 1) return

    onChange(
      normalizeSessions(
        displayedSessions.filter((_, itemIndex) => itemIndex !== index)
      )
    )
  }

  return (
    <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-950">
            Course days
          </p>

          <p className="mt-1 text-xs text-slate-500">
            These are the actual course dates and times.
          </p>
        </div>

        <button
          type="button"
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 active:scale-[0.99]"
          onClick={addSession}
        >
          Add course day
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        {displayedSessions.map((session, index) => (
          <div
            key={`${index}-${session.sort_order || index}`}
            className="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">
                Day {index + 1}
              </p>

              {displayedSessions.length > 1 && (
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 transition hover:text-red-700"
                  onClick={() => removeSession(index)}
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                className={inputClass}
                type="date"
                value={session.session_date || ''}
                onChange={(event) =>
                  updateSession(index, 'session_date', event.target.value)
                }
              />

              <input
                className={inputClass}
                type="time"
                value={session.start_time || ''}
                onChange={(event) =>
                  updateSession(index, 'start_time', event.target.value)
                }
              />

              <input
                className={inputClass}
                type="time"
                value={session.end_time || ''}
                onChange={(event) =>
                  updateSession(index, 'end_time', event.target.value)
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
