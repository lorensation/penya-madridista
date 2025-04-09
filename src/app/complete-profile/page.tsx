"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { ProfileForm } from "@/components/profile-form"
import { Loader2 } from "lucide-react"
import { Suspense } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// Define types for checkout data
interface CheckoutSessionData {
  id: string
  status: string
  customer_id: string | null
  subscription_id: string | null
  payment_status: string
  subscription_status: string | null
  plan_type?: string
  last_four?: string | null
}

// Define types for form values
type ProfileFormValues = {
  name: string
  apellido1: string
  apellido2?: string
  dni_pasaporte: string
  telefono: string
  fecha_nacimiento: string
  direccion: string
  direccion_extra?: string
  poblacion: string
  cp: string
  provincia: string
  pais: string
  nacionalidad: string
  es_socio_realmadrid: boolean
  num_socio?: string
  socio_carnet_madridista: boolean
  num_carnet?: string
  email_notifications: boolean
  marketing_emails: boolean
}

// Define the processed data type including subscription fields
interface ProcessedMemberData {
  // Basic profile fields from form
  name: string
  apellido1: string
  apellido2?: string
  dni_pasaporte: string
  telefono: number | null // Changed to number to match DB
  fecha_nacimiento: string
  direccion: string
  direccion_extra?: string
  poblacion: string
  cp: number | null // Changed to number to match DB
  provincia: string
  pais: string
  nacionalidad: string
  es_socio_realmadrid: boolean
  socio_carnet_madridista: boolean
  num_socio?: number | null // Changed to number to match DB
  num_carnet?: number | null // Changed to number to match DB
  email_notifications: boolean
  marketing_emails: boolean

  // User identification fields
  id: string
  user_uuid: string
  email: string | undefined
  created_at: string

  // Subscription fields
  subscription_status?: string
  subscription_plan?: string
  subscription_id?: string
  subscription_updated_at?: string
  stripe_customer_id?: string
  last_four?: string | null
}

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

function CompleteProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const userId = searchParams.get("userId")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutSessionData | null>(null)
  const [authError, setAuthError] = useState<boolean>(false)

  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    async function checkUserAndSession() {
      try {
        // Get the current user
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError || !userData.user) {
          console.error("Authentication error:", userError)
          setAuthError(true)
          setLoading(false)
          return
        }

        // If userId is provided in URL and doesn't match current user, show auth error
        if (userId && userData.user.id !== userId) {
          console.error("User ID mismatch:", userId, userData.user.id)
          setAuthError(true)
          setLoading(false)
          return
        }

        const currentUserId = userData.user.id

        // Check if the user already has a profile in the miembros table
        const { data: memberData, error: memberError } = await supabase
          .from("miembros")
          .select("*")
          .eq("id", currentUserId)
          .maybeSingle()

        if (memberError && memberError.code !== "PGRST116") {
          console.error("Error checking for existing profile:", memberError)
          setError("Error checking for existing profile. Please try again.")
          setLoading(false)
          return
        }

        // If user already has a profile
        if (memberData) {
          console.log("User already has a profile, redirecting to dashboard")

          // If there's a session_id, we need to update the profile with subscription info
          if (sessionId) {
            try {
              // Verify the checkout session
              const response = await fetch("/api/verify-checkout-session", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": currentUserId, // Add the user ID in the headers
                },
                body: JSON.stringify({
                  sessionId,
                  userId: currentUserId, // Also include it in the body for redundancy
                }),
              })

              if (!response.ok) {
                const errorData = await response.json()
                console.error("Checkout session verification failed:", errorData)

                // If the error is about missing user ID but we have the user ID, retry with explicit user ID
                if (errorData.error === "User ID not found in session" && currentUserId) {
                  setError("Retrying checkout verification with explicit user ID...")

                  try {
                    const retryResponse = await fetch("/api/verify-checkout-session", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        sessionId,
                        userId: currentUserId,
                        retry: true,
                      }),
                    })

                    if (retryResponse.ok) {
                      const sessionData = await retryResponse.json()
                      // Continue with the successful response
                      if (sessionData.status === "complete") {
                        setCheckoutData({
                          id: sessionId,
                          status: "complete",
                          customer_id: sessionData.customerId,
                          subscription_id: sessionData.subscriptionId,
                          payment_status: "paid",
                          subscription_status: "active",
                          //plan_type: sessionData.plan,
                          last_four: sessionData.lastFour,
                        })
                        setLoading(false)
                        return
                      }
                    } else {
                      throw new Error("Retry failed: " + (await retryResponse.json()).error || "Unknown error")
                    }
                  } catch (retryError) {
                    console.error("Retry error:", retryError)
                  }
                }

                throw new Error(errorData.error || "Failed to verify checkout session")
              }

              const sessionData = await response.json()

              // Update the member profile with subscription details
              if (sessionData.status === "complete") {
                const { error: updateError } = await supabase
                  .from("miembros")
                  .update({
                    subscription_status: "active",
                    subscription_plan: sessionData.plan,
                    subscription_id: sessionData.subscriptionId,
                    subscription_updated_at: new Date().toISOString(),
                    stripe_customer_id: sessionData.customerId,
                    last_four: sessionData.lastFour,
                  })
                  .eq("id", currentUserId)

                if (updateError) {
                  console.error("Error updating subscription details:", updateError)
                  setError("Failed to update subscription details. Please contact support.")
                } else {
                  // Redirect to dashboard after successful update
                  router.push("/dashboard?subscription=success")
                }
              } else {
                setError("Payment not completed. Please try again or contact support.")
                setLoading(false)
              }
            } catch (sessionError) {
              console.error("Error processing session:", sessionError)
              setError("Failed to process subscription information. Please contact support.")
              setLoading(false)
            }
          } else {
            // No session_id, just redirect to dashboard
            router.push("/dashboard")
          }
        } else {
          // No existing profile, continue with form
          if (sessionId) {
            // If there's a session_id, verify the checkout session
            try {
              const response = await fetch("/api/verify-checkout-session", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": currentUserId, // Add the user ID in the headers
                },
                body: JSON.stringify({
                  sessionId,
                  userId: currentUserId, // Also include it in the body for redundancy
                }),
              })

              if (!response.ok) {
                const errorData = await response.json()
                console.error("Checkout session verification failed:", errorData)

                // If the error is about missing user ID but we have the user ID, retry with explicit user ID
                if (errorData.error === "User ID not found in session" && currentUserId) {
                  setError("Retrying checkout verification with explicit user ID...")

                  try {
                    const retryResponse = await fetch("/api/verify-checkout-session", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        sessionId,
                        userId: currentUserId,
                        retry: true,
                      }),
                    })

                    if (retryResponse.ok) {
                      const sessionData = await retryResponse.json()
                      // Continue with the successful response
                      if (sessionData.status === "complete") {
                        setCheckoutData({
                          id: sessionId,
                          status: "complete",
                          customer_id: sessionData.customerId,
                          subscription_id: sessionData.subscriptionId,
                          payment_status: "paid",
                          subscription_status: "active",
                          //plan_type: sessionData.plan,
                          last_four: sessionData.lastFour,
                        })
                        setLoading(false)
                        return
                      }
                    } else {
                      throw new Error("Retry failed: " + (await retryResponse.json()).error || "Unknown error")
                    }
                  } catch (retryError) {
                    console.error("Retry error:", retryError)
                  }
                }

                throw new Error(errorData.error || "Failed to verify checkout session")
              }

              const sessionData = await response.json()

              if (sessionData.status === "complete") {
                setCheckoutData({
                  id: sessionId,
                  status: "complete",
                  customer_id: sessionData.customerId,
                  subscription_id: sessionData.subscriptionId,
                  payment_status: "paid",
                  subscription_status: "active",
                  //plan_type: sessionData.plan,
                  last_four: sessionData.lastFour,
                })
              } else {
                console.warn("Payment not completed:", sessionData.status)
                // Continue anyway, we'll just not have the checkout data
              }
            } catch (sessionError) {
              console.error("Error verifying session:", sessionError)
              // Continue anyway, we'll just not have the checkout data
            }
          }

          setLoading(false)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
        console.error("Error in profile setup:", errorMessage)
        setError("An unexpected error occurred. Please try again.")
        setLoading(false)
      }
    }

    checkUserAndSession()
  }, [router, sessionId, userId, supabase])

  const handleProfileSubmit = async (formData: ProfileFormValues) => {
    try {
      setLoading(true)

      // Get the current user
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error("User not authenticated")
      }

      // Prepare the member data with proper typing
      const processedData: ProcessedMemberData = {
        // Copy all the basic fields from formData
        name: formData.name,
        apellido1: formData.apellido1,
        apellido2: formData.apellido2,
        dni_pasaporte: formData.dni_pasaporte,
        fecha_nacimiento: formData.fecha_nacimiento,
        direccion: formData.direccion,
        direccion_extra: formData.direccion_extra,
        poblacion: formData.poblacion,
        provincia: formData.provincia,
        pais: formData.pais,
        nacionalidad: formData.nacionalidad,
        es_socio_realmadrid: formData.es_socio_realmadrid,
        socio_carnet_madridista: formData.socio_carnet_madridista,
        email_notifications: formData.email_notifications,
        marketing_emails: formData.marketing_emails,

        // Handle fields that need to be converted to numbers
        telefono: formData.telefono ? Number.parseInt(formData.telefono, 10) || null : null,
        cp: formData.cp ? Number.parseInt(formData.cp, 10) || null : null,
        num_socio:
          formData.es_socio_realmadrid && formData.num_socio ? Number.parseInt(formData.num_socio, 10) || null : null,
        num_carnet:
          formData.socio_carnet_madridista && formData.num_carnet
            ? Number.parseInt(formData.num_carnet, 10) || null
            : null,

        // Add user ID and email
        id: userData.user.id, // This is the auth.uid() which maps to miembros.id
        user_uuid: userData.user.id, // This is for the public.users table
        email: userData.user.email,
        created_at: new Date().toISOString(),
      }

      // If we have checkout data, add subscription details
      if (checkoutData) {
        processedData.subscription_status = checkoutData.subscription_status || "active"
        processedData.subscription_plan = checkoutData.plan_type
        processedData.subscription_id = checkoutData.subscription_id ?? undefined
        processedData.subscription_updated_at = new Date().toISOString()
        processedData.stripe_customer_id = checkoutData.customer_id ?? undefined
        processedData.last_four = checkoutData.last_four
      }

      // Insert the new member profile
      const { error: insertError } = await supabase.from("miembros").insert(processedData)

      if (insertError) {
        console.error("Error creating profile:", insertError)
        setError("Failed to create your profile. Please try again.")
        setLoading(false)
        return
      }

      // Redirect to dashboard
      router.push("/dashboard?profile=created")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      console.error("Error submitting profile:", errorMessage)
      setError("An error occurred while saving your profile. Please try again.")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Cargando tu perfil...</p>
        </div>
      </div>
    )
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 mx-auto h-12 w-12">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-red-600">Error de Autenticación</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Necesitas iniciar sesión para completar tu perfil.</p>
          <Button
            onClick={() =>
              router.push(
                `/login?returnUrl=${encodeURIComponent(`/complete-profile?session_id=${sessionId || ""}&userId=${userId || ""}`)}`,
              )
            }
            className="mt-6 w-full"
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 mx-auto h-12 w-12">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-red-600">Error</h2>
          <p className="mt-2 text-center text-sm text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-primary text-white py-2 px-4 rounded hover:bg-secondary"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Completa tu Perfil de Socio</h1>
        {checkoutData && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-700 font-medium">
              ¡Tu pago ha sido procesado correctamente! Por favor, completa tu perfil para activar tu membresía.
            </AlertDescription>
          </Alert>
        )}
        <ProfileForm onSubmit={handleProfileSubmit} />
      </div>
    </div>
  )
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<LoadingForm />}>
      <CompleteProfileContent />
    </Suspense>
  )
}