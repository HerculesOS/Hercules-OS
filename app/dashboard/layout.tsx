'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
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
} from 'lucide-react'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/clients',
    label: 'Clients',
    icon: Users,
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

  const handleLogout = async () => {
    const confirmLogout = confirm('Are you sure you want to log out?')

    if (!confirmLogout) return

    await supabase.auth.signOut()

    router.push('/login')
  }

  const NavLinks = () => (
    <nav className="flex flex-col gap-2 p-4">
      {navItems.map((item) => {
        const Icon = item.icon

        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 p-3 rounded-xl transition ${
              isActive
                ? 'bg-black text-white'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <Icon size={20} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100">
        {/* Mobile top bar */}
        <header className="lg:hidden h-16 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-bold">
              Hercules OS
            </h1>
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="border rounded-xl p-2"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40">
            <div className="bg-white w-80 max-w-[85%] min-h-screen shadow-xl flex flex-col">
              <div className="p-6 border-b flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">
                    Hercules OS
                  </h1>

                  <p className="text-sm text-gray-500 mt-1">
                    First Aid Business Platform
                  </p>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="border rounded-xl p-2"
                >
                  <X size={20} />
                </button>
              </div>

              <NavLinks />

              <div className="mt-auto p-4 border-t">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-gray-100 transition text-left"
                >
                  <LogOut size={20} />
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex w-72 bg-white border-r shadow-sm flex-col fixed left-0 top-0 h-screen">
            <div className="p-6 border-b">
              <h1 className="text-2xl font-bold">
                Hercules OS
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                First Aid Business Platform
              </p>
            </div>

            <NavLinks />

            <div className="mt-auto p-4 border-t">
              <div className="bg-gray-100 rounded-xl p-4 mb-4">
                <p className="font-semibold">
                  Hercules OS
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Manage training, invoices and certificates in one place.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-xl border hover:bg-gray-100 transition text-left"
              >
                <LogOut size={20} />
                Log out
              </button>
            </div>
          </aside>

          {/* Main area */}
          <div className="flex-1 lg:ml-72">
            {/* Desktop topbar */}
            <header className="hidden lg:flex h-20 bg-white border-b items-center justify-between px-8 sticky top-0 z-30">
              <div>
                <h2 className="text-2xl font-bold">
                  Operations Dashboard
                </h2>
              </div>

              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
                H
              </div>
            </header>

            <main className="p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
}