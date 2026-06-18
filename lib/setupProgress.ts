export type SetupCounts = {
  courseTemplates: number
  certificateTemplates: number
  emailTemplates: number
  clients: number
  delegates: number
  bookings: number
}

export type SetupOrganisation = {
  name?: string | null
  email?: string | null
  phone?: string | null
  public_request_slug?: string | null
}

export type SetupStepKey =
  | 'business-details'
  | 'course-templates'
  | 'certificate-template'
  | 'email-templates'
  | 'import-audience'
  | 'public-request-link'
  | 'first-booking'

export type SetupStepProgress = {
  key: SetupStepKey
  title: string
  description: string
  href: string
  actionLabel: string
  complete: boolean
}

const hasText = (value?: string | null) => Boolean(value?.trim())

export const getSetupSteps = (
  organisation: SetupOrganisation | null | undefined,
  counts: SetupCounts
): SetupStepProgress[] => {
  const businessName = organisation?.name?.trim()

  return [
    {
      key: 'business-details',
      title: 'Business details',
      description: 'Add your trading name and contact details for emails, invoices and certificates.',
      href: '/dashboard/settings',
      actionLabel: 'Open settings',
      complete:
        hasText(businessName) &&
        businessName !== 'My Training Company' &&
        (hasText(organisation?.email) || hasText(organisation?.phone)),
    },
    {
      key: 'course-templates',
      title: 'Course templates',
      description: 'Create the courses you deliver most often, including prices and default times.',
      href: '/dashboard/courses',
      actionLabel: 'Manage courses',
      complete: counts.courseTemplates > 0,
    },
    {
      key: 'certificate-template',
      title: 'Certificate template',
      description: 'Set up the wording and validity used when issuing certificates.',
      href: '/dashboard/settings/certificate-templates',
      actionLabel: 'Edit certificates',
      complete: counts.certificateTemplates > 0,
    },
    {
      key: 'email-templates',
      title: 'Email templates',
      description: 'Customise booking, invoice, certificate and expiry reminder emails.',
      href: '/dashboard/settings/email-templates',
      actionLabel: 'Edit emails',
      complete: counts.emailTemplates > 0,
    },
    {
      key: 'import-audience',
      title: 'Import clients and delegates',
      description: 'Bring in existing clients and learners from a CSV template or spreadsheet export.',
      href: '/dashboard/import',
      actionLabel: 'Open import',
      complete: counts.clients > 0 || counts.delegates > 0,
    },
    {
      key: 'public-request-link',
      title: 'Public request link',
      description: 'Create a customer-facing enquiry form link for new training requests.',
      href: '/dashboard/settings',
      actionLabel: 'Set link',
      complete: hasText(organisation?.public_request_slug),
    },
    {
      key: 'first-booking',
      title: 'First booking',
      description: 'Schedule a private booking or public course to start using the calendar.',
      href: '/dashboard/bookings',
      actionLabel: 'Create booking',
      complete: counts.bookings > 0,
    },
  ]
}

export const calculateSetupProgress = (
  organisation: SetupOrganisation | null | undefined,
  counts: SetupCounts
) => {
  const steps = getSetupSteps(organisation, counts)
  const completedSteps = steps.filter((step) => step.complete).length

  return {
    steps,
    completedSteps,
    totalSteps: steps.length,
    percent: steps.length
      ? Math.round((completedSteps / steps.length) * 100)
      : 0,
    complete: completedSteps === steps.length,
  }
}
