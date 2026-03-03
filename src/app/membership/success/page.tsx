// app/membership/success/page.tsx
// This page is the post-payment success landing page.
// With RedSys, the payment is processed inline on the membership page,
// and the user is redirected here on success.
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { getLatestSubscriptionByUserId } from "@/lib/data/subscription"
import { Suspense } from "react"

function SuccessContent() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const verifyMembership = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError || !userData.user) {
          console.error("Error fetching user data:", userError)
          router.push("/login")
          return
        }

        const { data: subscriptionData, error: subscriptionError } = await getLatestSubscriptionByUserId(
          supabase,
          userData.user.id,
        )

        if (subscriptionError) {
          console.error("Error checking subscription:", subscriptionError)
          setError("Error al verificar tu estado de suscripcion. Contacta con soporte.")
          setLoading(false)
          return
        }

        if (!subscriptionData) {
          router.push("/complete-profile")
          return
        }

        if (subscriptionData.status !== "active") {
          console.log("Subscription found but not active:", subscriptionData.status)
        }

        setLoading(false)
      } catch (err) {
        console.error("Error verifying membership:", err)
        setError(err instanceof Error ? err.message : "Error inesperado")
        setLoading(false)
      }
    }

    verifyMembership()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto">
            <p className="mt-4 text-gray-600">Procesando tu suscripcion...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-red-600">Error en el proceso</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{error}</p>
          <div className="mt-6">
            <Link href="/membership">
              <Button className="w-full bg-primary hover:bg-secondary">Volver a intentar</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-md">
        <svg
          className="mx-auto h-16 w-16 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-primary">Suscripcion exitosa</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Gracias por unirte a la Pena Lorenzo Sanz. Tu suscripcion ha sido procesada correctamente.
        </p>
        <p className="mt-4 text-center text-sm text-gray-600">
          Ahora puedes acceder a todos los beneficios exclusivos para socios desde tu panel de control.
        </p>
        <div className="mt-6 space-y-4">
          <Link href="/dashboard">
            <Button className="w-full bg-primary hover:bg-secondary">Ir al panel de socio</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white">
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}