export const emailTemplateDefaults = {
  bookingConfirmation: {
    subject: 'Booking confirmation - {{courseName}}',
    body: `Hello {{clientName}},

This email confirms your booking for {{courseName}}.

Date: {{date}}
Time: {{startTime}} - {{endTime}}
Location: {{location}}
Trainer: {{trainerName}}

Kind regards,
{{businessName}}`,
  },
  bookingReminder: {
    subject: 'Reminder - {{courseName}}',
    body: `Hello {{clientName}},

This is a reminder for your upcoming training course.

Course: {{courseName}}
Date: {{date}}
Time: {{startTime}} - {{endTime}}
Location: {{location}}
Trainer: {{trainerName}}

Kind regards,
{{businessName}}`,
  },
  certificateEmail: {
    subject: 'Your {{courseName}} certificate',
    body: `Hello {{learnerName}},

Your certificate for {{courseName}} has been issued.

A PDF copy of your certificate is attached to this email.

Kind regards,
{{businessName}}`,
  },
  invoiceEmail: {
    subject: 'Invoice {{invoiceNumber}} from {{businessName}}',
    body: `Hello {{clientName}},

Please find your invoice attached as a PDF.

Invoice number: {{invoiceNumber}}
Amount due: {{invoiceAmount}}
Due date: {{dueDate}}

Kind regards,
{{businessName}}`,
  },
  certificateExpiryReminder: {
    subject: 'Certificate expiring soon - {{courseName}}',
    body: `Hello {{learnerName}},

Your {{courseName}} certificate is due to expire on {{expiryDate}}.

Please contact us if you would like to arrange refresher training.

Kind regards,
{{businessName}}`,
  },
} as const
