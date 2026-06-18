'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import {
  calculateSetupProgress,
  type SetupCounts,
} from '@/lib/setupProgress'

const emptyCounts: SetupCounts = {
  courseTemplates: 0,
  certificateTemplates: 0,
  emailTemplates: 0,
  clients: 0,
  delegates: 0,
  bookings: 0,
}

const countRows = async (table: string, organisationId: string) => {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)

  if (error) throw error

  return count || 0
}

export default function SetupPage() {
  const [organisation, setOrganisation] = useState<any>(null)
  const [counts, setCounts] = useState<SetupCounts>(emptyCounts)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const progress = useMemo(
    () => calculateSetupProgress(organisation, counts),
    [organisation, counts]
  )

  const load = async () => {
    try {
      setLoading(true)
      setErrorMessage('')

      const profile = await getOrCreateAccount()

      const [
        organisationResult,
        courseTemplates,
        certificateTemplates,
        emailTemplates,
        clients,
        delegates,
        bookings,
      ] = await Promise.all([
        supabase
          .from('organisations')
          .select('*')
          .eq('id', profile.organisation_id)
          .single(),
        countRows('course_templates', profile.organisation_id),
        countRows('certificate_templates', profile.organisation_id),
        countRows('email_templates', profile.organisation_id),
        countRows('clients', profile.organisation_id),
        countRows('delegates', profile.organisation_id),
        countRows('bookings', profile.organisation_id),
      ])

      if (organisationResult.error) throw organisationResult.error

      setOrganisation(organisationResult.data || null)
      setCounts({
        courseTemplates,
        certificateTemplates,
        emailTemplates,
        clients,
        delegates,
        bookings,
      })
    } catch (error: any) {
      console.error(error)
      setErrorMessage(error.message || 'Could not load setup progress.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading setup guide...
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {errorMessage}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_320px] lg:p-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles size={14} />
              First-use setup
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Get Hercules OS ready for your team.
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
              Work through the essentials once, then use the main CRM pages day to day.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={progress.steps.find((step) => !step.complete)?.href || '/dashboard'}
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:translate-y-0"
              >
                Continue setup
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm active:translate-y-0"
              >
                Back to dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">
              Setup progress
            </p>

            <div className="mt-5 flex items-end gap-2">
              <span className="text-5xl font-semibold tracking-tight text-slate-950">
                {progress.completedSteps}
              </span>

              <span className="pb-2 text-sm font-medium text-slate-500">
                of {progress.totalSteps} complete
              </span>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              {progress.complete
                ? 'Your workspace has the essentials in place.'
                : 'Complete the remaining steps before inviting wider beta use.'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {progress.steps.map((step, index) => {
          const Icon = step.complete ? CheckCircle2 : Circle

          return (
            <div
              key={step.key}
              className={`rounded-[22px] border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                step.complete
                  ? 'border-emerald-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${
                      step.complete
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Step {index + 1}
                    </p>

                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                      {step.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {step.description}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    step.complete
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {step.complete ? 'Done' : 'To do'}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href={step.href}
                  className={
                    step.complete
                      ? 'inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                      : 'inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
                  }
                >
                  {step.actionLabel}
                  <ArrowRight size={15} />
                </Link>

                {step.key === 'public-request-link' && organisation?.public_request_slug && (
                  <Link
                    href={`/request-training/${organisation.public_request_slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"
                  >
                    View public form
                    <ExternalLink size={14} />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </section>
    </div>
  )
}
