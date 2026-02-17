"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  cancelMembershipSubscription,
  prepareCardUpdate,
  executeCardUpdate,
} from "@/app/actions/payment"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { RedsysInSiteForm } from "@/components/shop/redsys-insite-form"
import { CheckCircle, AlertCircle, CreditCard, Loader2, ShieldCheck, X } from "lucide-react"

// Membership data from miembros table
interface Membership {
  id: string
  user_uuid: string
  subscription_status?: "active" | "trialing" | "canceled" | "incomplete" | "past_due" | "expired" | "inactive"
  subscription_plan?: string
  subscription_updated_at?: string
  last_four?: string
  redsys_token?: string
  redsys_token_expiry?: string
}

// Subscription data
interface SubscriptionData {
  id: string
  plan_type: string
  payment_type: string
  status: string
  start_date: string
  end_date: string
  cancel_at_period_end?: boolean
  canceled_at?: string
}

export default function MembershipPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [canceling, setCanceling] = useState(false)

  // Card update flow
  const [showCardUpdate, setShowCardUpdate] = useState(false)
  const [cardUpdateOrder, setCardUpdateOrder] = useState<string | null>(null)
  const [cardUpdateLoading, setCardUpdateLoading] = useState(false)

  const supabase = createBrowserSupabaseClient()

  const successParam = searchParams?.get("success") === "true"

  useEffect(() => {
    if (successParam) {
      setSuccessMsg("¡Tu suscripción se ha procesado correctamente! Ya eres miembro oficial de la Peña Lorenzo Sanz.")
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

        // Fetch membership
        const { data: memberData } = await supabase
          .from("miembros")
          .select("*")
          .eq("user_uuid", userData.user.id)
          .single()

        if (!memberData) {
          // Fallback: try by id
          const { data: memberById } = await supabase
            .from("miembros")
            .select("*")
            .eq("id", userData.user.id)
            .single()

          setMembership((memberById as Membership) ?? null)
        } else {
          setMembership(memberData as Membership)
        }

        // Fetch subscription details
        const { data: subData } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("member_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (subData) {
          setSubscription(subData as SubscriptionData)
        }
      } catch (err) {
        console.error("Error loading membership data:", err)
        setError("Ocurrió un error al cargar los datos de membresía")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  // ── Cancel subscription ─────────────────────────────────────────────────
  const handleCancelSubscription = async () => {
    if (!confirm("¿Estás seguro de que deseas cancelar tu suscripción? Seguirá activa hasta el final del período actual.")) {
      return
    }

    try {
      setCanceling(true)
      setError(null)

      const result = await cancelMembershipSubscription()
      if (result.success) {
        setMembership((prev) =>
          prev ? { ...prev, subscription_status: "canceled" } : null,
        )
        if (subscription) {
          setSubscription({ ...subscription, status: "canceled", cancel_at_period_end: true })
        }
        setSuccessMsg("Tu suscripción se cancelará al final del período de facturación actual.")
      } else {
        setError(result.error || "No se pudo cancelar la suscripción")
      }
    } catch (err) {
      console.error("Error canceling subscription:", err)
      setError("No se pudo cancelar la suscripción")
    } finally {
      setCanceling(false)
    }
  }

  // ── Card update flow ────────────────────────────────────────────────────
  const handleStartCardUpdate = async () => {
    setError(null)
    setCardUpdateLoading(true)

    try {
      const result = await prepareCardUpdate()
      if (!result.success || !result.order) {
        setError(result.error || "Error al preparar la actualización de tarjeta")
        setCardUpdateLoading(false)
        return
      }

      setCardUpdateOrder(result.order)
      setShowCardUpdate(true)
    } catch (err) {
      console.error("Error preparing card update:", err)
      setError("Error al preparar la actualización de tarjeta")
    } finally {
      setCardUpdateLoading(false)
    }
  }

  const handleCardUpdateIdOper = useCallback(
    async (idOper: string) => {
      if (!cardUpdateOrder) return
      setCardUpdateLoading(true)
      setError(null)

      try {
        const result = await executeCardUpdate(idOper, cardUpdateOrder)
        if (result.success) {
          setSuccessMsg("¡Tarjeta actualizada correctamente!")
          setShowCardUpdate(false)
          setCardUpdateOrder(null)
          // Update displayed last_four
          if (result.lastFour) {
            setMembership((prev) =>
              prev ? { ...prev, last_four: result.lastFour } : null,
            )
          }
        } else {
          setError(result.error || "No se pudo actualizar la tarjeta")
        }
      } catch (err) {
        console.error("Error executing card update:", err)
        setError("Error al actualizar la tarjeta")
      } finally {
        setCardUpdateLoading(false)
      }
    },
    [cardUpdateOrder],
  )

  const handleCardUpdateError = useCallback((message: string) => {
    setError(message)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información de membresía...</p>
        </div>
      </div>
    )
  }

  // No active membership
  if (!membership || membership.subscription_status === "inactive") {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Membresía</h1>
          <p className="text-gray-500">Gestiona tu membresía de la Peña Lorenzo Sanz</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-gray-50 border-dashed">
          <CardHeader>
            <CardTitle>Información de Membresía</CardTitle>
            <CardDescription>
              Los ajustes de la membresía solo están disponibles a aquellos que dispongan de una
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No tienes una membresía activa. Hazte socio para disfrutar de todos los beneficios.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col md:flex-row justify-between">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="transition-all border-black hover:bg-primary hover:text-white mb-2 md:mb-0"
            >
              Volver al Dashboard
            </Button>
            <Button
              onClick={() => router.push("/membership")}
              className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black"
            >
              Ver Planes de Membresía
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Beneficios de Membresía</CardTitle>
            <CardDescription>Disfruta de estos beneficios exclusivos como miembro</CardDescription>
          </CardHeader>
          <CardContent>
            <BenefitsList />
          </CardContent>
        </Card>
      </div>
    )
  }

  const isActive = membership.subscription_status === "active" || membership.subscription_status === "trialing"
  const isCanceled = membership.subscription_status === "canceled"
  const isPastDue = membership.subscription_status === "past_due"

  // Format renewal / end date from subscription
  let renewalDate = "No disponible"
  if (subscription?.end_date) {
    renewalDate = new Date(subscription.end_date).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  // Plan display name
  const planLabel = formatPlanLabel(membership.subscription_plan)

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Membresía</h1>
          <p className="text-gray-500">Gestiona tu membresía de la Peña Lorenzo Sanz</p>
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

      {/* Subscription status card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Estado de Membresía</CardTitle>
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
          <CardDescription>Detalles de tu membresía actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Plan</h3>
              <p className="text-lg font-semibold">{planLabel}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                {isCanceled ? "Activa hasta" : "Próxima renovación"}
              </h3>
              <p className="text-lg font-semibold">{renewalDate}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Método de pago</h3>
              <p className="text-lg font-semibold">
                {membership.last_four
                  ? `Tarjeta terminada en ${membership.last_four}`
                  : "No disponible"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Estado</h3>
              <p className="text-lg font-semibold capitalize">
                {membership.subscription_status === "active"
                  ? "Activa"
                  : membership.subscription_status === "trialing"
                    ? "Periodo de prueba"
                    : membership.subscription_status === "canceled"
                      ? "Cancelada (activa hasta fin de periodo)"
                      : membership.subscription_status === "past_due"
                        ? "Pago pendiente"
                        : membership.subscription_status || "No disponible"}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col md:flex-row gap-3 justify-between">
          {isCanceled ? (
            <p className="text-orange-500 text-sm">
              Tu suscripción se cancelará el {renewalDate}. Hasta entonces sigues disfrutando de todos los beneficios.
            </p>
          ) : (
            <>
              <Button
                onClick={handleCancelSubscription}
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-500 hover:text-white"
                disabled={canceling || !isActive}
              >
                {canceling ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Cancelando...</> : "Cancelar Suscripción"}
              </Button>
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

      {/* Card update InSite form (shown inline) */}
      {showCardUpdate && cardUpdateOrder && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Actualizar tarjeta de pago</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowCardUpdate(false); setCardUpdateOrder(null) }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Introduce los datos de tu nueva tarjeta. Se guardará para los próximos cobros automáticos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RedsysInSiteForm
              order={cardUpdateOrder}
              onIdOperReceived={handleCardUpdateIdOper}
              onError={handleCardUpdateError}
              buttonText="Guardar nueva tarjeta"
            />
            <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
              <ShieldCheck className="h-4 w-4" />
              <span>Datos procesados de forma segura por Redsys</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past due warning */}
      {isPastDue && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            No se pudo procesar tu último pago. Actualiza tu tarjeta para evitar la cancelación de tu membresía.
          </AlertDescription>
        </Alert>
      )}

      {/* Benefits card */}
      <Card>
        <CardHeader>
          <CardTitle>Beneficios de Membresía</CardTitle>
          <CardDescription>Disfruta de estos beneficios exclusivos como miembro</CardDescription>
        </CardHeader>
        <CardContent>
          <BenefitsList />
        </CardContent>
      </Card>
    </div>
  )
}

// ── Helper Components ──────────────────────────────────────────────────────

function BenefitsList() {
  const benefits = [
    "Acceso a eventos exclusivos organizados por la peña",
    "Descuentos en viajes organizados para ver partidos",
    "Participación en sorteos y promociones exclusivas",
    "Acceso al contenido exclusivo en nuestra web",
    "Carnet oficial de socio de la Peña Lorenzo Sanz",
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

function formatPlanLabel(plan?: string): string {
  if (!plan) return "Plan Estándar"
  const labels: Record<string, string> = {
    under25_monthly: "Joven — Mensual",
    under25_annual: "Joven — Anual",
    over25_monthly: "Adulto — Mensual",
    over25_annual: "Adulto — Anual",
    family_monthly: "Familiar — Mensual",
    family_annual: "Familiar — Anual",
  }
  return labels[plan] || plan
}