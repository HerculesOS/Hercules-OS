import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key'

const { emailTemplateDefaults } = await import('../lib/emailTemplateDefaults.ts')
const {
  buildEmailHtml,
  getEmailTemplate,
  replacePlaceholders,
  textToHtml,
} = await import('../lib/emailTemplates.ts')

describe('email template helpers', () => {
  it('replaces camelCase and snake_case placeholders', () => {
    const rendered = replacePlaceholders(
      '{{clientName}} booked {{course_name}} with {{businessName}}',
      {
        clientName: 'Acme Ltd',
        course_name: 'First Aid',
        businessName: 'Hercules Training',
      }
    )

    assert.equal(rendered, 'Acme Ltd booked First Aid with Hercules Training')
  })

  it('escapes rendered HTML body values', () => {
    const html = textToHtml('Hello <script>alert("x")</script>')

    assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/)
    assert.doesNotMatch(html, /<script>/)
  })

  it('escapes subject and body in the final HTML shell', () => {
    const html = buildEmailHtml({
      subject: 'Invoice <b>INV-1</b>',
      body: 'Pay <now>',
      footerHtml: 'Sent by Hercules',
    })

    assert.match(html, /Invoice &lt;b&gt;INV-1&lt;\/b&gt;/)
    assert.match(html, /Pay &lt;now&gt;/)
  })

  it('returns fallback copy without querying when organisation id is missing', async () => {
    const template = await getEmailTemplate(
      'invoice_email',
      undefined,
      emailTemplateDefaults.invoiceEmail
    )

    assert.equal(template.subject, 'Invoice {{invoiceNumber}} from {{businessName}}')
  })
})

describe('email route fallback templates', () => {
  it('renders invoice fallback placeholders', () => {
    const subject = replacePlaceholders(emailTemplateDefaults.invoiceEmail.subject, {
      invoiceNumber: 'INV-0007',
      businessName: 'Hercules Training',
    })

    const body = replacePlaceholders(emailTemplateDefaults.invoiceEmail.body, {
      clientName: 'Acme Ltd',
      invoiceNumber: 'INV-0007',
      invoiceAmount: '£240.00',
      dueDate: '31/05/2026',
      businessName: 'Hercules Training',
    })

    assert.equal(subject, 'Invoice INV-0007 from Hercules Training')
    assert.match(body, /Hello Acme Ltd/)
    assert.match(body, /Amount due: £240.00/)
  })

  it('renders certificate fallback placeholders', () => {
    const subject = replacePlaceholders(emailTemplateDefaults.certificateEmail.subject, {
      courseName: 'Emergency First Aid at Work',
    })

    const body = replacePlaceholders(emailTemplateDefaults.certificateEmail.body, {
      learnerName: 'Sam Learner',
      courseName: 'Emergency First Aid at Work',
      businessName: 'Hercules Training',
    })

    assert.equal(subject, 'Your Emergency First Aid at Work certificate')
    assert.match(body, /Hello Sam Learner/)
    assert.match(body, /certificate for Emergency First Aid at Work has been issued/)
  })
})
