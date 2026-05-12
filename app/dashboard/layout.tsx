import Link from 'next/link'

import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Receipt,
  Award,
  UserCog,
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-72 bg-white border-r shadow-sm flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold">
            Hercules OS
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            First Aid Business Platform
          </p>
        </div>

        <nav className="flex flex-col gap-2 p-4">
          <Link href="/dashboard" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition">
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          <Link href="/dashboard/clients" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition">
            <Users size={20} />
            Clients
          </Link>

          <Link href="/dashboard/trainers" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition">
            <UserCog size={20} />
            Trainers
          </Link>

          <Link href="/dashboard/bookings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition">
            <CalendarDays size={20} />
            Bookings
          </Link>

          <Link href="/dashboard/calendar" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition">
            <CalendarDays size={20} />
            Calendar
          </Link>

          <Link href="/dashboard/invoices" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition">
            <Receipt size={20} />
            Invoices
          </Link>

          <Link href="/dashboard/certificates" className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition">
            <Award size={20} />
            Certificates
          </Link>
        </nav>

        <div className="mt-auto p-4 border-t">
          <div className="bg-gray-100 rounded-xl p-4">
            <p className="font-semibold">
              Hercules OS
            </p>

            <p className="text-sm text-gray-500 mt-1">
              Manage training, invoices and certificates in one place.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b flex items-center justify-between px-8">
          <div>
            <h2 className="text-2xl font-bold">
              Operations Dashboard
            </h2>
          </div>

          <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold">
            H
          </div>
        </header>

        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  )
}