"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  cancelMembershipSubscription,
  prepareCardUpdate,
} from "@/app/actions/payment"
import { getMemberRefundStatus } from "@/app/actions/refunds"
import { RefundRequestDialog } from "@/components/subscription/refund-request-dialog"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { hasMembershipAccess } from "@/lib/membership-access"
import { getLatestSubscriptionByUserId } from "@/lib/data/subscription"
import { getMembershipPlanLabel } from "@/lib/membership/plan-label"
import { RedsysRedirectAutoSubmitForm } from "@/components/payments/redsys-redirect-form"
import type { RedsysSignedRequest } from "@/lib/redsys"
import { CheckCircle, AlertCircle, CreditCard, Loader2 } from "lucide-react"

interface SubscriptionData {
  id: string
  plan_type: string
  payment_type: string
  status: string
  last_four: string | null
  start_date: string | null
  end_date: string | null
  cancel_at_period_end?: boolean
  canceled_at?: string
}

export default function MembershipPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [refundStatus, setRefundStatus] = useState<{ canRequest: boolean; pendingRequest: boolean; reason?: string } | null>(null)

  const [cardUpdateLoading, setCardUpdateLoading] = useState(false)
  const [redirectActionUrl, setRedirectActionUrl] = useState<string | null>(null)
  const [redirectSigned, setRedirectSigned] = useState<RedsysSignedRequest | null>(null)

  const supabase = createBrowserSupabaseClient()
  const successParam = searchParams?.get("success") === "true"

  useEffect(() => {
    if (successParam) {
      setSuccessMsg("Tu suscripcion se ha procesado correctamente. Ya eres miembro de la Pena Lorenzo Sanz.")
    }
  }, [successParam])

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError || !userData.user) {
          router.push("/login?redirect=/dashboard/membership")
          return
        }

        const { data: subData, error: subError } = await getLatestSubscriptionByUserId(
          supabase,
          userData.user.id,
        )

        if (subError) {
          console.error("Subscription fetch error:", subError)
          setSubscription(null)
        } else {
          setSubscription((subData as SubscriptionData) ?? null)
        }

        // Load refund status
        try {
          const rStatus = await getMemberRefundStatus()
          setRefundStatus(rStatus)
        } catch {
          // Non-critical, ignore
        }
      } catch (err) {
        console.error("Error loading membership data:", err)
        setError("Ocurrio un error al cargar los datos de suscripción")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleCancelSubscription = async () => {
    if (!confirm("Estas seguro de que deseas cancelar tu suscripcion? Seguira activa hasta el final del periodo actual.")) {
      return
    }

    try {
      setCanceling(true)
      setError(null)

      const result = await cancelMembershipSubscription()
      if (result.success) {
        if (subscription) {
          setSubscription({ ...subscription, status: "canceled", cancel_at_period_end: true })
        }
        setSuccessMsg("Tu suscripcion se cancelara al final del periodo de facturacion actual.")
      } else {
        setError(result.error || "No se pudo cancelar la suscripcion")
      }
    } catch (err) {
      console.error("Error canceling subscription:", err)
      setError("No se pudo cancelar la suscripcion")
    } finally {
      setCanceling(false)
    }
  }

  const handleStartCardUpdate = async () => {
    setError(null)
    setCardUpdateLoading(true)
    setRedirectActionUrl(null)
    setRedirectSigned(null)

    try {
      const result = await prepareCardUpdate()
      if (!result.success || !result.actionUrl || !result.signed) {
        setError(result.error || "Error al preparar la actualizacion de tarjeta")
        return
      }

      setRedirectActionUrl(result.actionUrl)
      setRedirectSigned(result.signed)
    } catch (err) {
      console.error("Error preparing card update:", err)
      setError("Error al preparar la actualizacion de tarjeta")
    } finally {
      setCardUpdateLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando informacion de suscripción...</p>
        </div>
      </div>
    )
  }

  const effectiveStatus = subscription?.status || "inactive"
  const hasCurrentMembershipAccess = hasMembershipAccess({
    status: effectiveStatus,
    endDate: subscription?.end_date ?? null,
  })
  const isExpiredCanceled = effectiveStatus === "canceled" && !hasCurrentMembershipAccess
  const isWithoutCurrentMembership =
    effectiveStatus === "inactive" || effectiveStatus === "expired" || isExpiredCanceled

  if (isWithoutCurrentMembership) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Suscripción</h1>
          <p className="text-gray-500">Gestiona tu suscripción de la Pena Lorenzo Sanz</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-gray-50 border-dashed">
          <CardHeader>
            <CardTitle>Informacion de suscripción</CardTitle>
            <CardDescription>
              Los ajustes de suscripción solo estan disponibles para usuarios con suscripcion activa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No tienes una suscripción activa. Hazte socio para disfrutar de todos los beneficios.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col md:flex-row justify-between">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="transition-all border-black hover:bg-primary hover:text-white mb-2 md:mb-0"
            >
              Volver al dashboard
            </Button>
            <Button
              onClick={() => router.push("/membership")}
              className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black"
            >
              Ver planes de suscripción
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Beneficios de suscripción</CardTitle>
            <CardDescription>Disfruta de estos beneficios exclusivos como miembro</CardDescription>
          </CardHeader>
          <CardContent>
            <BenefitsList />
          </CardContent>
        </Card>
      </div>
    )
  }

  const isActive = effectiveStatus === "active" || effectiveStatus === "trialing"
  const isCanceled = effectiveStatus === "canceled" && hasCurrentMembershipAccess
  const isPastDue = effectiveStatus === "past_due"

  let renewalDate = "No disponible"
  if (subscription?.end_date) {
    renewalDate = new Date(subscription.end_date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const planLabel = getMembershipPlanLabel({
    planType: subscription?.plan_type,
    paymentType: subscription?.payment_type,
  })

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Suscripción</h1>
          <p className="text-gray-500">Gestiona tu suscripción de la Pena Lorenzo Sanz</p>
        </div>
      </div>

      {successMsg && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMsg}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Estado de suscripción</CardTitle>
            {isActive ? (
              <Badge className="bg-green-500">Activa</Badge>
            ) : isCanceled ? (
              <Badge variant="outline" className="text-orange-500 border-orange-200">Cancelada</Badge>
            ) : isPastDue ? (
              <Badge variant="outline" className="text-yellow-600 border-yellow-200">Pago pendiente</Badge>
            ) : (
              <Badge variant="outline" className="text-red-500 border-red-200">Inactiva</Badge>
            )}
          </div>
          <CardDescription>Detalles de tu suscripción actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Plan</h3>
              <p className="text-lg font-semibold">{planLabel}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                {isCanceled ? "Activa hasta" : "Proxima renovacion"}
              </h3>
              <p className="text-lg font-semibold">{renewalDate}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Metodo de pago</h3>
              <p className="text-lg font-semibold">
                {subscription?.last_four ? `Tarjeta terminada en ${subscription.last_four}` : "Tarjeta"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Estado</h3>
              <p className="text-lg font-semibold capitalize">
                {effectiveStatus === "active"
                  ? "Activa"
                  : effectiveStatus === "trialing"
                    ? "Periodo de prueba"
                    : effectiveStatus === "canceled"
                      ? "Cancelada (activa hasta fin de periodo)"
                      : effectiveStatus === "past_due"
                        ? "Pago pendiente"
                        : effectiveStatus || "No disponible"}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col md:flex-row gap-3 justify-between">
          {isCanceled ? (
            <p className="text-orange-500 text-sm">
              Tu suscripcion se cancelara el {renewalDate}. Hasta entonces sigues disfrutando de todos los beneficios.
            </p>
          ) : (
            <>
              <Button
                onClick={handleCancelSubscription}
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-500 hover:text-white"
                disabled={canceling || !isActive}
              >
                {canceling ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Cancelando...</> : "Cancelar suscripcion"}
              </Button>
              {refundStatus?.pendingRequest ? (
                <Badge variant="outline" className="text-amber-600 border-amber-300 py-2 px-3">
                  Solicitud de reembolso pendiente
                </Badge>
              ) : (
                <RefundRequestDialog
                  disabled={!refundStatus?.canRequest}
                  onSuccess={async () => {
                    const rStatus = await getMemberRefundStatus()
                    setRefundStatus(rStatus)
                  }}
                />
              )}
              <Button
                onClick={handleStartCardUpdate}
                variant="outline"
                disabled={cardUpdateLoading || !isActive}
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                {cardUpdateLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Preparando...</>
                  : <><CreditCard className="h-4 w-4 mr-2" /> Actualizar tarjeta</>}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {redirectActionUrl && redirectSigned && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actualizar tarjeta de pago</CardTitle>
            <CardDescription>
              Te estamos redirigiendo al TPV seguro de Redsys para actualizar tu tarjeta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="mt-3 text-sm text-gray-500">
                No cierres esta pagina hasta completar el proceso.
              </p>
              <div className="mt-4">
                <RedsysRedirectAutoSubmitForm actionUrl={redirectActionUrl} signed={redirectSigned} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isPastDue && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            No se pudo procesar tu ultimo pago. Actualiza tu tarjeta para evitar la cancelacion de tu suscripción.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Beneficios de suscripción</CardTitle>
          <CardDescription>Disfruta de estos beneficios exclusivos como miembro</CardDescription>
        </CardHeader>
        <CardContent>
          <BenefitsList />
        </CardContent>
      </Card>
    </div>
  )
}

function BenefitsList() {
  const benefits = [
    "Acceso a eventos exclusivos organizados por la pena",
    "Descuentos en viajes organizados para ver partidos",
    "Participacion en sorteos y promociones exclusivas",
    "Acceso al contenido exclusivo en nuestra web",
    "Carnet oficial de socio de la Pena Lorenzo Sanz",
  ]

  return (
    <ul className="space-y-2">
      {benefits.map((b, i) => (
        <li key={i} className="flex items-start">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  )
}