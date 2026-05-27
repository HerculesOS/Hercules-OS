'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function DelegateProfilePage() {
  const params = useParams()

  return (
    <div>
      <Link
        href="/dashboard/delegates"
        className="text-sm text-gray-500 hover:text-black"
      >
        ← Back to delegates
      </Link>

      <div className="bg-white border rounded-2xl p-6 shadow-sm mt-6">
        <h1 className="text-4xl font-bold">
          Delegate Profile
        </h1>

        <p className="text-gray-500 mt-2">
          Delegate ID: {params.id as string}
        </p>

        <p className="text-gray-500 mt-6">
          Full delegate profile coming next.
        </p>
      </div>
    </div>
  )
}