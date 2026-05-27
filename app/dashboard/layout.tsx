'use client'

import { useEffect, useState } from 'react'
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
    href: '/dashboard/settings',
    label: 'Settings',
    icon: Settings,
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [newRequestCount, setNewRequestCount] = useState(0)

  const loadNewRequestCount = async () => {
    try {
      const profile = await getOrCreateAccount()

      const { count, error } = await supabase
        .from('training_requests')
        .select('*', { count: 'exact', head: true })
        .eq('organisation_id', profile.organisation_id)
        .eq('status', 'new')

      if (error) {
        console.error(error)
        return
      }

      setNewRequestCount(count || 0)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadNewRequestCount()
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
                ? `flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`
                : `flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition ${
                    isActive
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
            }
          >
            <span className="flex items-center gap-3">
              <Icon size={17} />
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
      <div className="min-h-screen bg-slate-50 text-slate-950">
        <header className="lg:hidden h-14 bg-slate-950 text-white border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-40">
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              Hercules OS
            </h1>
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
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/60">
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

        <div className="flex">
          <aside className="hidden lg:flex w-64 bg-slate-950 text-white border-r border-slate-900 flex-col fixed left-0 top-0 h-screen overflow-y-auto">
            <div className="px-5 py-5 border-b border-slate-800">
              <h1 className="text-lg font-semibold tracking-tight">
                Hercules OS
              </h1>

              <p className="text-xs text-slate-400 mt-1">
                Training operations platform
              </p>
            </div>

            <NavLinks />

            <div className="mt-auto p-3 border-t border-slate-800">
              <div className="bg-slate-900 border border-slate-800 rounded-md p-3 mb-3">
                <p className="text-sm font-semibold text-white">
                  Operations Suite
                </p>

                <p className="text-xs text-slate-400 mt-1 leading-5">
                  Manage clients, bookings, invoices and certificates.
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

          <div className="flex-1 lg:ml-64">
            <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-6 sticky top-0 z-30">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Operations Dashboard
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Manage your training business from one place
                </p>
              </div>

              <div className="flex items-center gap-3">
                {newRequestCount > 0 && (
                  <Link
                    href="/dashboard/requests"
                    className="relative border border-slate-200 rounded-md px-3 py-2 flex items-center gap-2 hover:bg-slate-50 text-sm"
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

                <div className="w-8 h-8 rounded-md bg-slate-950 text-white flex items-center justify-center text-sm font-semibold">
                  H
                </div>
              </div>
            </header>

            <main className="p-4 sm:p-5 lg:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}