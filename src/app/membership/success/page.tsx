"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const updateSubscriptionStatus = async () => {
      try {
        const sessionId = searchParams.get("session_id")

        if (!sessionId) {
          router.push("/membership")
          return
        }

        // Get the user
        const { data: userData } = await supabase.auth.getUser()
        if (!userData.user) {
          router.push("/login")
          return
        }

        // Update the checkout session status
        await supabase
          .from("checkout_sessions")
          .update({ status: "completed" })
          .eq("session_id", sessionId)
          .eq("user_id", userData.user.id)

        // Update the user's subscription status in the profiles table
        const { data: checkoutData } = await supabase
          .from("checkout_sessions")
          .select("plan_type")
          .eq("session_id", sessionId)
          .single()

        if (checkoutData) {
          await supabase
            .from("profiles")
            .update({
              subscription_status: "active",
              subscription_plan: checkoutData.plan_type,
              subscription_updated_at: new Date().toISOString(),
            })
            .eq("id", userData.user.id)
        }

        setLoading(false)
      } catch (error: any) {
        console.error("Error updating subscription status:", error)
        setError(error.message || "Failed to process subscription")
        setLoading(false)
      }
    }

    updateSubscriptionStatus()
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Procesando tu suscripción...</p>
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
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-red-600">Error en el Proceso</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{error}</p>
          <div className="mt-6">
            <Link href="/membership">
              <Button className="w-full bg-primary hover:bg-secondary">Volver a Intentar</Button>
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
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-primary">¡Suscripción Exitosa!</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Gracias por unirte a la Peña Lorenzo Sanz. Tu suscripción ha sido procesada correctamente.
        </p>
        <p className="mt-4 text-center text-sm text-gray-600">
          Ahora puedes acceder a todos los beneficios exclusivos para socios desde tu panel de control.
        </p>
        <div className="mt-6 space-y-4">
          <Link href="/dashboard">
            <Button className="w-full bg-primary hover:bg-secondary">Ir al Panel de Socio</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-white">
              Volver al Inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

