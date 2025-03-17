"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, CheckCircle, AlertTriangle, Calendar } from "lucide-react"
import { cancelSubscription } from "@/app/actions/stripe"

export default function MembershipPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelSuccess, setCancelSuccess] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()

        if (!userData.user) {
          router.push("/login")
          return
        }

        setUser(userData.user)

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .single()

        if (profileError) throw profileError

        setProfile(profileData)
        setLoading(false)
      } catch (error: any) {
        console.error("Error fetching user data:", error)
        setError(error.message || "Failed to load user data")
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleCancelSubscription = async () => {
    if (
      !confirm("¿Estás seguro de que deseas cancelar tu membresía? Perderás acceso a todos los beneficios de socio.")
    ) {
      return
    }

    setCancelLoading(true)
    setError(null)

    try {
      if (!profile?.subscription_id) {
        throw new Error("No hay una suscripción activa para cancelar")
      }

      const formData = new FormData()
      formData.append("subscriptionId", profile.subscription_id)
      formData.append("userId", user.id)

      const result = await cancelSubscription(formData)

      if (result.error) {
        throw new Error(result.error)
      }

      // Update local state
      setProfile({
        ...profile,
        subscription_status: "cancelled",
      })

      setCancelSuccess(true)
    } catch (error: any) {
      console.error("Error cancelling subscription:", error)
      setError(error.message || "Failed to cancel subscription")
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  const subscriptionStatus = profile?.subscription_status || "inactive"
  const subscriptionPlan = profile?.subscription_plan || null
  const subscriptionUpdatedAt = profile?.subscription_updated_at
    ? new Date(profile.subscription_updated_at).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Gestión de Membresía</h1>
        <p className="text-gray-600">Administra tu suscripción y beneficios de socio</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {cancelSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Tu membresía ha sido cancelada correctamente. Seguirás teniendo acceso hasta el final del período de
            facturación.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Estado de Membresía</CardTitle>
              <CardDescription>Información sobre tu suscripción actual</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionStatus === "active" ? (
                <div className="space-y-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                    <div>
                      <p className="font-medium text-green-600">Membresía Activa</p>
                      <p className="text-sm text-gray-500">
                        Tu membresía está activa y tienes acceso a todos los beneficios
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b py-4">
                    <div>
                      <p className="text-sm text-gray-500">Plan de Membresía</p>
                      <p className="font-medium">
                        {subscriptionPlan === "annual" ? "Membresía Anual" : "Membresía Familiar"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Activación</p>
                      <p className="font-medium">{subscriptionUpdatedAt || "No disponible"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Próxima Facturación</p>
                      <p className="font-medium">
                        {subscriptionUpdatedAt
                          ? new Date(
                              new Date(profile.subscription_updated_at).setFullYear(
                                new Date(profile.subscription_updated_at).getFullYear() + 1,
                              ),
                            ).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : "No disponible"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Método de Pago</p>
                      <p className="font-medium flex items-center">
                        <CreditCard className="h-4 w-4 mr-1" /> •••• •••• •••• {profile?.last_four || "****"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Acciones</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={handleCancelSubscription}
                        disabled={cancelLoading}
                      >
                        {cancelLoading ? "Cancelando..." : "Cancelar Membresía"}
                      </Button>
                      <Button variant="outline">Actualizar Método de Pago</Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Al cancelar tu membresía, seguirás teniendo acceso hasta el final del período de facturación.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    No tienes una membresía activa. Para disfrutar de todos los beneficios, completa tu suscripción.
                  </p>
                  <Link href="/membership">
                    <Button className="bg-primary hover:bg-secondary">Completar Suscripción</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Beneficios de Socio</CardTitle>
              <CardDescription>Lo que incluye tu membresía</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Acceso a eventos exclusivos</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Descuentos en viajes organizados</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Participación en sorteos exclusivos</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Contenido exclusivo en la web</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Carnet oficial de socio</span>
                </li>
                {subscriptionPlan === "family" && (
                  <>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Válido para hasta 4 miembros de la familia</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Descuentos adicionales en eventos familiares</span>
                    </li>
                  </>
                )}
              </ul>

              <div className="mt-6 pt-4 border-t">
                <h3 className="font-medium mb-2">Próximos Eventos</h3>
                {subscriptionStatus === "active" ? (
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Cena Anual de Socios</p>
                        <p className="text-xs text-gray-500">15 de diciembre, 2023</p>
                      </div>
                    </div>
                    <Link href="/dashboard/events">
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        Ver Todos los Eventos
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Activa tu membresía para ver eventos</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

