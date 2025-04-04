"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ProfileForm } from "@/components/profile-form"
import { Loader2 } from "lucide-react"

// Define types for checkout data
interface CheckoutSessionData {
  id: string
  status: string
  customer_id: string | null
  subscription_id: string | null
  payment_status: string
  subscription_status: string | null
  plan_type?: string
}

// Import the ProfileFormValues type from the ProfileForm component
// This avoids duplicating the schema definition
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

// Define a type for the processed data as a separate type (not extending ProfileFormValues)
// to avoid type conflicts with nullable fields
interface ProcessedMemberData {
  // Basic profile fields
  name: string
  apellido1: string
  apellido2?: string
  dni_pasaporte: string
  telefono: string | null  // Can be null in processed data
  fecha_nacimiento: string
  direccion: string
  direccion_extra?: string
  poblacion: string
  cp: string | null  // Can be null in processed data
  provincia: string
  pais: string
  nacionalidad: string
  es_socio_realmadrid: boolean
  num_socio?: string | null  // Changed to optional AND nullable to match usage
  socio_carnet_madridista: boolean
  num_carnet?: string | null  // Changed to optional AND nullable to match usage
  email_notifications: boolean
  marketing_emails: boolean
  
  // Additional fields
  id: string
  email: string | undefined
  created_at: string
  
  // Subscription fields
  subscription_status?: string
  subscription_plan?: string
  subscription_id?: string
  subscription_updated_at?: string
  stripe_customer_id?: string
}

export default function MemberRegistrationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutSessionData | null>(null)

  useEffect(() => {
    async function checkUserAndSession() {
      try {
        // Get the current user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError || !userData.user) {
          console.error("Authentication error:", userError)
          router.push("/login?redirect=/complete-profile" + (sessionId ? `?session_id=${sessionId}` : ""))
          return
        }

        const userId = userData.user.id

        // Check if the user already has a profile in the miembros table
        const { data: memberData, error: memberError } = await supabase
          .from("miembros")
          .select("*")
          .eq("id", userId)
          .maybeSingle()

        if (memberError && memberError.code !== "PGRST116") {
          console.error("Error checking for existing profile:", memberError)
          setError("Error checking for existing profile. Please try again.")
          setLoading(false)
          return
        }

        // If user already has a profile
        if (memberData) {
          // If there's a session_id, we need to update the profile with subscription info
          if (sessionId) {
            try {
              // Fetch checkout session data
              const response = await fetch(`/api/checkout/session?session_id=${sessionId}`)
              if (!response.ok) {
                throw new Error(`Failed to fetch session: ${response.statusText}`)
              }
              
              const sessionData = await response.json()
              setCheckoutData(sessionData.session)
              
              // Update the member profile with subscription details
              if (sessionData.success) {
                const { error: updateError } = await supabase
                  .from("miembros")
                  .update({
                    subscription_status: sessionData.session.subscription_status || "active",
                    subscription_plan: sessionData.session.plan_type,
                    subscription_id: sessionData.session.subscription_id,
                    subscription_updated_at: new Date().toISOString(),
                    stripe_customer_id: sessionData.session.customer_id,
                  })
                  .eq("id", userId)

                if (updateError) {
                  console.error("Error updating subscription details:", updateError)
                  setError("Failed to update subscription details. Please contact support.")
                } else {
                  // Redirect to dashboard after successful update
                  router.push("/dashboard?subscription=success")
                }
              }
            } catch (sessionError) {
              console.error("Error processing session:", sessionError)
              setError("Failed to process subscription information. Please contact support.")
            }
          } else {
            // No session_id, just redirect to dashboard
            router.push("/dashboard")
          }
        } else {
          // No existing profile, continue with form
          if (sessionId) {
            // If there's a session_id, fetch the checkout data
            try {
              const response = await fetch(`/api/checkout/session?session_id=${sessionId}`)
              if (!response.ok) {
                throw new Error(`Failed to fetch session: ${response.statusText}`)
              }
              
              const sessionData = await response.json()
              setCheckoutData(sessionData.session)
            } catch (sessionError) {
              console.error("Error fetching session:", sessionError)
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
  }, [router, sessionId])

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
        
        // Handle fields that can be null
        telefono: formData.telefono || null,
        cp: formData.cp || null,
        
        // For optional fields that can also be null, use undefined instead of null
        // when the condition isn't met (this fixes the type error)
        num_socio: formData.es_socio_realmadrid ? formData.num_socio : undefined,
        num_carnet: formData.socio_carnet_madridista ? formData.num_carnet : undefined,
        
        // Add user ID and email
        id: userData.user.id,
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
      }

      // Insert the new member profile
      const { error: insertError } = await supabase
        .from("miembros")
        .insert(processedData)

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

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <div className="text-red-500 mx-auto h-12 w-12">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 font-medium">
              ¡Tu pago ha sido procesado correctamente! Por favor, completa tu perfil para activar tu membresía.
            </p>
          </div>
        )}
        <ProfileForm onSubmit={handleProfileSubmit} />
      </div>
    </div>
  )
}