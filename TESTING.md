# Hercules OS Testing Plan

Use local/dev data only. Do not test against production records.

## Automated Checks

Run these before pushing changes:

```bash
npm test
npx tsc --noEmit
npm run build
```

Current automated coverage includes:

- Booking date helper coverage for one-day and multi-day end dates.
- Email template placeholder replacement.
- HTML escaping for template-rendered email content.
- Safe fallback behavior when no organisation template can be loaded.
- Invoice email fallback copy and placeholder rendering.
- Certificate email fallback copy and placeholder rendering.
- Invoice number helper behavior and duplicate-key detection.
- Number validation helper behavior.
- Date range helper behavior for expiring-soon certificates.

## Browser Tests Not Automated Yet

Playwright is not installed in this workspace. When Playwright is available, run browser tests against a seeded local/dev Supabase project only.

| Area | Test | Steps | Expected result | Priority | Notes / bugs |
| --- | --- | --- | --- | --- | --- |
| Public request form | Page loads | Visit `/request-training/[known-dev-slug]`. | Organisation name, request type controls, course fields, and contact fields render. | Critical | |
| Public request form | Submit dev request | Submit a private and public request using disposable dev data. | Requests are created for the dev organisation only. | Critical | |
| Protected routes | Unauthenticated redirect | Clear session and visit `/dashboard`, `/dashboard/reports`, `/dashboard/bookings`, `/dashboard/invoices`, and `/dashboard/certificates`. | Each protected route redirects to `/login`. | Critical | |
| Reports | Reports page renders | Log in as a dev user and visit `/dashboard/reports`. | Metrics, charts, field selector, filters, and Excel export controls render. | Important | |
| Reports | Excel export downloads | Export a report from `/dashboard/reports`. | An `.xlsx` file downloads and opens with selected fields. | Important | |

## Manual Regression Checklist

