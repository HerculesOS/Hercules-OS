'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import {
  buildClientImportPreview,
  buildClientInsertRecords,
  buildDelegateImportPreview,
  buildMissingClientInsertRecords,
  clientCsvTemplate,
  delegateCsvTemplate,
  resolveImportedDelegateClientId,
  type ClientImportData,
  type DelegateImportData,
  type ExistingClientForImport,
  type ExistingDelegateForImport,
  type ImportPreview,
} from '@/lib/importCsv'

type ImportMode = 'clients' | 'delegates'

type ImportResult = {
  clientsCreated: number
  delegatesCreated: number
  duplicatesSkipped: number
  errorRowsSkipped: number
}

const normalizeMatch = (value?: string | null) =>
  (value || '').trim().toLowerCase().replace(/\s+/g, ' ')

export default function ImportPage() {
  const [mode, setMode] = useState<ImportMode>('clients')
  const [organisationId, setOrganisationId] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [clients, setClients] = useState<ExistingClientForImport[]>([])
  const [delegates, setDelegates] = useState<ExistingDelegateForImport[]>([])
  const [loading, setLoading] = useState(true)
  const [fileName, setFileName] = useState('')
  const [csvText, setCsvText] = useState('')
  const [createMissingClients, setCreateMissingClients] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const inputClass =
    'border border-slate-200 bg-white px-3 py-2 rounded-md text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

  const buttonPrimary =
    'bg-slate-950 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-400 disabled:cursor-not-allowed'

  const buttonSecondary =
    'border border-slate-200 bg-white px-4 py-2 rounded-md text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400'

  const panelClass =
    'bg-white border border-slate-200 rounded-xl shadow-sm'

  const panelHeaderClass =
    'px-5 py-4 border-b border-slate-100'

  const load = async () => {
    const profile = await getOrCreateAccount()
    const { data: userData } = await supabase.auth.getUser()

    setOrganisationId(profile.organisation_id)
    setUserId(userData.user?.id || null)

    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, company, name, email')
      .eq('organisation_id', profile.organisation_id)
      .order('company', { ascending: true })

    const { data: delegatesData, error: delegatesError } = await supabase
      .from('delegates')
      .select('id, full_name, email, client_id')
      .eq('organisation_id', profile.organisation_id)
      .order('full_name', { ascending: true })

    if (clientsError || delegatesError) {
      alert(clientsError?.message || delegatesError?.message)
      setLoading(false)
      return
    }

    setClients(clientsData || [])
    setDelegates(delegatesData || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const preview = useMemo(() => {
    if (!csvText.trim()) return null

    return mode === 'clients'
      ? buildClientImportPreview(csvText, clients)
      : buildDelegateImportPreview(csvText, clients, delegates, createMissingClients)
  }, [clients, createMissingClients, csvText, delegates, mode])

  const resetUpload = () => {
    setCsvText('')
    setFileName('')
    setResult(null)
  }

  const clearUpload = () => {
    setCsvText('')
    setFileName('')
  }

  const switchMode = (nextMode: ImportMode) => {
    setMode(nextMode)
    resetUpload()
  }

  const downloadTemplate = (template: string, name: string) => {
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = name
    link.click()

    URL.revokeObjectURL(url)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    setResult(null)

    if (!file) return

    setFileName(file.name)
    setCsvText(await file.text())
  }

  const importClients = async (clientPreview: ImportPreview<ClientImportData>) => {
    const clientRecords = buildClientInsertRecords(
      clientPreview.rows,
      organisationId,
      userId
    )

    if (clientRecords.length === 0) {
      return { clientsCreated: 0, delegatesCreated: 0 }
    }

    const { error } = await supabase.from('clients').insert(clientRecords)

    if (error) throw new Error(error.message)

    return { clientsCreated: clientRecords.length, delegatesCreated: 0 }
  }

  const importDelegates = async (delegatePreview: ImportPreview<DelegateImportData>) => {
    const rowsToImport = delegatePreview.rows.filter((row) => row.willImport)

    if (rowsToImport.length === 0) {
      return { clientsCreated: 0, delegatesCreated: 0 }
    }

    const createdClientIds = new Map<string, string>()
    const createdClientIdsForRollback: string[] = []
    const missingClientRecords = buildMissingClientInsertRecords(
      rowsToImport,
      organisationId,
      userId
    )

    if (missingClientRecords.length > 0) {
      const { data, error } = await supabase
        .from('clients')
        .insert(missingClientRecords)
        .select('id, company, name')

      if (error) throw new Error(error.message)

      ;(data || []).forEach((client) => {
        createdClientIds.set(normalizeMatch(client.company), client.id)
        createdClientIds.set(normalizeMatch(client.name), client.id)
        createdClientIdsForRollback.push(client.id)
      })
    }

    const { error } = await supabase.from('delegates').insert(
      rowsToImport.map((row) => {
        const clientId = resolveImportedDelegateClientId(row.data, createdClientIds)

        return {
          organisation_id: organisationId,
          client_id: clientId,
          booking_id: null,
          full_name: row.data.full_name,
          email: row.data.email || null,
          phone: row.data.phone || null,
          notes: row.data.notes || null,
        }
      })
    )

    if (error) {
      if (createdClientIdsForRollback.length > 0) {
        await supabase
          .from('clients')
          .delete()
          .eq('organisation_id', organisationId)
          .in('id', createdClientIdsForRollback)
      }

      throw new Error(error.message)
    }

    return {
      clientsCreated: missingClientRecords.length,
      delegatesCreated: rowsToImport.length,
    }
  }

  const confirmImport = async () => {
    if (!preview || !organisationId) return

    const confirmed = confirm(
      `Import ${preview.importableRows} ${mode === 'clients' ? 'clients' : 'delegates'}? Rows with errors are skipped. Likely duplicates may be skipped, while other warnings can still import.`
    )

    if (!confirmed) return

    setImporting(true)

    try {
      const importCounts =
        mode === 'clients'
          ? await importClients(preview as ImportPreview<ClientImportData>)
          : await importDelegates(preview as ImportPreview<DelegateImportData>)

      setResult({
        ...importCounts,
        duplicatesSkipped: preview.rows.filter(
          (row) =>
            !row.willImport &&
            row.warnings.some((warning) =>
              warning.toLowerCase().includes('already exists') ||
              warning.toLowerCase().includes('another row')
            )
        ).length,
        errorRowsSkipped: preview.errorRows,
      })

      await load()
      clearUpload()
    } catch (error: any) {
      alert(error.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const rowBadgeClass = (status: string) => {
    if (status === 'error') return 'bg-red-50 text-red-700 border-red-100'
    if (status === 'warning') return 'bg-amber-50 text-amber-700 border-amber-100'
    return 'bg-emerald-50 text-emerald-700 border-emerald-100'
  }

  if (loading) {
    return (
      <div className={panelClass}>
        <div className="p-5 text-sm text-slate-500">
          Loading import tools...
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <div className={`${panelClass} overflow-hidden`}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-5 lg:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Upload {'>'} Preview {'>'} Confirm {'>'} Results
            </p>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              Import clients and delegates from CSV
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Bring spreadsheet data into Hercules OS with validation first. Nothing is saved until you confirm the preview.
            </p>
          </div>

          <div className="flex flex-wrap items-start gap-2">
            <button
              className={buttonSecondary}
              onClick={() => downloadTemplate(clientCsvTemplate, 'hercules-clients-template.csv')}
            >
              Download client CSV template
            </button>

            <button
              className={buttonSecondary}
              onClick={() => downloadTemplate(delegateCsvTemplate, 'hercules-delegates-template.csv')}
            >
              Download delegate CSV template
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className={`${panelClass} xl:col-span-4 h-fit`}>
          <div className={panelHeaderClass}>
            <h2 className="text-sm font-semibold text-slate-950">
              1. Choose import type
            </h2>
          </div>

          <div className="p-5 grid gap-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === 'clients'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
                onClick={() => switchMode('clients')}
              >
                Import clients
              </button>

              <button
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  mode === 'delegates'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
                onClick={() => switchMode('delegates')}
              >
                Import delegates
              </button>
            </div>

            {mode === 'delegates' && (
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={createMissingClients}
                  onChange={(event) => setCreateMissingClients(event.target.checked)}
                />

                <span>
                  Create missing clients named in the CSV. Existing client matches stay limited to this organisation.
                </span>
              </label>
            )}

            <div>
              <label className="text-xs font-medium text-slate-500">
                CSV file
              </label>

              <input
                className={`${inputClass} mt-1 w-full`}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
              />

              {fileName && (
                <p className="mt-2 text-xs text-slate-500">
                  Selected: {fileName}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500">
              <p className="font-semibold text-slate-700">
                Current workspace data
              </p>

              <p className="mt-2">
                {clients.length} clients and {delegates.length} delegates will be checked for duplicates before import.
              </p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-8 grid gap-6">
          {result && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
              <p className="font-semibold">
                Import complete
              </p>

              <p className="mt-2">
                Clients created: {result.clientsCreated} · Delegates created: {result.delegatesCreated} · Duplicates skipped: {result.duplicatesSkipped} · Error rows skipped: {result.errorRowsSkipped}
              </p>
            </div>
          )}

          <div className={panelClass}>
            <div className={`${panelHeaderClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">
                  2. Preview
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Review every row before saving.
                </p>
              </div>

              <button
                className={buttonPrimary}
                onClick={confirmImport}
                disabled={!preview || preview.importableRows === 0 || importing}
              >
                {importing ? 'Importing...' : 'Confirm import'}
              </button>
            </div>

            {!preview ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-950">
                  No CSV uploaded yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Download a template, add your data, then upload it here.
                </p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-5 border-b border-slate-100">
                  <SummaryPill label="Rows" value={preview.totalRows} />
                  <SummaryPill label="Importing" value={preview.importableRows} tone="green" />
                  <SummaryPill label="Warnings" value={preview.warningRows} tone="amber" />
                  <SummaryPill label="Errors" value={preview.errorRows} tone="red" />
                  <SummaryPill label="Skipped" value={preview.skippedRows} />
                </div>

                {preview.missingHeaders.length > 0 && (
                  <div className="mx-5 mt-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    Missing required column: {preview.missingHeaders.join(', ')}
                  </div>
                )}

                {preview.duplicateHeaders.length > 0 && (
                  <div className="mx-5 mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                    Duplicate column headers found: {preview.duplicateHeaders.join(', ')}. The first matching column will be used.
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Row</th>
                        <th className="px-5 py-3">Record</th>
                        <th className="px-5 py-3">Contact</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Notes</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {preview.rows.map((row) => {
                        const data: any = row.data
                        const recordName =
                          mode === 'clients'
                            ? data.client_name || 'Unnamed client'
                            : data.full_name || 'Unnamed delegate'
                        const contact =
                          mode === 'clients'
                            ? data.email || data.primary_contact || 'No contact detail'
                            : data.email || data.clientPreview || 'No contact detail'

                        return (
                          <tr key={row.rowNumber} className="align-top">
                            <td className="px-5 py-4 text-slate-500">
                              {row.rowNumber}
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-950">
                                {recordName}
                              </p>

                              {mode === 'delegates' && (
                                <p className="mt-1 text-xs text-slate-500">
                                  {data.clientPreview}
                                </p>
                              )}
                            </td>

                            <td className="px-5 py-4 text-slate-600">
                              {contact}
                            </td>

                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${rowBadgeClass(row.status)}`}>
                                {row.willImport ? 'Will import' : row.status === 'error' ? 'Error' : 'Will skip'}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-xs leading-5 text-slate-500">
                              {[...row.errors, ...row.warnings].length > 0 ? (
                                <ul className="grid gap-1">
                                  {[...row.errors, ...row.warnings].map((message) => (
                                    <li key={message}>
                                      {message}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                'Ready'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {preview.rows.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-sm font-semibold text-slate-950">
                      No data rows found
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      The CSV has headers but no records to import.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500">
            <Link href="/dashboard/settings" className="font-semibold text-slate-700 hover:text-slate-950">
              Back to settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryPill({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: number
  tone?: 'slate' | 'green' | 'amber' | 'red'
}) {
  const toneClass = {
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  }[tone]

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-xs font-medium">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold">
        {value}
      </p>
    </div>
  )
}
