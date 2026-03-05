//app/complete-profile/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { resolveMembershipRedirectPayment } from "@/app/actions/payment"
import { sendWelcomeMemberEmail } from "@/app/actions/welcome-member-email"
import { ProfileForm } from "@/components/profile-form"
import { Loader2 } from "lucide-react"
import { Suspense } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

// Define types for checkout data
interface CheckoutSessionData {
  id: string
  status: string
  redsys_token?: string | null
  redsys_token_expiry?: string | null
  cof_txn_id?: string | null
  payment_status: string
  subscription_status: string | null
  plan_type?: string
  payment_type?: string // monthly / annual / decade
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
  ni_socio_ni_carnet: boolean
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

  // User identification fields
  id: string
  user_uuid: string
  email: string | undefined
  created_at: string
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

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function toNullableNumericValue(value?: string): number | null {
  if (!value) {
    return null
  }

  if (!/^\d+$/.test(value)) {
    throw new Error("Valor numerico invalido")
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function CompleteProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const userId = searchParams.get("userId")
  const redsysOrder = searchParams.get("order") || searchParams.get("Ds_Order")
  const dsMerchantParameters = searchParams.get("Ds_MerchantParameters")
  const dsSignature = searchParams.get("Ds_Signature")
  // Get the adminInviteToken parameter
  const adminInviteToken = searchParams.get("admin_invite")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutSessionData | null>(null)
  const [authError, setAuthError] = useState<boolean>(false)

  const [missingSessionId, setMissingSessionId] = useState<boolean>(
    !sessionId && !adminInviteToken && !redsysOrder,
  )

  useEffect(() => {
    // If there's no payment/order reference or admin invite, we shouldn't be on this page
    if (!sessionId && !adminInviteToken && !redsysOrder) {
      setLoading(false)
      setMissingSessionId(true)
      return
    }

    async function initializeProfileForm() {
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

        // If there's an admin invite token, validate it
        if (adminInviteToken) {
          try {
            const { data: inviteData, error: inviteError } = await supabase
              .from("member_invites")
              .select("*")
              .eq("token", adminInviteToken)
              .eq("user_id", currentUserId)
              .single()

            if (inviteError || !inviteData) {
              console.error("Invite validation error:", inviteError)
              setError("Invitación no válida o expirada.")
              setLoading(false)
              return
            }

            // Check if the invitation has expired
            const expiryDate = new Date(inviteData.expires_at)
            if (expiryDate < new Date()) {
              console.error("Invite expired")
              setError("La invitación ha expirado.")
              setLoading(false)
              return
            }

            // Set the admin invite data to use when creating the member profile
            setCheckoutData({
              id: "admin_invite",
              status: "complete",
              redsys_token: null,
              redsys_token_expiry: null,
              cof_txn_id: null,
              payment_status: "free",
              subscription_status: "active",
              plan_type: "infinite",
              payment_type: "decade",
              last_four: null,
            })

            setLoading(false)
            return
          } catch (inviteValidationError) {
            console.error("Error validating invite:", inviteValidationError)
            setError("Error al validar la invitación.")
            setLoading(false)
            return
          }
        }

        if (redsysOrder) {
          const maxAttempts = 8
          const retryDelayMs = 1200

          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const resolution = await resolveMembershipRedirectPayment(
              redsysOrder,
              dsMerchantParameters,
              dsSignature,
            )

            if (!resolution.success) {
              setError("No se pudo validar el pago con Redsys.")
              setLoading(false)
              return
            }

            if (resolution.status === "authorized" && resolution.checkoutData) {
              setCheckoutData({
                id: resolution.checkoutData.id,
                status: "complete",
                redsys_token: resolution.checkoutData.redsys_token,
                redsys_token_expiry: resolution.checkoutData.redsys_token_expiry,
                cof_txn_id: resolution.checkoutData.cof_txn_id,
                payment_status: resolution.checkoutData.payment_status,
                subscription_status: resolution.checkoutData.subscription_status,
                plan_type: resolution.checkoutData.plan_type,
                payment_type: resolution.checkoutData.payment_type,
                last_four: resolution.checkoutData.last_four,
              })
              setLoading(false)
              return
            }

            if (resolution.status === "denied") {
              setError("El pago no se ha autorizado. Vuelve a intentar la suscripcion.")
              setLoading(false)
              return
            }

            if (resolution.status === "not_found") {
              if (attempt < maxAttempts) {
                await sleep(retryDelayMs)
                continue
              }

              setError("No se encontro la transaccion de pago asociada.")
              setLoading(false)
              return
            }

            // pending/error fallback
            if (attempt < maxAttempts) {
              await sleep(retryDelayMs)
              continue
            }

            setError("El pago aun se esta procesando. Recarga la pagina en unos segundos.")
            setLoading(false)
            return
          }
        }

        // If there's a session_id (legacy flow), look up the payment from our DB
        if (sessionId) {
          try {
            // Try to find a completed payment transaction for this user
            const { data: txnData, error: txnError } = await supabase
              .from("payment_transactions")
              .select("id, redsys_order, redsys_token, redsys_token_expiry, cof_txn_id, status, context, amount_cents, last_four, metadata")
              .eq("member_id", currentUserId)
              .eq("status", "authorized")
              .eq("context", "membership")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle()

            if (txnData && !txnError) {
              const meta = txnData.metadata as Record<string, unknown> | null
              setCheckoutData({
                id: txnData.redsys_order || sessionId,
                status: "complete",
                redsys_token: txnData.redsys_token,
                redsys_token_expiry: txnData.redsys_token_expiry,
                cof_txn_id: txnData.cof_txn_id,
                payment_status: "paid",
                subscription_status: "active",
                plan_type: (meta?.planType as string) || "over25",
                payment_type: (meta?.interval as string) || "monthly",
                last_four: txnData.last_four,
              })
            } else {
              console.warn("No authorized membership payment found for user:", currentUserId)
              // Continue without checkout data — profile can still be created
            }
          } catch (sessionError) {
            console.error("Error looking up payment transaction:", sessionError)
            // Continue anyway, we'll just not have the checkout data
          }
        }

        setLoading(false)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
        console.error("Error in profile setup:", errorMessage)
        setError("An unexpected error occurred. Please try again.")
        setLoading(false)
      }
    }

    initializeProfileForm()
  }, [router, sessionId, userId, adminInviteToken, redsysOrder, dsMerchantParameters, dsSignature])

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

