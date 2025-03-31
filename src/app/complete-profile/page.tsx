"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"

// Dynamically import the component to avoid SSR issues with useSearchParams
const MemberRegistrationForm = dynamic(() => import("@/components/member/member-registration-form"), { ssr: false })

// Loading component
function LoadingForm() {
  return (
    <div className="container max-w-3xl py-10">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando formulario de registro...</p>
      </div>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <div className="container max-w-3xl py-10">
      <Suspense fallback={<LoadingForm />}>
        <MemberRegistrationForm />
      </Suspense>
    </div>
  )
}