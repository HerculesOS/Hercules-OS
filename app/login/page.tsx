'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!email || !password) {
      alert('Please enter your email and password')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      alert('Account created. Please check your email to confirm your signup.')
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please enter your email and password')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      alert(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-black text-white p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold">
            Hercules OS
          </h1>

          <p className="text-gray-300 mt-3 text-lg max-w-md">
            The operations platform for first aid training businesses.
          </p>
        </div>

        <div>
          <h2 className="text-5xl font-bold leading-tight max-w-xl">
            Manage clients, bookings, invoices and certificates in one place.
          </h2>

          <div className="grid grid-cols-2 gap-4 mt-10 max-w-xl">
            <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
              <p className="text-2xl font-bold">CRM</p>
              <p className="text-gray-300 text-sm mt-2">
                Store clients and training records.
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
              <p className="text-2xl font-bold">Bookings</p>
              <p className="text-gray-300 text-sm mt-2">
                Schedule and confirm training sessions.
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
              <p className="text-2xl font-bold">Invoices</p>
              <p className="text-gray-300 text-sm mt-2">
                Create, email and track invoices.
              </p>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
              <p className="text-2xl font-bold">Certificates</p>
              <p className="text-gray-300 text-sm mt-2">
                Issue QR-verifiable certificates.
              </p>
            </div>
          </div>
        </div>

        <p className="text-gray-400 text-sm">
          Built for training providers who want less admin and better control.
        </p>
      </div>

      {/* Login panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white border rounded-3xl shadow-sm p-8">
            <div className="mb-8">
              <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-bold text-xl mb-5">
                H
              </div>

              <h1 className="text-3xl font-bold">
                Welcome back
              </h1>

              <p className="text-gray-500 mt-2">
                Log in to manage your training business.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-gray-600">
                  Email address
                </label>

                <input
                  className="border p-3 rounded-xl w-full mt-1"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">
                  Password
                </label>

                <input
                  className="border p-3 rounded-xl w-full mt-1"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                className="bg-black text-white p-3 rounded-xl mt-2 disabled:bg-gray-400"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? 'Please wait...' : 'Log in'}
              </button>

              <button
                className="border p-3 rounded-xl disabled:bg-gray-100"
                onClick={handleSignUp}
                disabled={loading}
              >
                Create account
              </button>
            </div>

            <div className="mt-6 bg-gray-50 border rounded-2xl p-4 text-sm text-gray-600">
              New users may need to confirm their email before logging in.
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Hercules OS · First Aid Business Platform
          </p>
        </div>
      </div>

    </div>
  )
}