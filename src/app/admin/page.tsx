"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Users, Calendar, CreditCard } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalPosts: 0,
    totalEvents: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        let usersCount = 0
        let subscriptionsCount = 0
        let postsCount = 0
        let eventsCount = 0

        // Fetch total users
        try {
          const { count: _usersCount, error: usersError } = await supabase
            .from("miembros")
            .select("*", { count: "exact", head: true })

          if (!usersError) {
            usersCount = _usersCount || 0
          }
        } catch (error) {
          console.error("Error fetching users count:", error)
        }

        // Fetch active subscriptions
        try {
          const { count: _subscriptionsCount, error: subscriptionsError } = await supabase
            .from("miembros")
            .select("*", { count: "exact", head: true })
            .eq("subscription_status", "active")

          if (!subscriptionsError) {
            subscriptionsCount = _subscriptionsCount || 0
          }
        } catch (error) {
          console.error("Error fetching subscriptions count:", error)
        }

        // Fetch total posts
        try {
          const { count: _postsCount, error: postsError } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })

          if (!postsError) {
            postsCount = _postsCount || 0
          }
        } catch (error) {
          console.error("Error fetching posts count:", error)
        }

        // Fetch total events
        try {
          const { count: _eventsCount, error: eventsError } = await supabase
            .from("events")
            .select("*", { count: "exact", head: true })

          if (!eventsError) {
            eventsCount = _eventsCount || 0
          }
        } catch (error) {
          console.error("Error fetching events count:", error)
        }

        setStats({
          totalUsers: usersCount,
          activeSubscriptions: subscriptionsCount,
          totalPosts: postsCount,
          totalEvents: eventsCount,
        })

        setLoading(false)
      } catch (error: any) {
        console.error("Error fetching stats:", error)
        setError(error.message || "Failed to load dashboard stats")
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

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
        <Button onClick={() => router.refresh()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Panel de Administración</h1>
        <p className="text-gray-600">Gestiona todos los aspectos de la Peña Lorenzo Sanz</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              Usuarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
                <p className="text-sm text-gray-500">Total de usuarios</p>
              </div>
              <Link href="/admin/users">
                <Button variant="outline" size="sm" className="text-xs">
                  Ver Detalles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary" />
              Suscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.activeSubscriptions}</p>
                <p className="text-sm text-gray-500">Suscripciones activas</p>
              </div>
              <Link href="/admin/subscriptions">
                <Button variant="outline" size="sm" className="text-xs">
                  Ver Detalles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Blog
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.totalPosts}</p>
                <p className="text-sm text-gray-500">Artículos publicados</p>
              </div>
              <Link href="/admin/blog">
                <Button variant="outline" size="sm" className="text-xs">
                  Ver Detalles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{stats.totalEvents}</p>
                <p className="text-sm text-gray-500">Eventos programados</p>
              </div>
              <Link href="/admin/events">
                <Button variant="outline" size="sm" className="text-xs">
                  Ver Detalles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Accesos directos a las acciones más comunes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/admin/blog/new">
                <Button className="w-full justify-start bg-primary hover:bg-secondary">
                  <FileText className="mr-2 h-4 w-4" />
                  Crear Nuevo Artículo
                </Button>
              </Link>
              <Link href="/admin/events/new">
                <Button className="w-full justify-start bg-primary hover:bg-secondary">
                  <Calendar className="mr-2 h-4 w-4" />
                  Crear Nuevo Evento
                </Button>
              </Link>
              <Link href="/admin/users">
                <Button className="w-full justify-start bg-primary hover:bg-secondary">
                  <Users className="mr-2 h-4 w-4" />
                  Gestionar Usuarios
                </Button>
              </Link>
              <Link href="/admin/subscriptions">
                <Button className="w-full justify-start bg-primary hover:bg-secondary">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Gestionar Suscripciones
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas acciones realizadas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-b pb-4">
                <p className="font-medium">Nuevo usuario registrado</p>
                <p className="text-sm text-gray-500">Ana Martínez se ha registrado - Hace 2 horas</p>
              </div>
              <div className="border-b pb-4">
                <p className="font-medium">Nueva suscripción</p>
                <p className="text-sm text-gray-500">Carlos Rodríguez ha activado su membresía - Hace 5 horas</p>
              </div>
              <div>
                <p className="font-medium">Artículo publicado</p>
                <p className="text-sm text-gray-500">"Los 5 Mejores Momentos de la Era Lorenzo Sanz" - Hace 1 día</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

