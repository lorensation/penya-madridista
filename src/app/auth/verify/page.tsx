"use client"

import Link from "next/link"

export default function VerifyPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-center text-gray-700 mb-4">Verify Your Email</h2>
          <p className="text-gray-600 mb-6">
            We&apos;ve sent a verification link to your email. Please check your inbox and click on the link to verify
            your account.
          </p>
          <p className="text-gray-600">
            If you don&apos;t see the email, check your spam folder or{" "}
            <Link href="/auth/resend-verification" className="text-primary hover:underline">
              click here to resend
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}