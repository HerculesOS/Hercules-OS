import { createClient } from '@supabase/supabase-js'

type EmailTemplateFallback = {
  subject: string
  body: string
}

type TemplateValues = Record<string, string | number | null | undefined>

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const escapeHtml = (value: string | number | null | undefined) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export const textToHtml = (text: string) => {
  return text
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '<br />'

      return `<p style="font-size: 16px; color: #4b5563; margin: 0 0 12px;">${escapeHtml(line)}</p>`
    })
    .join('')
}

export const replacePlaceholders = (
  text: string,
  values: TemplateValues
) => {
  let output = text

  Object.entries(values).forEach(([key, value]) => {
    output = output.replaceAll(`{{${key}}}`, String(value ?? ''))
  })

  return output
}

export const getEmailTemplate = async (
  templateKey: string,
  organisationId: string | null | undefined,
  fallback: EmailTemplateFallback
) => {
  if (!organisationId) {
    return fallback
  }

  const { data: template } = await supabaseAdmin
    .from('email_templates')
    .select('subject, body')
    .eq('organisation_id', organisationId)
    .eq('template_key', templateKey)
    .maybeSingle()

  return {
    subject: template?.subject || fallback.subject,
    body: template?.body || fallback.body,
  }
}

export const buildEmailHtml = ({
  subject,
  body,
  detailsHtml,
  actionHtml = '',
  footerHtml,
}: {
  subject: string
  body: string
  detailsHtml?: string
  actionHtml?: string
  footerHtml: string
}) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #111827;">
      <h1 style="font-size: 24px; margin-bottom: 16px;">
        ${escapeHtml(subject)}
      </h1>

      <div>
        ${textToHtml(body)}
      </div>

      ${detailsHtml || ''}

      ${actionHtml}

      <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
        ${footerHtml}
      </p>
    </div>
  `
}

export const detailRow = (label: string, value: string | number | null | undefined) => {
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || 'Not set')}</p>`
}

export const detailsBox = (rows: string) => {
  return `
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 24px 0;">
      ${rows}
    </div>
  `
}

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message

  return fallback
}
