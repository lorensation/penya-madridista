"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createBillingPortalSession, cancelSubscription } from "@/app/actions/stripe"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { CheckCircle, AlertCircle } from "lucide-react"

// Define types for membership data
interface Membership {
  id: string;
  user_uuid: string;
  stripe_customer_id?: string;
  subscription_status?: "active" | "trialing" | "canceled" | "incomplete" | "past_due" | "inactive";
  subscription_plan?: string;
  subscription_id?: string;
  subscription_updated_at?: string;
  last_four?: string;
  // Add other membership fields as needed
}

// Import these types from your stripe.ts file or define them here
/*interface PortalSessionError {
  error: string;
  message: string;
  url?: never;
}

interface PortalSessionSuccess {
  url: string;
  error?: never;
  message?: never;
}

type PortalSessionResponse = PortalSessionSuccess | PortalSessionError;*/

export default function MembershipPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [managingSubscription, setManagingSubscription] = useState(false)

  const supabase = createBrowserSupabaseClient()

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
        
        // Get membership data
        try {
          // Try to find by user_uuid first
          const { data: memberData, error: memberError } = await supabase
            .from("miembros")
            .select("*")
            .eq("user_uuid", userData.user.id)
            .single()
          
          // If not found, try by id
          if (memberError || !memberData) {
            console.log("Not found by user_uuid, trying with id")
            const { data: memberDataById, error: memberErrorById } = await supabase
              .from("miembros")
              .select("*")
              .eq("id", userData.user.id)
              .single()
              
            if (memberErrorById) {
              console.error("Error fetching membership by id:", memberErrorById)
              setError("No se pudo encontrar información de membresía")
              setLoading(false)
              return
            }
            
            setMembership(memberDataById as Membership)
          } else {
            setMembership(memberData as Membership)
          }
        } catch (err) {
          console.error("Error in membership fetch:", err)
          setError("Ocurrió un error al cargar los datos de membresía")
        }
      } catch (err) {
        console.error("Error in loadUserAndMembership:", err)
        setError("Ocurrió un error al cargar los datos")
      } finally {
        setLoading(false)
      }
    }

    loadUserAndMembership()
  }, [router, supabase])

  const handleManageSubscription = async () => {
    if (!membership?.stripe_customer_id) {
      setError("No se encontró información de cliente en Stripe")
      return
    }

    try {
      setManagingSubscription(true)
      
      // Pass the customer ID directly to the server action
      // This avoids authentication issues with server actions
      const result = await createBillingPortalSession(membership.stripe_customer_id)
      
      // Type guard to check if we have a success response with URL
      if ('url' in result) {
        window.location.href = result.url ?? "/dashboard/membership"
      } 
      // Type guard to check if we have an error response
      else if ('error' in result) {
        console.error("Error from server action:", result.error, result.message)
        
        // Handle specific error cases
        if (result.error === "auth-error") {
          // Refresh the page or redirect to login
          router.push("/login?redirect=/dashboard/membership")
        } else if (result.error === "no-customer") {
          setError("No se encontró información de cliente en Stripe")
        } else {
          setError(`No se pudo acceder al portal de facturación: ${result.message || 'Error desconocido'}`)
        }
      } else {
        throw new Error("Respuesta inesperada del servidor")
      }
    } catch (error) {
      console.error("Error managing subscription:", error)
      setError("No se pudo acceder al portal de facturación")
    } finally {
      setManagingSubscription(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!membership?.subscription_id) {
      setError("No se encontró información de suscripción")
      return
    }

    try {
      const result = await cancelSubscription(membership.subscription_id)
      
      if (result.success) {
        // Update the local state to reflect the cancellation
        setMembership({
          ...membership,
          subscription_status: "canceled"
        })
        
        // Show success message
        setError(null)
        alert("Tu suscripción se cancelará al final del período de facturación actual.")
      } else {
        setError(`No se pudo cancelar la suscripción: ${result.error}`)
      }
    } catch (error) {
      console.error("Error canceling subscription:", error)
      setError("No se pudo cancelar la suscripción")
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

  // Fallback UI when no membership data is available or subscription is inactive
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

  const isActive = membership.subscription_status === "active" || membership.subscription_status === "trialing"
  const isCanceled = membership.subscription_status === "canceled"
  
  // Calculate renewal date from subscription_updated_at if available
  let renewalDate = "No disponible"
  if (membership.subscription_updated_at) {
    // Assuming subscription is monthly, add 30 days to the updated_at date
    const updatedAtDate = new Date(membership.subscription_updated_at)
    const renewalDateObj = new Date(updatedAtDate)
    renewalDateObj.setDate(renewalDateObj.getDate() + 30)
    renewalDate = renewalDateObj.toLocaleDateString("es-ES")
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Membresía</h1>
          <p className="text-gray-500">Gestiona tu membresía de la Peña Lorenzo Sanz</p>
        </div>
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
            ) : isCanceled ? (
              <Badge variant="outline" className="text-orange-500 border-orange-200">
                Cancelada
              </Badge>
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
              <p className="text-lg font-semibold">{membership.subscription_plan || "Plan Estándar"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Fecha de renovación</h3>
              <p className="text-lg font-semibold">{renewalDate}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Método de pago</h3>
              <p className="text-lg font-semibold">
                {membership.last_four ? `Tarjeta terminada en ${membership.last_four}` : "No disponible"}
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
                  ? "Cancelada"
                  : membership.subscription_status || "No disponible"}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col md:flex-row justify-between">
          {isCanceled ? (
            <p className="text-orange-500">Tu suscripción se cancelará al final del período de facturación actual.</p>
          ) : (
            <>
              <Button 
                onClick={handleCancelSubscription} 
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-500 hover:text-white mb-2 md:mb-0"
                disabled={managingSubscription || !isActive}
              >
                Cancelar Suscripción
              </Button>
              <Button 
                onClick={handleManageSubscription} 
                disabled={managingSubscription || !isActive}
                className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black"
              >
                {managingSubscription ? "Procesando..." : "Gestionar Suscripción"}
              </Button>
            </>
          )}
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