| Area | Test | Steps | Expected result | Priority | Notes / bugs |
| --- | --- | --- | --- | --- | --- |
| Booking location | Private client address auto-fill | Create or edit a private booking. Leave location blank, then select a client with an address. | Booking location fills from the selected client's address. | Important | |
| Booking location | Existing location is preserved | Enter a custom location first, then select a private client with an address. | The custom location is not overwritten. | Important | |
| Booking location | Location remains editable | Let the client address auto-fill, then manually change the location. | The edited value remains in the field and saves normally. | Important | |
| Booking location | Previous location suggestions | Create bookings with distinct locations, then start another booking for the same organisation. | Previous booking locations appear as suggestions. | Important | |
| Booking location | Organisation isolation | Use two separate dev organisations with different booking locations. | Each organisation only sees its own previous booking locations. | Critical | |
| Multi-day bookings | Course template defaults | Edit a course template with `duration_days`, `default_start_time`, and `default_end_time`. Select it while creating a booking. | Booking start/end times default from the template. | Important | |
| Multi-day bookings | End date auto-set | Select a course template with duration greater than 1 day, then choose a start date. | `end_date` auto-sets to the inclusive final day. | Important | |
| Multi-day bookings | Dates remain editable | Change the auto-filled start date and end date manually. | Manual date values remain editable and save correctly. | Important | |
| Multi-day bookings | One-day bookings | Create a booking from a one-day course template or no duration value. | Existing one-day booking behavior still works. | Critical | |
| Multi-day bookings | Calendar-created booking defaults | Create a booking from the calendar and select a course template with defaults. | Template duration and default times are applied in the calendar flow. | Important | |
| Multi-day bookings | Calendar display across days | Create a multi-day booking and view the calendar. | The booking appears across each day in its date range. | Important | |
| Clients | A-Z sorting | Open `/dashboard/clients` with several clients. | Clients are listed by company/name A-Z. | Important | |
| Clients | Compact summary | Open `/dashboard/clients`. | Each row shows company name, primary contact, email, and a clear View client link by default. | Important | |
| Clients | Expand/collapse details | Open and close a client's Details area. | Phone, address, notes, and secondary action appear only inside the expanded area. | Important | |
| Clients | Hidden details searchable | Search for text that exists only in phone, address, or notes. | Matching clients still appear. | Important | |
| Clients | Client links | Use both View client and Open profile links. | Both links open the correct client detail page. | Critical | |
| Certificates | Verification ID creation | Create certificates from booking delegates. | Every certificate gets a usable verification ID. | Critical | |
| Certificates | Verification page | Open `/verify/[verification_id]` or scan the QR code from a generated PDF. | The verification page loads the correct certificate details. | Critical | |
| Certificates | Certificate PDF | Download a certificate PDF. | PDF opens and includes the correct delegate, course, dates, certificate number, and QR code. | Critical | |
| Certificates | Certificate email | Send a certificate email. | Email sends with the certificate PDF attached and template placeholders replaced. | Critical | |
| Certificates | Expiring today | Create or inspect a certificate expiring today. | It is included in expiring-soon calculations. | Important | |
| Invoices | Invoice number uniqueness | Create several invoices quickly for the same dev organisation. | Invoice numbers do not collide. | Critical | |
| Invoices | Private invoice creation | Create an invoice from a private booking. | Invoice recipient and booking details are correct. | Critical | |
| Invoices | Public invoice creation | Create invoices for a public booking client, company/client, individual delegate, and custom recipient where applicable. | Recipient details match the chosen recipient type. | Critical | |
| Invoices | Locked invoice edit | Mark an invoice as secured/paid, then attempt edits. | Locked invoice behavior is preserved and unsafe changes are blocked. | Critical | |
| Invoices | Recipient stability | Edit an invoice without changing recipient or booking. | Booking and recipient are not silently changed or cleared. | Critical | |
| Invoices | Invoice PDF | Download an invoice PDF. | PDF opens with correct invoice number, recipient, booking, totals, and payment details. | Critical | |
| Invoices | Invoice email | Send an invoice email. | Email sends with invoice PDF attached and template placeholders replaced. | Critical | |
| Public request conversion | RPC conversion | Convert a dev public/private request from the dashboard. | Conversion completes through the RPC without partial records. | Critical | |
| Public request conversion | Public booking conversion | Convert a public training request. | A public booking is created correctly, without forcing an inappropriate main client. | Critical | |
| Public request conversion | Private booking conversion | Convert a private training request. | A private booking is created with the correct client/delegate details. | Critical | |
| Public bookings | Delegates from multiple clients | Add delegates from multiple clients or individual learners to a public booking. | Delegates attach correctly and no orphan records are left. | Critical | |
| Number validation | Booking values | Try blank, zero, negative, decimal, and valid values in booking fields. | Invalid values are rejected and valid values save. | Important | |
| Number validation | Calendar booking values | Repeat number validation from the calendar-created booking flow. | Validation matches the main booking flow. | Important | |
| Number validation | Invoice values | Try invalid invoice quantities, rates, totals, discounts, or similar numeric fields. | Invalid values are rejected and valid values save. | Important | |
| Number validation | Public request values | Try invalid delegate counts or other public request numeric fields. | Invalid values are rejected before submission. | Important | |
| Reports | Request type selectable/exportable | Build a custom report including request type. Export it. | Request type is selectable and appears in the Excel export. | Important | |
| Reports | Revenue date basis | Compare revenue reports using expected invoice/booking/payment date basis. | Revenue totals match the selected business expectation. | Important | |
| Reports | Metrics and charts | Check revenue, bookings, delegates, certificates, monthly revenue, monthly bookings, and top courses. | Values match the dev records used for testing. | Important | |
| Settings | Date format | Change date format in settings and view bookings, calendar, certificates, invoices, emails, and reports. | Dates display consistently with the selected format. | Important | |
| Settings | Time format | Change time format in settings and view bookings, calendar, emails, and reports. | Times display consistently with the selected format. | Important | |
| Email templates | Placeholder replacement | Edit each template and include camelCase placeholders such as `{{clientName}}` and snake_case placeholders such as `{{client_name}}`. | Placeholders are replaced in outgoing emails. | Important | |
| Email templates | HTML escaping | Add special characters like `<`, `>`, `"`, and `&` to names, notes, payment details, and template values. | Emails render safely without broken HTML. | Critical | |
| Booking emails | Confirmation and reminder emails | Send booking confirmation and reminder emails from list and detail pages. | Emails send and formatted date/time values match the UI. | Important | |
| Expiry reminders | Manual reminder | Send a manual expiry reminder for a dev certificate. | Reminder sends once and uses the expected template/fallback. | Important | |
| Expiry reminders | Scheduled expiry check | Run the expiry check route against dev data only. | Eligible reminders send and are not resent after `expiry_reminder_sent_at` is set. | Important | |

## Suggested Playwright Setup

Once browser automation is safe to add, install Playwright in development and keep it pointed at local/dev only:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

Recommended command:

```bash
npx playwright test
```

Keep Playwright seed data separate from production and use a dedicated dev organisation slug.
