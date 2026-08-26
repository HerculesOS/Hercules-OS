export type JoiningInstructionTemplateLike = {
  id?: string | null
  name?: string | null
  subject?: string | null
  body?: string | null
  is_default?: boolean | null
  archived_at?: string | null
}

export type JoiningInstructionBookingLike = {
  joining_instruction_template_id?: string | null
  joining_instruction_subject?: string | null
  joining_instruction_body?: string | null
}

export type JoiningInstructionValues = {
  delegateName?: string | null
  delegate_name?: string | null
  clientName?: string | null
  client_name?: string | null
  courseName?: string | null
  course_name?: string | null
  bookingDate?: string | null
  booking_date?: string | null
  bookingStartTime?: string | null
  booking_start_time?: string | null
  bookingEndTime?: string | null
  booking_end_time?: string | null
  bookingLocation?: string | null
  booking_location?: string | null
  trainerName?: string | null
  trainer_name?: string | null
  organisationName?: string | null
  organisation_name?: string | null
  organisationEmail?: string | null
  organisation_email?: string | null
  organisationPhone?: string | null
  organisation_phone?: string | null
}

export const defaultJoiningInstructionTemplate = {
  name: 'Default joining instructions',
  subject: 'Joining instructions for {{course_name}} on {{booking_date}}',
  body: `Hello {{delegate_name}},

We are looking forward to welcoming you to {{course_name}} on {{booking_date}}.

Course time: {{booking_start_time}} to {{booking_end_time}}
Venue: {{booking_location}}
Trainer: {{trainer_name}}

Please arrive a few minutes before the course start time so we can begin promptly.

What to bring:
- Any identification or paperwork requested by your employer or course organiser
- Something to take notes with
- Any course-specific items already agreed with us

If anything is unclear before the course, please contact {{organisation_name}}.

Contact:
{{organisation_email}}
{{organisation_phone}}

Kind regards,
{{organisation_name}}`,
}

export const getJoiningInstructionTemplateForBooking = (
  booking: JoiningInstructionBookingLike,
  templates: JoiningInstructionTemplateLike[]
) => {
  const activeTemplates = templates.filter((template) => !template.archived_at)

  if (booking.joining_instruction_template_id) {
    const selectedTemplate = activeTemplates.find(
      (template) => template.id === booking.joining_instruction_template_id
    )

    if (selectedTemplate) return selectedTemplate
  }

  return (
    activeTemplates.find((template) => template.is_default) ||
    activeTemplates[0] ||
    defaultJoiningInstructionTemplate
  )
}

export const getJoiningInstructionDraft = (
  booking: JoiningInstructionBookingLike,
  templates: JoiningInstructionTemplateLike[]
) => {
  const template = getJoiningInstructionTemplateForBooking(booking, templates)

  return {
    subject:
      booking.joining_instruction_subject ||
      template.subject ||
      defaultJoiningInstructionTemplate.subject,
    body:
      booking.joining_instruction_body ||
      template.body ||
      defaultJoiningInstructionTemplate.body,
    template,
  }
}

export const normalizeJoiningInstructionValues = (
  values: JoiningInstructionValues
) => {
  const delegateName = values.delegateName || values.delegate_name || ''
  const clientName = values.clientName || values.client_name || ''
  const courseName = values.courseName || values.course_name || ''
  const bookingDate = values.bookingDate || values.booking_date || ''
  const bookingStartTime =
    values.bookingStartTime || values.booking_start_time || 'Not set'
  const bookingEndTime =
    values.bookingEndTime || values.booking_end_time || 'Not set'
  const bookingLocation =
    values.bookingLocation || values.booking_location || 'Not set'
  const trainerName =
    values.trainerName || values.trainer_name || 'To be confirmed'
  const organisationName =
    values.organisationName || values.organisation_name || ''
  const organisationEmail =
    values.organisationEmail || values.organisation_email || ''
  const organisationPhone =
    values.organisationPhone || values.organisation_phone || ''

  return {
    delegateName,
    delegate_name: delegateName,
    clientName,
    client_name: clientName,
    courseName,
    course_name: courseName,
    bookingDate,
    booking_date: bookingDate,
    bookingStartTime,
    booking_start_time: bookingStartTime,
    bookingEndTime,
    booking_end_time: bookingEndTime,
    bookingLocation,
    booking_location: bookingLocation,
    trainerName,
    trainer_name: trainerName,
    organisationName,
    organisation_name: organisationName,
    organisationEmail,
    organisation_email: organisationEmail,
    organisationPhone,
    organisation_phone: organisationPhone,
  }
}

export const replaceJoiningInstructionPlaceholders = (
  text: string,
  values: JoiningInstructionValues
) => {
  let output = text || ''
  const normalizedValues = normalizeJoiningInstructionValues(values)

  Object.entries(normalizedValues).forEach(([key, value]) => {
    output = output.replaceAll(`{{${key}}}`, String(value ?? ''))
  })

  return output
}

export const isBookingDueForJoiningInstructions = (
  booking: {
    date?: string | null
    booking_sessions?: Array<{
      session_date?: string | null
      sort_order?: number | null
    }> | null
    status?: string | null
    joining_instructions_sent_at?: string | null
  },
  today = new Date()
) => {
  const firstSession = Array.isArray(booking.booking_sessions)
    ? booking.booking_sessions
        .filter((session) => session.session_date)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0]
    : null
  const startDate = firstSession?.session_date || booking.date

  if (!startDate) return false
  if (booking.joining_instructions_sent_at) return false
  if (booking.status === 'cancelled') return false

  const [yearText, monthText, dayText] = String(startDate).split('T')[0].split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) return false

  const bookingDate = new Date(year, month - 1, day)
  const sendDate = new Date(bookingDate)
  sendDate.setDate(bookingDate.getDate() - 7)

  return (
    sendDate.getFullYear() === today.getFullYear() &&
    sendDate.getMonth() === today.getMonth() &&
    sendDate.getDate() === today.getDate()
  )
}

export const getJoiningInstructionSendSummary = <
  TDelegate extends { email?: string | null },
>(
  delegates: TDelegate[]
) => {
  const sendableDelegates = delegates.filter((delegate) => delegate.email)
  const skippedMissingEmail = delegates.length - sendableDelegates.length

  return {
    sendableDelegates,
    skippedMissingEmail,
  }
}
