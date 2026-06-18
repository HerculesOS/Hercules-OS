import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const {
  buildClientInsertRecords,
  buildMissingClientInsertRecords,
  buildClientImportPreview,
  buildDelegateImportPreview,
  parseCsv,
  resolveImportedDelegateClientId,
} = await import('../lib/importCsv.ts')

describe('CSV import helpers', () => {
  it('parses headers case-insensitively and handles quoted commas', () => {
    const parsed = parseCsv('Client Name,Email,Notes\n"Acme, Ltd",hello@example.com,"Main client"\n\n')

    assert.deepEqual(parsed.headers, ['client_name', 'email', 'notes'])
    assert.equal(parsed.rows[0].client_name, 'Acme, Ltd')
    assert.equal(parsed.rows[0].notes, 'Main client')
  })

  it('validates required client fields and email format', () => {
    const preview = buildClientImportPreview(
      'client_name,email\n,not-an-email\nAcme Ltd,hello@example.com\n',
      []
    )

    assert.equal(preview.totalRows, 2)
    assert.equal(preview.errorRows, 1)
    assert.equal(preview.importableRows, 1)
    assert.match(preview.rows[0].errors.join(' '), /client_name is required/)
    assert.match(preview.rows[0].errors.join(' '), /Email is not valid/)
  })

  it('maps common client import aliases', () => {
    const preview = buildClientImportPreview(
      'Company,Contact Name,Email address,Phone number,Full Address,Additional Notes,Ignored Column\nBlackleaf Training,Alex Contact,alex@blackleaf.test,01234 000000,"1 High Street, London",Priority client,ignore me\n',
      []
    )

    assert.equal(preview.importableRows, 1)
    assert.equal(preview.rows[0].data.client_name, 'Blackleaf Training')
    assert.equal(preview.rows[0].data.primary_contact, 'Alex Contact')
    assert.equal(preview.rows[0].data.email, 'alex@blackleaf.test')
    assert.equal(preview.rows[0].data.phone, '01234 000000')
    assert.equal(preview.rows[0].data.address, '1 High Street, London')
    assert.equal(preview.rows[0].data.notes, 'Priority client')
  })

  it('uses client_name as the required client name fallback when primary_contact is blank', () => {
    const preview = buildClientImportPreview(
      'client_name,email\nBlackleaf,hello@blackleaf.test\n',
      []
    )

    const records = buildClientInsertRecords(
      preview.rows,
      'organisation-1',
      'user-1'
    )

    assert.equal(records[0].company, 'Blackleaf')
    assert.equal(records[0].name, 'Blackleaf')
  })

  it('warns and skips duplicate clients', () => {
    const preview = buildClientImportPreview(
      'client_name,email\nAcme Ltd,new@example.com\nNew Client,hello@example.com\n',
      [{ id: 'client-1', company: 'Acme Ltd', email: 'hello@example.com' }]
    )

    assert.equal(preview.warningRows, 2)
    assert.equal(preview.importableRows, 0)
    assert.equal(preview.skippedRows, 2)
  })

  it('validates delegates from first and last name or full_name', () => {
    const preview = buildDelegateImportPreview(
      'full_name,email\nSam Learner,sam@example.com\n,no-name@example.com\n',
      [],
      [],
      false
    )

    assert.equal(preview.totalRows, 2)
    assert.equal(preview.errorRows, 1)
    assert.equal(preview.importableRows, 1)
    assert.match(preview.rows[1].errors.join(' '), /first_name and last_name/)
  })

  it('links delegates to existing clients and can create missing clients', () => {
    const preview = buildDelegateImportPreview(
      'first_name,last_name,email,client_name\nSam,Learner,sam@example.com,Acme Ltd\nAlex,Person,alex@example.com,New Client\n',
      [{ id: 'client-1', company: 'Acme Ltd', email: '' }],
      [],
      true
    )

    assert.equal(preview.importableRows, 2)
    assert.equal(preview.warningRows, 2)
    assert.equal(preview.rows[0].data.matchedClientId, 'client-1')
    assert.equal(preview.rows[1].data.shouldCreateClient, true)
  })

  it('maps Client, Email address, Forename and Surname delegate headers', () => {
    const preview = buildDelegateImportPreview(
      'Forename,Surname,Email address,Client,Spare Column\nSam,Learner,sam@example.com,Acme Ltd,ignored\n',
      [{ id: 'client-1', company: 'Acme Ltd', email: '' }],
      [],
      false
    )

    assert.equal(preview.importableRows, 1)
    assert.equal(preview.rows[0].data.first_name, 'Sam')
    assert.equal(preview.rows[0].data.last_name, 'Learner')
    assert.equal(preview.rows[0].data.email, 'sam@example.com')
    assert.equal(preview.rows[0].data.client_name, 'Acme Ltd')
    assert.equal(preview.rows[0].data.matchedClientId, 'client-1')
    assert.equal(preview.rows[0].data.clientPreview, 'Matched existing client: Acme Ltd')
  })

  it('maps Company to delegate client_name', () => {
    const preview = buildDelegateImportPreview(
      'First Name,Last Name,Company\nSam,Learner,Acme Ltd\n',
      [{ id: 'client-1', company: 'Acme Ltd', email: '' }],
      [],
      false
    )

    assert.equal(preview.importableRows, 1)
    assert.equal(preview.rows[0].data.client_name, 'Acme Ltd')
    assert.equal(preview.rows[0].data.matchedClientId, 'client-1')
  })

  it('splits Full Name into first and last names', () => {
    const preview = buildDelegateImportPreview(
      'Full Name,Client\nSam Middle Learner,Acme Ltd\n',
      [{ id: 'client-1', company: 'Acme Ltd', email: '' }],
      [],
      false
    )

    assert.equal(preview.importableRows, 1)
    assert.equal(preview.rows[0].data.first_name, 'Sam')
    assert.equal(preview.rows[0].data.last_name, 'Middle Learner')
    assert.equal(preview.rows[0].data.full_name, 'Sam Middle Learner')
  })

  it('rejects single-word Full Name because last name is missing', () => {
    const preview = buildDelegateImportPreview(
      'Full Name,Client\nSam,Acme Ltd\n',
      [{ id: 'client-1', company: 'Acme Ltd', email: '' }],
      [],
      false
    )

    assert.equal(preview.errorRows, 1)
    assert.equal(preview.importableRows, 0)
    assert.match(preview.rows[0].errors.join(' '), /full_name must include first and last name/)
  })

  it('rejects first-name-only delegate rows because last name is missing', () => {
    const preview = buildDelegateImportPreview(
      'First Name,Client\nSam,Acme Ltd\n',
      [{ id: 'client-1', company: 'Acme Ltd', email: '' }],
      [],
      false
    )

    assert.equal(preview.errorRows, 1)
    assert.equal(preview.importableRows, 0)
    assert.match(preview.rows[0].errors.join(' '), /last_name is required/)
  })

  it('matches existing clients by trimmed case-insensitive name', () => {
    const preview = buildDelegateImportPreview(
      'First Name,Last Name,Client\nSam,Learner, blackleaf \n',
      [{ id: 'client-1', company: 'Blackleaf', email: '' }],
      [],
      false
    )

    assert.equal(preview.importableRows, 1)
    assert.equal(preview.rows[0].data.matchedClientId, 'client-1')
  })

  it('creates missing clients from Client or Company aliases', () => {
    const clientPreview = buildDelegateImportPreview(
      'First Name,Last Name,Client\nSam,Learner,New School\n',
      [],
      [],
      true
    )
    const companyPreview = buildDelegateImportPreview(
      'First Name,Last Name,Company\nAlex,Person,New Company\n',
      [],
      [],
      true
    )

    assert.deepEqual(
      buildMissingClientInsertRecords(clientPreview.rows, 'organisation-1', 'user-1').map((record) => record.name),
      ['New School']
    )
    assert.deepEqual(
      buildMissingClientInsertRecords(companyPreview.rows, 'organisation-1', 'user-1').map((record) => record.name),
      ['New Company']
    )
  })

  it('creates missing clients with the trimmed client_name as the required name', () => {
    const preview = buildDelegateImportPreview(
      'first_name,last_name,email,client_name\nAlex,Person,alex@example.com,  New Client  \n',
      [],
      [],
      true
    )
    const records = buildMissingClientInsertRecords(
      preview.rows,
      'organisation-1',
      'user-1'
    )

    assert.deepEqual(records, [
      {
        organisation_id: 'organisation-1',
        user_id: 'user-1',
        company: 'New Client',
        name: 'New Client',
        email: null,
        phone: null,
        address: null,
        notes: 'Created during delegate CSV import',
      },
    ])
  })

  it('does not create a missing client for blank client_name', () => {
    const preview = buildDelegateImportPreview(
      'first_name,last_name,email,client_name\nAlex,Person,alex@example.com,   \n',
      [],
      [],
      true
    )
    const records = buildMissingClientInsertRecords(
      preview.rows,
      'organisation-1',
      'user-1'
    )

    assert.equal(preview.importableRows, 1)
    assert.equal(preview.rows[0].data.shouldCreateClient, false)
    assert.deepEqual(records, [])
  })

  it('attaches a delegate to a newly created client after import', () => {
    const preview = buildDelegateImportPreview(
      'first_name,last_name,email,client_name\nAlex,Person,alex@example.com,New Client\n',
      [],
      [],
      true
    )
    const createdClientIds = new Map([['new client', 'client-created-1']])
    const clientId = resolveImportedDelegateClientId(
      preview.rows[0].data,
      createdClientIds
    )

    assert.equal(clientId, 'client-created-1')
  })

  it('allows two different delegates with the same email', () => {
    const preview = buildDelegateImportPreview(
      'first_name,last_name,email,client_name\nJohn,Smith,office@testschool.co.uk,TEST School\nSarah,Jones,office@testschool.co.uk,TEST School\nMichael,Brown,office@testschool.co.uk,TEST School\n',
      [{ id: 'client-1', company: 'TEST School', email: '' }],
      [],
      false
    )

    assert.equal(preview.totalRows, 3)
    assert.equal(preview.errorRows, 0)
    assert.equal(preview.importableRows, 3)
    assert.equal(preview.skippedRows, 0)
    assert.match(preview.rows[1].warnings.join(' '), /Another row in this file uses this email/)
  })

  it('rejects invalid delegate email format', () => {
    const preview = buildDelegateImportPreview(
      'first_name,last_name,email,client_name\nJohn,Smith,not-an-email,TEST School\n',
      [{ id: 'client-1', company: 'TEST School', email: '' }],
      [],
      false
    )

    assert.equal(preview.errorRows, 1)
    assert.equal(preview.importableRows, 0)
    assert.match(preview.rows[0].errors.join(' '), /Email is not valid/)
  })

  it('treats same first name, last name and client as a likely duplicate', () => {
    const preview = buildDelegateImportPreview(
      'first_name,last_name,email,client_name\nJohn,Smith,john@testschool.co.uk,TEST School\n',
      [{ id: 'client-1', company: 'TEST School', email: '' }],
      [{ id: 'delegate-1', full_name: 'John Smith', email: 'different@testschool.co.uk', client_id: 'client-1' }],
      false
    )

    assert.equal(preview.warningRows, 1)
    assert.equal(preview.importableRows, 0)
    assert.match(preview.rows[0].warnings.join(' '), /name and client already exists/)
  })

  it('does not block import when only the email matches an existing delegate', () => {
    const preview = buildDelegateImportPreview(
      'first_name,last_name,email,client_name\nSarah,Jones,office@testschool.co.uk,TEST School\n',
      [{ id: 'client-1', company: 'TEST School', email: '' }],
      [{ id: 'delegate-1', full_name: 'John Smith', email: 'office@testschool.co.uk', client_id: 'client-1' }],
      false
    )

    assert.equal(preview.warningRows, 1)
    assert.equal(preview.importableRows, 1)
    assert.equal(preview.skippedRows, 0)
    assert.match(preview.rows[0].warnings.join(' '), /email is already used/)
  })

  it('skips repeated same-name and same-client rows in the import file', () => {
    const preview = buildDelegateImportPreview(
      'first_name,last_name,email,client_name\nJohn,Smith,john@testschool.co.uk,TEST School\nJohn,Smith,john@testschool.co.uk,TEST School\n',
      [{ id: 'client-1', company: 'TEST School', email: '' }],
      [{ id: 'delegate-1', full_name: 'Sam Learner', email: 'sam@example.com' }],
      false
    )

    assert.equal(preview.warningRows, 2)
    assert.equal(preview.importableRows, 1)
    assert.equal(preview.skippedRows, 1)
    assert.match(preview.rows[1].warnings.join(' '), /Another row in this file uses this name and client/)
  })
})
