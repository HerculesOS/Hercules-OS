# Hercules OS Testing Plan

## Automated tests

Run these locally only:

```bash
npm test
npx tsc --noEmit
```

Current automated coverage:

- Email template placeholder replacement.
- HTML escaping for template-rendered email content.
- Safe fallback behavior when no organisation template can be loaded.
- Invoice email fallback copy and placeholder rendering.
- Certificate email fallback copy and placeholder rendering.

## Browser tests not automated yet

Playwright is not installed in this workspace, so browser tests were not added or run. When Playwright is available in local/dev only, automate these flows against a seeded non-production Supabase project:

- Public request form loading:
  - Visit `/request-training/[known-dev-slug]`.
  - Confirm the organisation name appears.
  - Confirm private/public request type controls render.
  - Submit a test request only against a disposable dev organisation.

- Protected dashboard routes:
  - Clear browser storage/session.
  - Visit `/dashboard`.
  - Confirm the app redirects to `/login`.
  - Repeat for `/dashboard/reports`, `/dashboard/bookings`, `/dashboard/invoices`, and `/dashboard/certificates`.

- Reports page rendering:
  - Log in with a dev-only test user.
  - Visit `/dashboard/reports`.
  - Confirm the report controls, metrics, charts, field selector, and Excel export button render.
  - Export a report and confirm an `.xlsx` file is downloaded.

## Manual regression checklist

Use a local/dev Supabase project. Do not use production records.

- Email templates:
  - Edit each template in `/dashboard/settings/email-templates`.
  - Include both camelCase placeholders, such as `{{clientName}}`, and legacy snake_case placeholders, such as `{{client_name}}`.
  - Send each email type and confirm placeholders are replaced.
  - Add special characters like `<`, `>`, `"`, and `&` to names/notes and confirm the email does not render broken HTML.

- Booking emails:
  - Send booking confirmation from the booking list.
  - Send booking reminder from the booking list.
  - Send both from a booking detail page.
  - Confirm formatted date/time values match the UI.

- Invoice emails:
  - Send an invoice email with a custom invoice template.
  - Confirm the PDF attachment opens.
  - Confirm payment details render safely.
  - Confirm sent/paid/secured invoice behavior is unchanged.

- Certificate emails:
  - Create certificates from booking delegates.
  - Send a certificate email with a custom certificate template.
  - Confirm the PDF attachment opens.
  - Confirm the QR code points to `/verify/[id]`.

- Expiry reminders:
  - Send a manual expiry reminder.
  - Run the expiry check route only against dev data.
  - Confirm reminders are not resent after `expiry_reminder_sent_at` is set.

## Suggested Playwright setup

Once you are ready to add browser automation, install Playwright in development and keep it pointed at local/dev only:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

Recommended test command:

```bash
npx playwright test
```

Keep any Playwright seed data separate from production and use a dedicated dev organisation slug.
