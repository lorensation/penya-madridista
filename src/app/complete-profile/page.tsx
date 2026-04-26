"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  completeMembershipOnboarding,
  resolveMembershipRedirectPayment,
} from "@/app/actions/payment"
import { sendWelcomeMemberEmail } from "@/app/actions/welcome-member-email"
import { ProfileForm } from "@/components/profile-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { resolveMembershipInterval } from "@/lib/redsys/config"

interface CheckoutSessionData {
  id: string
  status: string
  redsys_token?: string | null
  redsys_token_expiry?: string | null
  cof_txn_id?: string | null
  payment_status: string
  subscription_status: string | null
  plan_type?: string
  payment_type?: string
  last_four?: string | null
}

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

interface ProcessedMemberData {
  name: string
  apellido1: string
  apellido2?: string
  dni_pasaporte: string
  telefono: number | null
  fecha_nacimiento: string
  direccion: string
  direccion_extra?: string
  poblacion: string
  cp: number | null
  provincia: string
  pais: string
  nacionalidad: string
  es_socio_realmadrid: boolean
  socio_carnet_madridista: boolean
  num_socio?: number | null
  num_carnet?: number | null
  id: string
  user_uuid: string
  email: string | undefined
  created_at: string
}

function LoadingForm() {
  return (
    <div className="container max-w-3xl py-10">
      <div className="rounded-lg bg-white p-8 text-center shadow-md">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
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

function resolveCheckoutPaymentType(
  planType: string | undefined,
  paymentType?: string | null,
): string | null {
  if (!planType) {
    return null
  }

  if (planType === "infinite") {
    if (paymentType === "infinite" || paymentType === "decade") {
      return paymentType
    }

    return "decade"
  }

  return resolveMembershipInterval(planType, paymentType ?? null)
}

function CompleteProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const userId = searchParams.get("userId")
  const redsysOrder = searchParams.get("order") || searchParams.get("Ds_Order")
  const dsMerchantParameters = searchParams.get("Ds_MerchantParameters")
  const dsSignature = searchParams.get("Ds_Signature")
  const adminInviteToken = searchParams.get("admin_invite")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkoutData, setCheckoutData] = useState<CheckoutSessionData | null>(null)
  const [authError, setAuthError] = useState(false)
  const [metadataDob, setMetadataDob] = useState<string | null>(null)
  const [missingSessionId, setMissingSessionId] = useState(
    !sessionId && !adminInviteToken && !redsysOrder,
  )

  useEffect(() => {
    if (!sessionId && !adminInviteToken && !redsysOrder) {
      setLoading(false)
      setMissingSessionId(true)
      return
    }

    async function initializeProfileForm() {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError || !userData.user) {
          console.error("Authentication error:", userError)
          setAuthError(true)
          setLoading(false)
          return
        }

        if (userId && userData.user.id !== userId) {
          console.error("User ID mismatch:", userId, userData.user.id)
          setAuthError(true)
          setLoading(false)
          return
        }

        const currentUserId = userData.user.id

        if (adminInviteToken) {
          const { data: inviteData, error: inviteError } = await supabase
            .from("member_invites")
            .select("*")
            .eq("token", adminInviteToken)
            .eq("user_id", currentUserId)
            .single()

          if (inviteError || !inviteData) {
            console.error("Invite validation error:", inviteError)
            setError("Invitacion no valida o expirada.")
            setLoading(false)
            return
          }

          if (new Date(inviteData.expires_at) < new Date()) {
            setError("La invitacion ha expirado.")
            setLoading(false)
            return
          }

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

            if (attempt < maxAttempts) {
              await sleep(retryDelayMs)
              continue
            }

            setError(
              "El pago aun se esta procesando. Recarga la pagina en unos segundos; si el cargo aparece en tu banco, escribe a info@lorenzosanz.com para revisarlo.",
            )
            setLoading(false)
            return
          }
        }

        if (sessionId) {
          const { data: txnData, error: txnError } = await supabase
            .from("payment_transactions")
            .select(
              "id, redsys_order, redsys_token, redsys_token_expiry, cof_txn_id, status, context, amount_cents, last_four, metadata",
            )
            .eq("member_id", currentUserId)
            .eq("status", "authorized")
            .eq("context", "membership")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (txnData && !txnError) {
            const meta = txnData.metadata as Record<string, unknown> | null
            const planType = typeof meta?.planType === "string" ? meta.planType : "over25"
            const paymentType = resolveCheckoutPaymentType(
              planType,
              typeof meta?.interval === "string" ? meta.interval : null,
            )

            if (paymentType) {
              setCheckoutData({
                id: txnData.redsys_order || sessionId,
                status: "complete",
                redsys_token: txnData.redsys_token,
                redsys_token_expiry: txnData.redsys_token_expiry,
                cof_txn_id: txnData.cof_txn_id,
                payment_status: "paid",
                subscription_status: "pending_profile",
                plan_type: planType,
                payment_type: paymentType,
                last_four: txnData.last_four,
              })
            }
          } else {
            console.warn("No authorized membership payment found for user:", currentUserId)
          }
        }

        setLoading(false)
      } catch (loadError) {
        const errorMessage =
          loadError instanceof Error ? loadError.message : "An unexpected error occurred"
        console.error("Error in profile setup:", errorMessage)
        setError("An unexpected error occurred. Please try again.")
        setLoading(false)
      }
    }

    initializeProfileForm()
  }, [
    adminInviteToken,
    dsMerchantParameters,
    dsSignature,
    redsysOrder,
    router,
    sessionId,
    userId,
  ])

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

  const handleProfileSubmit = async (formData: ProfileFormValues) => {
    try {
      setLoading(true)

      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        throw new Error("User not authenticated")
      }

      const processedData: ProcessedMemberData = {
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
        id: userData.user.id,
        user_uuid: userData.user.id,
        email: userData.user.email,
        created_at: new Date().toISOString(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await supabase.from("miembros").insert(processedData as any)

      if (insertError) {
        const duplicateError =
          insertError.code === "23505" || insertError.message.toLowerCase().includes("duplicate")

        if (!duplicateError) {
          console.error("Error creating profile:", insertError)
          setError("Failed to create your profile. Please try again.")
          setLoading(false)
          return
        }

        const updatableData: Partial<ProcessedMemberData> = { ...processedData }
        delete updatableData.id
        delete updatableData.created_at

        const { error: updateError } = await supabase
          .from("miembros")
          .update(updatableData as Record<string, unknown>)
          .eq("user_uuid", userData.user.id)

        if (updateError) {
          console.error("Error updating existing profile:", updateError)
          setError("Failed to update your profile. Please try again.")
          setLoading(false)
          return
        }
      }

      const { data: persistedMember, error: persistedMemberError } = await supabase
        .from("miembros")
        .select("user_uuid")
        .eq("user_uuid", userData.user.id)
        .maybeSingle()

      if (persistedMemberError || !persistedMember) {
        console.error("Member profile persistence check failed:", persistedMemberError)
        setError(
          "No hemos podido guardar tu ficha de socio. Si ya realizaste el pago, escribe a info@lorenzosanz.com para revisarlo contigo.",
        )
        setLoading(false)
        return
      }

      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          name: formData.name,
          email_notifications: formData.email_notifications,
          marketing_emails: formData.marketing_emails,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userData.user.id)

      if (userUpdateError) {
        console.error("Error updating user profile state:", userUpdateError)
      }

      if (adminInviteToken && checkoutData?.plan_type && checkoutData.payment_type) {
        const { error: subscriptionError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              member_id: userData.user.id,
              plan_type: checkoutData.plan_type,
              payment_type: checkoutData.payment_type,
              last_four: null,
              redsys_token: null,
              redsys_token_expiry: null,
              redsys_cof_txn_id: null,
              redsys_last_order: null,
              start_date: new Date().toISOString(),
              end_date: null,
              status: "active",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "member_id" },
          )

        if (subscriptionError) {
          console.error("Error creating subscription record:", subscriptionError)
          setError("No se pudo activar la invitacion de miembro.")
          setLoading(false)
          return
        }
      }

      const membershipOrder = adminInviteToken
        ? null
        : redsysOrder || (checkoutData?.payment_status === "paid" ? checkoutData.id : null)

      const completionResult = await completeMembershipOnboarding(membershipOrder)
      if (!completionResult.success) {
        console.error("Error finalizing membership onboarding:", completionResult.error)
        setError(
          completionResult.error === "MEMBER_PROFILE_INCOMPLETE"
            ? "No hemos podido confirmar tu ficha de socio. Revisa el formulario o contacta con soporte."
            : "Tu perfil se ha guardado, pero no se pudo activar la membresia. Contacta con soporte.",
        )
        setLoading(false)
        return
      }

      try {
        const planLabels: Record<string, string> = {
          under25: "Joven",
          over25: "Adulto",
          family: "Familiar",
          infinite: "Invitacion permanente",
        }
        const intervalLabels: Record<string, string> = {
          monthly: "Mensual",
          annual: "Anual",
          decade: "Decada",
        }
        const planLabel = checkoutData?.plan_type
          ? planLabels[checkoutData.plan_type] ?? checkoutData.plan_type
          : undefined
        const intervalLabel = checkoutData?.payment_type
          ? intervalLabels[checkoutData.payment_type] ?? checkoutData.payment_type
          : undefined
        const planName =
          planLabel && intervalLabel ? `${planLabel} ${intervalLabel}` : planLabel

        if (completionResult.profileWasJustCompleted && userData.user.email) {
          await sendWelcomeMemberEmail({
            email: userData.user.email,
            memberName: formData.name,
            userId: userData.user.id,
            planName: planName ?? undefined,
          })
        }
      } catch (emailError) {
        console.error("Welcome email failed (non-blocking):", emailError)
      }

      router.push("/dashboard?profile=created")
    } catch (submitError) {
      const errorMessage =
        submitError instanceof Error ? submitError.message : "An unexpected error occurred"
      console.error("Error submitting profile:", errorMessage)
      setError("An error occurred while saving your profile. Please try again.")
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-gray-600">Cargando tu perfil...</p>
        </div>
      </div>
    )
  }

  if (missingSessionId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-md rounded-lg bg-white p-6 text-center shadow-md">
          <div className="mx-auto h-12 w-12 text-red-500">
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
            Falta el identificador de pago o invitacion. Por favor, verifica el enlace.
          </p>
          <Button onClick={() => router.push("/")} className="mt-6 w-full">
            Volver al inicio
          </Button>
        </div>
      </div>
    )
  }

  if (authError) {
    let returnUrl = `/complete-profile?session_id=${sessionId || ""}&userId=${userId || ""}`
    if (adminInviteToken) {
      returnUrl = `/complete-profile?admin_invite=${adminInviteToken}`
    } else if (redsysOrder) {
      returnUrl = `/complete-profile?order=${encodeURIComponent(redsysOrder)}&userId=${encodeURIComponent(userId || "")}`
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-md rounded-lg bg-white p-6 text-center shadow-md">
          <div className="mx-auto h-12 w-12 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-red-600">
            Error de autenticacion
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Necesitas iniciar sesion para completar tu perfil.
          </p>
          <Button
            onClick={() => router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`)}
            className="mt-6 w-full border border-black hover:bg-white hover:text-primary"
            disabled={loading}
          >
            Iniciar sesion
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-md rounded-lg bg-white p-6 text-center shadow-md">
          <div className="mx-auto h-12 w-12 text-red-500">
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
            className="mt-6 w-full rounded bg-primary px-4 py-2 text-white transition-all hover:border hover:border-black hover:bg-white hover:text-black"
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-center text-3xl font-bold">Completa tu perfil de socio</h1>
        {checkoutData && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="font-medium text-green-700">
              Tu pago ha sido recibido correctamente. Completa tu perfil para activar tu membresia.
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
