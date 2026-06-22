'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { getOrCreateAccount } from '@/lib/account'
import AuthGuard from './AuthGuard'

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  Award,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Inbox,
  BookOpen,
  GraduationCap,
  BarChart3,
  Upload,
  ListChecks,
  RefreshCw,
} from 'lucide-react'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/requests',
    label: 'Requests',
    icon: Inbox,
    showRequestBadge: true,
  },
  {
    href: '/dashboard/clients',
    label: 'Clients',
    icon: Users,
  },
  {
    href: '/dashboard/delegates',
    label: 'Delegates',
    icon: GraduationCap,
  },
  {
    href: '/dashboard/courses',
    label: 'Courses',
    icon: BookOpen,
  },
  {
    href: '/dashboard/trainers',
    label: 'Trainers',
    icon: UserCog,
  },
  {
    href: '/dashboard/bookings',
    label: 'Bookings',
    icon: CalendarDays,
  },
  {
    href: '/dashboard/calendar',
    label: 'Calendar',
    icon: CalendarDays,
  },
  {
    href: '/dashboard/invoices',
    label: 'Invoices',
    icon: Receipt,
  },
  {
    href: '/dashboard/certificates',
    label: 'Certificates',
    icon: Award,
  },
  {
    href: '/dashboard/renewals',
    label: 'Renewals',
    icon: RefreshCw,
  },
  {
    href: '/dashboard/reports',
    label: 'Reports',
    icon: BarChart3,
  },
  {
    href: '/dashboard/import',
    label: 'Import',
    icon: Upload,
  },
  {
    href: '/dashboard/setup',
    label: 'Setup',
    icon: ListChecks,
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
  },
]