        // Strict numeric conversions after schema validation
        telefono: toNullableNumericValue(formData.telefono),
        cp: toNullableNumericValue(formData.cp),
        num_socio:
          formData.es_socio_realmadrid && formData.num_socio
            ? toNullableNumericValue(formData.num_socio)
            : null,
        num_carnet:
          formData.socio_carnet_madridista && formData.num_carnet
            ? toNullableNumericValue(formData.num_carnet)
            : null,

        // Add user ID and email
        id: userData.user.id, // This is the auth.uid() which maps to miembros.id
        user_uuid: userData.user.id, // This is for the public.users table
        email: userData.user.email,
        created_at: new Date().toISOString(),
      }

      // Insert the new member profile (fallback to update if already exists)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await supabase.from("miembros").insert(processedData as any)

      if (insertError) {
        const duplicateError = insertError.code === "23505" || insertError.message.toLowerCase().includes("duplicate")
        if (!duplicateError) {
          console.error("Error creating profile:", insertError)
          setError("Failed to create your profile. Please try again.")
          setLoading(false)
          return
        }

        // Avoid updating immutable identity fields during duplicate-profile recovery.
        const updatableData: Partial<ProcessedMemberData> = { ...processedData }
        delete updatableData.id
        delete updatableData.created_at
        const { error: updateError } = await supabase
          .from("miembros")
          .update({
            ...updatableData,
          } as Record<string, unknown>)
          .eq("user_uuid", userData.user.id)

        if (updateError) {
          console.error("Error updating existing profile:", updateError)
          setError("Failed to update your profile. Please try again.")
          setLoading(false)
          return
        }
      }

      // Update the users table to mark the user as a member
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          is_member: true,
          name: formData.name, // Also update the name to keep it in sync
          email_notifications: formData.email_notifications,
          marketing_emails: formData.marketing_emails,
          updated_at: new Date().toISOString()
        })
        .eq("id", userData.user.id)

      if (userUpdateError) {
        console.error("Error updating user membership status:", userUpdateError)
        // We'll continue even if this fails, as the member profile was created successfully
      }

      // If we have checkout data, create or update subscription record
      if (checkoutData && checkoutData.plan_type) {
        // Calculate end date based on payment type
        const startDate = new Date()
        const endDate = new Date()
        
        if (checkoutData.payment_type === 'annual') {
          endDate.setFullYear(endDate.getFullYear() + 1)
        } else if (checkoutData.payment_type === 'decade') {
          endDate.setFullYear(endDate.getFullYear() + 10)
        } else {
          endDate.setMonth(endDate.getMonth() + 1)
        }

        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .upsert({
            member_id: userData.user.id,
            plan_type: checkoutData.plan_type,
            payment_type: checkoutData.payment_type || "monthly",
            last_four: checkoutData.last_four ?? null,
            redsys_token: checkoutData.redsys_token ?? null,
            redsys_token_expiry: checkoutData.redsys_token_expiry ?? null,
            redsys_cof_txn_id: checkoutData.cof_txn_id ?? null,
            redsys_last_order: checkoutData.id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            status: checkoutData.subscription_status || "active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "member_id" })

        if (subscriptionError) {
          console.error("Error creating subscription record:", subscriptionError)
          // Continue anyway, as the member profile was created successfully
        }
      }

      // ── Send welcome email (fire-and-forget, never blocks redirect) ──
      try {
        const planLabels: Record<string, string> = {
          under25: "Joven",
          over25: "Adulto",
          family: "Familiar",
          infinite: "Invitación permanente",
        }
        const intervalLabels: Record<string, string> = {
          monthly: "Mensual",
          annual: "Anual",
          decade: "Década",
        }
        const planLabel = checkoutData?.plan_type
          ? planLabels[checkoutData.plan_type] ?? checkoutData.plan_type
          : undefined
        const intervalLabel = checkoutData?.payment_type
          ? intervalLabels[checkoutData.payment_type] ?? checkoutData.payment_type
          : undefined
        const planName =
          planLabel && intervalLabel ? `${planLabel} ${intervalLabel}` : planLabel

        await sendWelcomeMemberEmail({
          email: userData.user.email!,
          memberName: formData.name,
          userId: userData.user.id,
          planName: planName ?? undefined,
        })
      } catch (emailError) {
        // Non-critical — log but never block the user flow
        console.error("Welcome email failed (non-blocking):", emailError)
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

  
  // Read fecha_nacimiento from user metadata to pre-fill and lock
  const [metadataDob, setMetadataDob] = useState<string | null>(null)

  // Fetch DOB from metadata when user is available
  useEffect(() => {
    async function fetchDob() {
      const { data: userData } = await supabase.auth.getUser()
      const dob = userData?.user?.user_metadata?.fecha_nacimiento as string | undefined
      if (dob) {
        setMetadataDob(dob)
      }
    }
    fetchDob()
  }, [])

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

  if (missingSessionId) {
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
          <p className="mt-2 text-center text-sm text-gray-600">
            Falta el identificador de pago o invitación. Por favor, verifica el enlace.
          </p>
          <Button
            onClick={() => router.push("/")}
            className="mt-6 w-full"
          >
            Volver al Inicio
          </Button>
        </div>
      </div>
    )
  }

  if (authError) {
    // Get the admin invite token if it exists
    const adminInviteToken = searchParams.get("admin_invite")
    
    // Create return URL preserving whichever flow the user came from
    let returnUrl = `/complete-profile?session_id=${sessionId || ""}&userId=${userId || ""}`
    if (adminInviteToken) {
      returnUrl = `/complete-profile?admin_invite=${adminInviteToken}`
    } else if (redsysOrder) {
      returnUrl = `/complete-profile?order=${encodeURIComponent(redsysOrder)}&userId=${encodeURIComponent(userId || "")}`
    }
    
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
                `/login?returnUrl=${encodeURIComponent(returnUrl)}`
              )
            }
            className="mt-6 w-full hover:bg-white hover:text-primary hover:border hover:border-black"
            disabled={loading}
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
            className="mt-6 w-full bg-primary text-white py-2 px-4 rounded hover:bg-white hover:text-black hover:border hover:border-black transition-all"
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
              ¡Tu pago ha sido procesado correctamente! Por favor, completa tu perfil para activar tu suscripción.
            </AlertDescription>
          </Alert>
        )}
        <ProfileForm
          onSubmit={handleProfileSubmit}
          initialData={metadataDob ? { fecha_nacimiento: metadataDob } : undefined}
          lockedFields={metadataDob ? ["fecha_nacimiento"] : []}
        />
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
