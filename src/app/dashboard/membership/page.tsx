
"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createBillingPortalSession } from "@/app/actions/stripe"
import { supabase } from "@/lib/supabase-client"
import { CheckCircle, AlertCircle } from "lucide-react"

export default function MembershipPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membership, setMembership] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [managingSubscription, setManagingSubscription] = useState(false)

  const success = searchParams?.get("success") === "true"
  const canceled = searchParams?.get("canceled") === "true"
  const errorParam = searchParams?.get("error")

  useEffect(() => {
    if (errorParam) {
      if (errorParam === "no-customer") {
        setError("No se encontró información de cliente en Stripe")
      } else {
        setError("Ocurrió un error al procesar tu solicitud")
      }
    }
  }, [errorParam])

  useEffect(() => {
    async function loadUserAndMembership() {
      try {
        setLoading(true)
        
        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error("Error fetching user:", userError)
          setError("No se pudo cargar la información del usuario")
          setLoading(false)
          return
        }
        
        if (!userData.user) {
          router.push("/login?redirect=/dashboard/membership")
          return
        }
        
        setUser(userData.user)
        
        // Get membership data
        try {
          const { data: memberData, error: memberError } = await supabase
            .from("miembros")
            .select("*, subscriptions(*)")
            .eq("user_uuid", userData.user.id)
            .single()
          
          if (memberError) {
            console.error("Error fetching membership:", memberError)
            // Don't set error here, we'll show a fallback UI
          } else {
            setMembership(memberData)
          }
        } catch (err) {
          console.error("Error in membership fetch:", err)
          // Don't set error here, we'll show a fallback UI
        }
      } catch (err) {
        console.error("Error in loadUserAndMembership:", err)
        setError("Ocurrió un error al cargar los datos")
      } finally {
        setLoading(false)
      }
    }

    loadUserAndMembership()
  }, [router])

  const handleManageSubscription = async () => {
    if (!user || !membership?.stripe_customer_id) {
      setError("No se encontró información de suscripción")
      return
    }

    try {
      setManagingSubscription(true)
      const result = await createBillingPortalSession(membership.stripe_customer_id)
      
      if (result?.url) {
        window.location.href = result.url
      } else {
        throw new Error("No se pudo crear la sesión del portal de facturación")
      }
    } catch (error) {
      console.error("Error managing subscription:", error)
      setError("No se pudo acceder al portal de facturación")
    } finally {
      setManagingSubscription(false)
    }
  }

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

  // Fallback UI when no membership data is available
  if (!membership || !membership.subscriptions) {
    return (
      <div className="space-y-6">
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
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => router.push("/dashboard")}
              className="transition-colors hover:bg-primary hover:text-white"
            >
              Volver al Dashboard
            </Button>
            <Button 
              onClick={() => router.push("/membership")}
              className="transition-colors hover:bg-white hover:text-primary hover:border-primary"
            >
              Ver Planes de Membresía
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const subscription = membership.subscriptions[0]
  const isActive = subscription?.status === "active" || subscription?.status === "trialing"
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString("es-ES")
    : "No disponible"

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Membresía</h1>
        <p className="text-gray-500">Gestiona tu membresía de la Peña Lorenzo Sanz</p>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ¡Tu suscripción se ha procesado correctamente! Ya eres miembro oficial de la Peña Lorenzo Sanz.
          </AlertDescription>
        </Alert>
      )}

      {canceled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>El proceso de suscripción ha sido cancelado.</AlertDescription>
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
            <CardTitle>Estado de Membresía</CardTitle>
            {isActive ? (
              <Badge className="bg-green-500">Activa</Badge>
            ) : (
              <Badge variant="outline" className="text-red-500 border-red-200">
                Inactiva
              </Badge>
            )}
          </div>
          <CardDescription>Detalles de tu membresía actual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Plan</h3>
              <p className="text-lg font-semibold">{subscription?.plan?.name || "Plan Estándar"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Fecha de renovación</h3>
              <p className="text-lg font-semibold">{renewalDate}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Precio</h3>
              <p className="text-lg font-semibold">
                {subscription?.plan?.amount
                  ? `${(subscription.plan.amount / 100).toFixed(2)}€ / ${
                      subscription.plan.interval === "month" ? "mes" : "año"
                    }`
                  : "No disponible"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Estado</h3>
              <p className="text-lg font-semibold capitalize">
                {subscription?.status === "active"
                  ? "Activa"
                  : subscription?.status === "trialing"
                  ? "Periodo de prueba"
                  : subscription?.status === "canceled"
                  ? "Cancelada"
                  : subscription?.status || "No disponible"}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleManageSubscription} 
            disabled={managingSubscription || !isActive}
            className="transition-colors hover:bg-white hover:text-primary hover:border-primary"
          >
            {managingSubscription ? "Procesando..." : "Gestionar Suscripción"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Beneficios de Membresía</CardTitle>
          <CardDescription>Disfruta de estos beneficios exclusivos como miembro</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>Acceso a eventos exclusivos organizados por la peña</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>Descuentos en viajes organizados para ver partidos</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>Participación en sorteos y promociones exclusivas</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>Acceso al contenido exclusivo en nuestra web</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>Carnet oficial de socio de la Peña Lorenzo Sanz</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}