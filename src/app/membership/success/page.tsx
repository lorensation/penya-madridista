"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { Suspense } from "react"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirectToProfile, setRedirectToProfile] = useState(false)

  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    const processCheckoutSuccess = async () => {
      try {
        const sessionId = searchParams.get("session_id")

        if (!sessionId) {
          console.error("No session_id found in URL parameters")
          setError("No session ID found. Please contact support.")
          setLoading(false)
          return
        }

        // Get the user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error("Error fetching user data:", userError)
          setError("Failed to verify user. Please contact support.")
          setLoading(false)
          return
        }
        
        if (!userData.user) {
          console.error("No user found in session")
          router.push("/login")
          return
        }

        console.log("User authenticated:", userData.user.id)

        // Fetch the session details from Stripe via our API
        let sessionData
        try {
          const response = await fetch(`/api/verify-checkout-session?session_id=${sessionId}`)
          
          if (!response.ok) {
            throw new Error(`Failed to fetch session: ${response.statusText}`)
          }
          
          sessionData = await response.json()
          console.log("Retrieved session data from Stripe:", sessionData)
          
          if (!sessionData || !sessionData.session) {
            throw new Error("Invalid session data returned from API")
          }
        } catch (stripeError) {
          console.error("Error fetching Stripe session:", stripeError)
          setError("Failed to verify payment status. Please contact support.")
          setLoading(false)
          return
        }

        // Check if the user already has a member profile
        // Note: Using 'id' column instead of 'auth_id'
        const { data: memberData, error: memberError } = await supabase
          .from("miembros")
          .select("id, user_uuid")
          .eq("id", userData.user.id)  // Using 'id' instead of 'auth_id'
          .single()

        if (memberError) {
          // Only treat as an error if it's not the "no rows returned" error
          if (memberError.code !== "PGRST116") {
            console.error("Error checking member profile:", memberError)
            setError("Failed to verify member status. Please contact support.")
            setLoading(false)
            return
          }
          
          console.log("No member profile found, will redirect to complete profile")
          setRedirectToProfile(true)
          setLoading(false)
          return
        }

        console.log("Member profile found:", memberData)

        // Check if we have session data in our database
        const { data: checkoutData, error: checkoutError } = await supabase
          .from("checkout_sessions")
          .select("plan_type, subscription_id, customer_id, subscription_status")
          .eq("session_id", sessionId)
          .single()

        if (checkoutError) {
          console.error("Error fetching checkout session data:", checkoutError)
          
          // If the error is "no rows returned", we need to wait for the webhook to process
          if (checkoutError.code === "PGRST116") {
            setError("Your payment is being processed. Please wait a moment and refresh the page.")
          } else {
            setError("Failed to retrieve subscription details. Please contact support.")
          }
          
          setLoading(false)
          return
        }

        if (!checkoutData) {
          console.error("No checkout data found for session:", sessionId)
          setError("Failed to retrieve subscription details. Please contact support.")
          setLoading(false)
          return
        }

        console.log("Checkout session data found:", checkoutData)

        // Member profile exists, update it with subscription details
        // Note: Using 'id' column instead of 'auth_id'
        const { error: updateError } = await supabase
          .from("miembros")
          .update({
            subscription_status: checkoutData.subscription_status || "active",
            subscription_plan: checkoutData.plan_type,
            subscription_id: checkoutData.subscription_id,
            subscription_updated_at: new Date().toISOString(),
            stripe_customer_id: checkoutData.customer_id,
          })
          .eq("id", userData.user.id)  // Using 'id' instead of 'auth_id'

        if (updateError) {
          console.error("Error updating member profile:", updateError)
          setError("Failed to update subscription details. Please contact support.")
          setLoading(false)
          return
        }

        console.log("Successfully updated member profile with subscription details")
        setLoading(false)
      } catch (error: unknown) {
        console.error("Error processing subscription:", error)
        setError(error instanceof Error ? error.message : "Failed to process subscription")
        setLoading(false)
      }
    }

    processCheckoutSuccess()
  }, [searchParams, router, supabase])

  useEffect(() => {
    const redirectToProfileAsync = async () => {
      if (redirectToProfile) {
        const sessionId = searchParams.get("session_id")
        // Get the user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error("Error fetching user data:", userError)
          return
        }

        const userId = userData?.user?.id
        router.push(`/complete-profile?session_id=${sessionId}&userId=${userId}`)
      }
    }

    redirectToProfileAsync()
  }, [redirectToProfile, router, searchParams, supabase])

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