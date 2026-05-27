import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const getTodayString = () => {
  return new Date().toISOString().split('T')[0]
}

const getFutureDateString = (daysAhead: number) => {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString().split('T')[0]
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret) {
      const authHeader = request.headers.get('authorization')

      if (authHeader !== `Bearer ${cronSecret}`) {
        return Response.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const today = getTodayString()
    const reminderCutoffDate = getFutureDateString(60)

    const { data: expiredCertificates, error: expiredFetchError } =
      await supabaseAdmin
        .from('certificates')
        .select('*')
        .eq('status', 'valid')
        .lt('expiry_date', today)

    if (expiredFetchError) {
      return Response.json(
        { error: expiredFetchError.message },
        { status: 500 }
      )
    }

    let expiredUpdatedCount = 0

    if (expiredCertificates && expiredCertificates.length > 0) {
      const expiredIds = expiredCertificates.map((certificate) => certificate.id)

      const { error: expiredUpdateError } = await supabaseAdmin
        .from('certificates')
        .update({
          status: 'expired',
          expired_checked_at: new Date().toISOString(),
        })
        .in('id', expiredIds)

      if (expiredUpdateError) {
        return Response.json(
          { error: expiredUpdateError.message },
          { status: 500 }
        )
      }

      expiredUpdatedCount = expiredCertificates.length
    }

    const { data: expiringCertificates, error: expiringFetchError } =
      await supabaseAdmin
        .from('certificates')
        .select('*')
        .eq('status', 'valid')
        .is('expiry_reminder_sent_at', null)
        .gte('expiry_date', today)
        .lte('expiry_date', reminderCutoffDate)

    if (expiringFetchError) {
      return Response.json(
        { error: expiringFetchError.message },
        { status: 500 }
      )
    }

    let remindersSentCount = 0
    let remindersFailedCount = 0

    for (const certificate of expiringCertificates || []) {
      if (!certificate.delegate_id) {
        continue
      }

      const { data: delegate } = await supabaseAdmin
        .from('delegates')
        .select('*')
        .eq('id', certificate.delegate_id)
        .maybeSingle()

      if (!delegate?.email) {
        continue
      }

      const { data: organisation } = await supabaseAdmin
        .from('organisations')
        .select('*')
        .eq('id', certificate.organisation_id)
        .maybeSingle()

      const verificationUrl = certificate.verification_id
        ? `${process.env.NEXT_PUBLIC_SITE_URL || ''}/verify/${certificate.verification_id}`
        : ''

      const baseUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        request.headers.get('origin') ||
        new URL(request.url).origin

      const response = await fetch(`${baseUrl}/api/send-expiry-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: delegate.email,
          learnerName: certificate.learner_name || delegate.full_name,
          courseName: certificate.course_name,
          expiryDate: certificate.expiry_date,
          certificateNumber: certificate.certificate_number,
          verificationUrl,
          businessName: organisation?.name || 'Hercules OS',
          businessEmail: organisation?.email || '',
          businessPhone: organisation?.phone || '',
          organisationId: certificate.organisation_id,
        }),
      })

      if (!response.ok) {
        remindersFailedCount += 1
        continue
      }

      const { error: reminderUpdateError } = await supabaseAdmin
        .from('certificates')
        .update({
          expiry_reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', certificate.id)

      if (reminderUpdateError) {
        remindersFailedCount += 1
        continue
      }

      remindersSentCount += 1
    }

    return Response.json({
      success: true,
      today,
      reminderCutoffDate,
      expiredUpdatedCount,
      remindersSentCount,
      remindersFailedCount,
    })
  } catch (error: any) {
    return Response.json(
      {
        error: error.message || 'Certificate expiry check failed',
      },
      { status: 500 }
    )
  }
}