const pageCopy: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Operations Dashboard',
    subtitle: 'Your training business command centre.',
  },
  '/dashboard/requests': {
    title: 'Training Requests',
    subtitle: 'Review and convert public enquiries into bookings.',
  },
  '/dashboard/clients': {
    title: 'Clients',
    subtitle: 'Manage organisations, contacts and client history.',
  },
  '/dashboard/delegates': {
    title: 'Delegates',
    subtitle: 'Track learners, certificates and client links.',
  },
  '/dashboard/courses': {
    title: 'Courses',
    subtitle: 'Manage course templates, pricing and training details.',
  },
  '/dashboard/trainers': {
    title: 'Trainers',
    subtitle: 'Manage trainers, assignments and delivery capacity.',
  },
  '/dashboard/bookings': {
    title: 'Bookings',
    subtitle: 'Schedule private training and public open courses.',
  },
  '/dashboard/calendar': {
    title: 'Calendar',
    subtitle: 'View your training schedule at a glance.',
  },
  '/dashboard/invoices': {
    title: 'Invoices',
    subtitle: 'Manage billing, payments and invoice communication.',
  },
  '/dashboard/certificates': {
    title: 'Certificates',
    subtitle: 'Create, verify and send learner certificates.',
  },
  '/dashboard/renewals': {
    title: 'Renewals',
    subtitle: 'Turn expiring certificates into repeat bookings.',
  },
  '/dashboard/reports': {
    title: 'Reports',
    subtitle: 'Analyse performance and export custom reports.',
  },
  '/dashboard/import': {
    title: 'Import',
    subtitle: 'Bring clients and delegates in from CSV files.',
  },
  '/dashboard/setup': {
    title: 'Setup Guide',
    subtitle: 'Finish the essentials for a ready-to-use workspace.',
  },
  '/dashboard/settings': {
    title: 'Settings',
    subtitle: 'Control business preferences, templates and automation.',
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [newRequestCount, setNewRequestCount] = useState(0)
  const [organisationName, setOrganisationName] = useState('Hercules OS')

  const pageDetails = useMemo(() => {
    const exactMatch = pageCopy[pathname]

    if (exactMatch) return exactMatch

    const matchedPage = Object.entries(pageCopy)
      .filter(([path]) => path !== '/dashboard' && pathname.startsWith(path))
      .sort((a, b) => b[0].length - a[0].length)[0]

    return matchedPage?.[1] || pageCopy['/dashboard']
  }, [pathname])

  const activeSection = useMemo(() => {
    const activeItem = navItems
      .filter((item) =>
        item.href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(item.href)
      )
      .sort((a, b) => b.href.length - a.href.length)[0]

    return activeItem?.label || 'Dashboard'
  }, [pathname])

  const loadShellData = async () => {
    try {
      const profile = await getOrCreateAccount()

      const { count, error } = await supabase
        .from('training_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', profile.organisation_id)
        .eq('status', 'new')

      if (!error) {
        setNewRequestCount(count || 0)
      }

      const { data: organisationData } = await supabase
        .from('organisations')
        .select('name')
        .eq('id', profile.organisation_id)
        .single()

      if (organisationData?.name) {
        setOrganisationName(organisationData.name)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadShellData()
  }, [pathname])

  const handleLogout = async () => {
    const confirmLogout = confirm('Are you sure you want to log out?')

    if (!confirmLogout) return

    await supabase.auth.signOut()

    router.push('/login')
  }

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className={mobile ? 'flex flex-col gap-1.5 p-3' : 'flex flex-col gap-1.5 px-3 py-5'}>
      {navItems.map((item) => {
        const Icon = item.icon

        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

        const shouldShowBadge =
          item.showRequestBadge && newRequestCount > 0

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={
              mobile
                ? `group flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`
                : `group flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-[#172033] shadow-sm'
                      : 'text-slate-200 hover:bg-white/12 hover:text-white'
                  }`
            }
          >
            <span className="flex items-center gap-3">
              <span
                className={
                  mobile
                    ? `flex h-7 w-7 items-center justify-center rounded-md ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-white'
                      }`
                    : `flex h-7 w-7 items-center justify-center rounded-md ${
                        isActive
                          ? 'bg-[#24324a] text-white'
                          : 'bg-white/10 text-slate-300 group-hover:bg-white/16 group-hover:text-white'
                      }`
                }
              >
                <Icon size={15} />
              </span>

              {item.label}
            </span>

            {shouldShowBadge && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                {newRequestCount > 99 ? '99+' : newRequestCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
        <header className="lg:hidden h-14 bg-[#1e2d46] text-white border-b border-white/15 flex items-center justify-between px-4 sticky top-0 z-40">
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              Hercules OS
            </h1>

            <p className="text-[10px] text-slate-300">
              {activeSection}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {newRequestCount > 0 && (
              <Link
                href="/dashboard/requests"
                className="relative border border-white/20 rounded-md p-2 text-white hover:bg-white/10"
              >
                <Inbox size={19} />

                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  {newRequestCount > 99 ? '99+' : newRequestCount}
                </span>
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="border border-white/20 rounded-md p-2 text-white hover:bg-white/10"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white w-80 max-w-[85%] h-dvh max-h-dvh shadow-xl flex flex-col overflow-hidden">
              <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">
                    Hercules OS
                  </h1>

                  <p className="text-xs text-slate-500 mt-1">
                    Training operations platform
                  </p>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="border rounded-md p-2 hover:bg-slate-50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavLinks mobile />
              </div>

              <div className="shrink-0 p-3 border-t bg-white">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm font-medium hover:bg-slate-50 transition text-left"
                >
                  <LogOut size={17} />
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="relative flex">
          <aside className="hidden lg:flex w-64 bg-[#1e2d46] text-white border-r border-white/15 flex-col fixed left-0 top-0 h-screen overflow-hidden">
            <div className="px-5 py-6 border-b border-white/15">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white text-slate-950 flex items-center justify-center font-bold shadow-sm">
                  H
                </div>

                <div>
                  <h1 className="text-lg font-semibold tracking-tight">
                    Hercules OS
                  </h1>

                  <p className="text-xs text-slate-300 mt-0.5">
                    Training operations
                  </p>
                </div>
              </div>
            </div>

            <div className="px-3 pt-4">
              <div className="rounded-lg border border-white/15 bg-white/[0.08] px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-300">
                  Workspace
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {organisationName}
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavLinks />
            </div>

            <div className="mt-auto p-3 border-t border-white/15">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-white/20 bg-white/[0.08] text-sm font-semibold text-white hover:bg-white/16 hover:border-white/30 transition text-left"
              >
                <LogOut size={17} />
                Log out
              </button>
            </div>
          </aside>

          <div className="flex-1 lg:ml-64">
            <header className="hidden lg:flex h-[104px] bg-white/92 backdrop-blur-xl border-b border-slate-200/70 items-center justify-between px-10 sticky top-0 z-30">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {activeSection}
                  </p>

                  <span className="h-1 w-1 rounded-full bg-slate-300" />

                  <p className="text-xs text-slate-400">
                    {organisationName}
                  </p>
                </div>

                <h2 className="text-2xl font-semibold text-slate-950 mt-1">
                  {pageDetails.title}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {pageDetails.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/reports"
                  className="border border-slate-200 bg-white rounded-md px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-sm font-medium"
                >
                  <BarChart3 size={16} />
                  Reports
                </Link>

                {newRequestCount > 0 && (
                  <Link
                    href="/dashboard/requests"
                    className="relative border border-slate-200 bg-white rounded-md px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-sm font-medium"
                  >
                    <Inbox size={16} />

                    <span>
                      New requests
                    </span>

                    <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center">
                      {newRequestCount > 99 ? '99+' : newRequestCount}
                    </span>
                  </Link>
                )}

                <div className="w-9 h-9 rounded-md bg-slate-950 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                  H
                </div>
              </div>
            </header>

            <main className="relative p-4 sm:p-7 lg:p-10">
              <div className="mx-auto max-w-[1360px]">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}
