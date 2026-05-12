'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams } from 'next/navigation'

export default function VerifyCertificatePage() {
  const params = useParams()
  const [certificate, setCertificate] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verify()
  }, [])

  const verify = async () => {
    const { data, error } = await supabase.rpc(
      'verify_certificate',
      {
        v_verification_id: params.id,
      }
    )

    if (error) {
      console.error(error)
    }

    if (data && data.length > 0) {
      setCertificate(data[0])
    }

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-sm border">
          Checking certificate...
        </div>
      </div>
    )
  }

  if (!certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-md">
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-full w-fit mb-6">
            Not Found
          </div>

          <h1 className="text-2xl font-bold">
            Certificate not found
          </h1>

          <p className="text-gray-500 mt-2">
            This certificate could not be verified. Please check the certificate number or contact the training provider.
          </p>
        </div>
      </div>
    )
  }

  const isRevoked = certificate.status === 'revoked'
  const isExpired =
    certificate.expiry_date &&
    new Date(certificate.expiry_date) < new Date()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">

      <div className="bg-white p-8 rounded-2xl shadow-sm border max-w-lg w-full">

        <div
          className={`px-4 py-2 rounded-full w-fit mb-6 ${
            isRevoked
              ? 'bg-red-100 text-red-700'
              : isExpired
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {isRevoked
            ? 'Certificate Revoked'
            : isExpired
            ? 'Certificate Expired'
            : 'Verified Certificate'}
        </div>

        <h1 className="text-3xl font-bold">
          {certificate.learner_name}
        </h1>

        <p className="text-gray-500 mt-2">
          {certificate.course_name}
        </p>

        <div className="mt-6 space-y-3 text-gray-700">

          <div className="border-t pt-4">
            <p className="text-sm text-gray-500">
              Certificate Number
            </p>

            <p className="font-medium">
              {certificate.certificate_number}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Issue Date
            </p>

            <p className="font-medium">
              {certificate.issue_date}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Expiry Date
            </p>

            <p className="font-medium">
              {certificate.expiry_date}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Status
            </p>

            <p className="font-medium capitalize">
              {certificate.status}
            </p>
          </div>

        </div>

        <div className="mt-8 bg-gray-50 p-4 rounded-xl text-sm text-gray-600">
          This page confirms whether the certificate exists in the Hercules OS verification system.
        </div>

      </div>

    </div>
  )
}