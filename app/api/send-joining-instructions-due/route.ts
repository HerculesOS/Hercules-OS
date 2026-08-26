import { createClient } from '@supabase/supabase-js'
import { getErrorMessage } from '@/lib/emailTemplates'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const getDateString = (date: Date) => date.toISOString().split('T')[0]

const getFutureDateString = (daysAhead: number) => {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)

  return getDateString(date)
}

const getBaseUrl = (request: Request) =>
  process.env.NEXT_PUBLIC_SITE_URL ||
  request.headers.get('origin') ||
  new URL(request.url).origin

export async function GET(request: Request) {
  try {
    const targetDate = getFutureDateString(7)
    const baseUrl = getBaseUrl(request)

    const { data: sessionRows, error: sessionsError } = await supabaseAdmin
      .from('booking_sessions')
      .select('booking_id, organisation_id, sort_order')
      .eq('session_date', targetDate)
      .eq('sort_order', 1)

    if (sessionsError) {
      return Response.json({ error: sessionsError.message }, { status: 500 })
    }

    const bookingIds = Array.from(
      new Set((sessionRows || []).map((session) => session.booking_id))
    )

    let bookings: Array<{ id: string; organisation_id: string }> = []

    if (bookingIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .select('id, organisation_id')
        .in('id', bookingIds)
        .neq('status', 'cancelled')
        .is('joining_instructions_sent_at', null)

      if (error) {
        return Response.json({ error: error.message }, { status: 500 })
      }

      bookings = data || []
    }

    let bookingsChecked = 0
    let bookingsSent = 0
    let sent = 0
    let skippedMissingEmail = 0
    let failed = 0

    for (const booking of bookings || []) {
      bookingsChecked += 1

      const response = await fetch(`${baseUrl}/api/send-joining-instructions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          organisationId: booking.organisation_id,
        }),
      })

      if (!response.ok) {
        failed += 1
        continue
      }

      const result = await response.json()
      const summary = result.summary || {}

      sent += Number(summary.sent || 0)
      skippedMissingEmail += Number(summary.skippedMissingEmail || 0)
      failed += Number(summary.failed || 0)

      if (Number(summary.sent || 0) > 0) {
        bookingsSent += 1
      }
    }

    return Response.json({
      success: true,
      targetDate,
      bookingsChecked,
      bookingsSent,
      sent,
      skippedMissingEmail,
      failed,
    })
  } catch (error: unknown) {
    return Response.json(
      {
        error: getErrorMessage(
          error,
          'Joining instructions scheduled send failed'
        ),
      },
      { status: 500 }
    )
  }
}
