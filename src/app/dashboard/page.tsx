"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Calendar, FileText, Settings, AlertTriangle } from "lucide-react"

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/login")}>Volver a Iniciar Sesión</Button>
      </div>
    )
  }

  const subscriptionStatus = profile?.subscription_status || "inactive"
  const subscriptionPlan = profile?.subscription_plan || null

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Bienvenido a tu Panel de Socio</h1>
          <p className="text-gray-600">Hola, {user?.user_metadata?.name || user?.email}</p>
        </div>
      </div>

      {subscriptionStatus !== "active" && (
        <Alert className="mb-8 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-800" />
          <AlertDescription className="text-yellow-800">
            Tu membresía no está activa. Para disfrutar de todos los beneficios,
            <Link href="/membership" className="font-medium underline ml-1">
              completa tu suscripción
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary" />
              Estado de Membresía
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <p className="font-medium">
                  {subscriptionStatus === "active" ? (
                    <span className="text-green-600">Activa</span>
                  ) : (
                    <span className="text-yellow-600">Pendiente</span>
                  )}
                </p>
              </div>
              <Link href="/dashboard/membership">
                <Button variant="outline" size="sm" className="text-xs">
                  Ver Detalles
                </Button>
              </Link>
            </div>
            {subscriptionStatus === "active" && subscriptionPlan && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-medium">
                  {subscriptionPlan === "annual" ? "Membresía Anual" : "Membresía Familiar"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {subscriptionStatus === "active" ? "No hay eventos próximos" : "Activa tu membresía para ver eventos"}
            </p>
            <div className="mt-4">
              <Link href="/dashboard/events">
                <Button variant="outline" size="sm" className="text-xs w-full">
                  Ver Todos los Eventos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Contenido Exclusivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">
              {subscriptionStatus === "active"
                ? "Accede a contenido exclusivo"
                : "Activa tu membresía para ver contenido"}
            </p>
            <div className="mt-4">
              <Link href="/dashboard/content">
                <Button variant="outline" size="sm" className="text-xs w-full">
                  Ver Contenido
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Settings className="mr-2 h-5 w-5 text-primary" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Gestiona tu perfil y preferencias</p>
            <div className="mt-4">
              <Link href="/dashboard/settings">
                <Button variant="outline" size="sm" className="text-xs w-full">
                  Editar Perfil
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas actualizaciones y actividades de la peña</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptionStatus === "active" ? (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <p className="font-medium">Nuevo artículo publicado</p>
                  <p className="text-sm text-gray-500">"Los 5 Mejores Momentos de la Era Lorenzo Sanz" - Hace 2 días</p>
                </div>
                <div className="border-b pb-4">
                  <p className="font-medium">Próximo evento anunciado</p>
                  <p className="text-sm text-gray-500">"Cena Anual de Socios" - 15 de diciembre, 2023</p>
                </div>
                <div>
                  <p className="font-medium">Actualización de membresía</p>
                  <p className="text-sm text-gray-500">Tu membresía ha sido activada correctamente - Hace 5 días</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Activa tu membresía para ver la actividad reciente</p>
                <Link href="/membership">
                  <Button className="bg-primary hover:bg-secondary">Completar Suscripción</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enlaces Rápidos</CardTitle>
            <CardDescription>Accesos directos a secciones importantes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/blog">
                <Button variant="outline" className="w-full justify-start">
                  Blog
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="w-full justify-start">
                  Contacto
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" className="w-full justify-start">
                  Sobre Nosotros
                </Button>
              </Link>
              {subscriptionStatus === "active" && (
                <Link href="/dashboard/membership">
                  <Button variant="outline" className="w-full justify-start">
                    Gestionar Membresía
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

