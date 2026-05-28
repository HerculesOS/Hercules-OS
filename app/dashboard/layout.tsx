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
  Sparkles,
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
    href: '/dashboard/reports',
    label: 'Reports',
    icon: BarChart3,
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
  '/dashboard/reports': {
    title: 'Reports',
    subtitle: 'Analyse performance and export custom reports.',
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
    <nav className={mobile ? 'flex flex-col gap-1 p-3' : 'flex flex-col gap-1 px-3 py-4'}>
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
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                : `group flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
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
                          ? 'bg-slate-950 text-white'
                          : 'bg-slate-900 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
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
      <div className="min-h-screen bg-slate-100 text-slate-950">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-24 left-64 h-80 w-80 rounded-full bg-slate-300/30 blur-3xl" />
          <div className="absolute top-32 right-0 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-purple-200/20 blur-3xl" />
        </div>

        <header className="lg:hidden h-14 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-40">
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              Hercules OS
            </h1>

            <p className="text-[10px] text-slate-400">
              {activeSection}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {newRequestCount > 0 && (
              <Link
                href="/dashboard/requests"
                className="relative border border-slate-700 rounded-md p-2 hover:bg-slate-900"
              >
                <Inbox size={19} />

                <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  {newRequestCount > 99 ? '99+' : newRequestCount}
                </span>
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="border border-slate-700 rounded-md p-2 hover:bg-slate-900"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white w-80 max-w-[85%] min-h-screen shadow-xl flex flex-col">
              <div className="px-5 py-4 border-b flex items-start justify-between">
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

              <NavLinks mobile />

              <div className="mt-auto p-3 border-t">
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
          <aside className="hidden lg:flex w-68 bg-slate-950 text-white border-r border-slate-900 flex-col fixed left-0 top-0 h-screen overflow-y-auto">
            <div className="px-5 py-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-white text-slate-950 flex items-center justify-center font-bold shadow-sm">
                  H
                </div>

                <div>
                  <h1 className="text-lg font-semibold tracking-tight">
                    Hercules OS
                  </h1>

                  <p className="text-xs text-slate-400 mt-0.5">
                    Operations suite
                  </p>
                </div>
              </div>
            </div>

            <div className="px-3 pt-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Workspace
                </p>

                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {organisationName}
                </p>
              </div>
            </div>

            <NavLinks />

            <div className="mt-auto p-3 border-t border-slate-800">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg p-3 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-slate-300" />

                  <p className="text-sm font-semibold text-white">
                    Intelligence layer
                  </p>
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-5">
                  Reports, certificates, invoices and bookings working together.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-800 text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white transition text-left"
              >
                <LogOut size={17} />
                Log out
              </button>
            </div>
          </aside>

          <div className="flex-1 lg:ml-68">
            <header className="hidden lg:flex h-20 bg-white/85 backdrop-blur-xl border-b border-slate-200 items-center justify-between px-6 sticky top-0 z-30">
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

                <h2 className="text-xl font-semibold tracking-tight text-slate-950 mt-1">
                  {pageDetails.title}
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  {pageDetails.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/reports"
                  className="border border-slate-200 rounded-md px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-sm font-medium"
                >
                  <BarChart3 size={16} />
                  Reports
                </Link>

                {newRequestCount > 0 && (
                  <Link
                    href="/dashboard/requests"
                    className="relative border border-slate-200 rounded-md px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-sm font-medium"
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

            <main className="relative p-4 sm:p-5 lg:p-6">
              <div className="mx-auto max-w-[1500px]">
                <div className="rounded-xl border border-white/70 bg-white/55 p-3 shadow-sm backdrop-blur-sm sm:p-4 lg:p-5">
                  {children}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}