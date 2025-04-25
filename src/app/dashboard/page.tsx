"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CreditCard, Calendar, FileText, Settings, AlertTriangle, Clock, MapPin, FileTextIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

// Define interfaces for our data types
interface Profile {
  id: string
  name?: string
  auth_id?: string
  subscription_status?: string
  subscription_plan?: "annual" | "family" | null
}

interface Event {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  location: string | null
  created_at: string | null
}

// Interface for blog post data from the database
interface Post {
  id: string
  title: string
  slug: string
  created_at: string | null
}

// Combined interface for activity feed items
interface ActivityItem {
  id: string
  type: 'event' | 'post'
  title: string
  created_at: string | null
  date?: string
  slug?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingActivity, setLoadingActivity] = useState(true)

  const supabase = createBrowserSupabaseClient()

  // Format date for a more human-readable format
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return ""
    
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: es 
      })
    } catch (e) {
      return "fecha inválida: " + e;
    }
  }

  // Format event date
  const formatEventDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()

        if (!userData.user) {
          router.push("/login")
          return
        }

        // Fetch user profile - FIXED: using user_uuid instead of id to match RLS policy
        const { data: profileData, error: profileError } = await supabase
          .from("miembros")
          .select("*")
          .eq("user_uuid", userData.user.id)
          .single()

        if (profileError) {
          console.log("Profile fetch error:", profileError)
          // Don't throw error, just set profile to null
          setProfile(null)
        } else {
          setProfile(profileData)
        }
        setLoading(false)
      } catch (error: unknown) {
        console.error("Error fetching user data:", error)
        setError(error instanceof Error ? error.message : "Failed to load user data")
        setLoading(false)
      }
    }

    checkUser()
  }, [router, supabase])

  // Fetch upcoming events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!profile) return
      
      try {
        setLoadingEvents(true)
        
        // Get events that are upcoming (date is today or in the future)
        const today = new Date().toISOString().split('T')[0] // Format as YYYY-MM-DD
        
        const { data, error } = await supabase
          .from("events")
          .select("id, title, description, date, time, location, created_at")
          .gte('date', today) // Only get events that are today or in the future
          .order('date', { ascending: true })
          .limit(3) // Limit to 3 upcoming events
        
        if (error) {
          console.error("Error fetching events:", error)
          return
        }
        
        setEvents(data || [])
      } catch (err) {
        console.error("Failed to fetch events:", err)
      } finally {
        setLoadingEvents(false)
      }
    }
    
    fetchEvents()
  }, [profile, supabase])
  
  // Fetch recent activity (blog posts and events)
  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!profile) return
      
      try {
        setLoadingActivity(true)
        
        // Get recent blog posts
        const { data: recentPosts, error: postsError } = await supabase
          .from("posts")
          .select("id, title, slug, created_at")
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (postsError) {
          console.error("Error fetching recent posts:", postsError)
        }
        
        // Get recently created events
        const { data: recentEvents, error: eventsError } = await supabase
          .from("events")
          .select("id, title, description, date, time, location, created_at")
          .order('date', { ascending: true })
          .limit(5)
        
        if (eventsError) {
          console.error("Error fetching recent events:", eventsError)
        }
        
        // Combine posts and events into a unified activity feed
        const posts = (recentPosts || []).map((post: Post) => ({
          id: post.id,
          type: 'post' as const,
          title: post.title,
          created_at: post.created_at,
          slug: post.slug
        }))
        
        const eventItems = (recentEvents || []).map((event: Event) => ({
          id: event.id,
          type: 'event' as const,
          title: event.title,
          description: event.description,
          date: event.date,
          time: event.time,
          location: event.location,
          created_at: event.created_at,
        }))
        
        // Combine and sort by created_at (most recent first)
        const combined = [...posts, ...eventItems].sort((a, b) => {
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        }).slice(0, 5) // Take only the 5 most recent items
        
        setRecentActivity(combined)
      } catch (err) {
        console.error("Failed to fetch recent activity:", err)
      } finally {
        setLoadingActivity(false)
      }
    }
    
    fetchRecentActivity()
  }, [profile, supabase])

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
        <div className="flex justify-center w-full">
          <Alert variant="destructive" className="mb-6 max-w-md">
            <AlertDescription className="text-center">{error}</AlertDescription>
          </Alert>
        </div>
        <Button onClick={() => router.push("/login")}>Volver a Iniciar Sesión</Button>
      </div>
    )
  }

  const subscriptionStatus = profile?.subscription_status || "inactive"
  const subscriptionPlan = profile?.subscription_plan || null
  const isMember = subscriptionStatus === "active"

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">Bienvenido a tu área personal</p>
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
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary" />
              Estado de Membresía
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
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
            </div>
            {subscriptionStatus === "active" && subscriptionPlan && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">Plan</p>
                <p className="font-medium">
                  {subscriptionPlan === "annual" ? "Membresía Anual" : "Membresía Familiar"}
                </p>
              </div>
            )}
            <div className="mt-auto pt-4">
              <Link href="/dashboard/membership" className="w-full block">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs w-full transition-all border-black hover:bg-primary hover:text-white hover:border hover:border-black"
                >
                  Ver Detalles
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            {loadingEvents ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            ) : !isMember ? (
              <p className="text-sm text-gray-500">Activa tu membresía para ver eventos</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-gray-500">No hay eventos próximos</p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 2).map(event => (
                  <div key={event.id} className="text-sm">
                    <p className="font-medium line-clamp-1">{event.title}</p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{formatEventDate(event.date)}</span>
                      {event.time && (
                        <>
                          <span className="mx-1">•</span>
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{event.time}</span>
                        </>
                      )}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-auto pt-4">
              <Link href="/dashboard/events" className="w-full block">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs w-full transition-all border-black hover:bg-primary hover:text-white hover:border hover:border-black"
                >
                  Ver Todos los Eventos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Contenido Exclusivo
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <p className="text-sm text-gray-500">
              {subscriptionStatus === "active"
                ? "Accede a contenido exclusivo"
                : "Activa tu membresía para ver contenido"}
            </p>
            
            {isMember && (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium">Contenido destacado:</div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <Image src="/lorenzosanz-bufanda.jpg" alt="Fotos históricas" className="object-cover w-full h-full rounded-sm" />
                    </div>
                    <div className="ml-2 truncate">
                      <p className="text-xs font-medium line-clamp-1">Colección de fotos históricas</p>
                      <p className="text-xs text-gray-500"><Link href="/content/galleries/fotos-historicas" className="hover:underline">Galería</Link> • 45 imágenes</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <Image src="/LorenzoSanzjr-lagalerna.jpg" alt="Entrevista" className="object-cover w-full h-full rounded-sm" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-white/80 flex items-center justify-center">
                          <div className="w-0 h-0 border-y-2 border-y-transparent border-l-3 border-l-primary ml-0.5"></div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-2 truncate">
                      <p className="text-xs font-medium line-clamp-1">Entrevista exclusiva con Lorenzo Sanz</p>
                      <p className="text-xs text-gray-500"><Link href="/dashboard/content/" className="hover:underline">Video</Link> • 100 min</p>
                    </div>
                  </div>
                  {/*<div className="flex items-center">
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <img src="/reportaje-movistar.jpg" alt="La Séptima" className="object-cover w-full h-full rounded-sm" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-white/80 flex items-center justify-center">
                          <div className="w-0 h-0 border-y-2 border-y-transparent border-l-3 border-l-primary ml-0.5"></div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-2 truncate">
                      <p className="text-xs font-medium line-clamp-1">La Séptima: El camino hacia la gloria</p>
                      <p className="text-xs text-gray-500"><Link href="/dashboard/content/" className="hover:underline">Video</Link> • 60 min</p>
                    </div>
                  </div>*/}
                </div>
              </div>
            )}
            
            <div className="mt-auto pt-4">
              <Link href="/dashboard/content" className="w-full block">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs w-full transition-all border-black hover:bg-primary hover:text-white hover:border hover:border-black"
                >
                  Ver Contenido
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium flex items-center">
              <Settings className="mr-2 h-5 w-5 text-primary" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <div className="min-h-[40px]"> {/* Fixed height container for consistent spacing */}
              <p className="text-sm text-gray-500">Gestiona tu perfil y preferencias</p>
            </div>
            <div className="mt-auto pt-4">
              <Link href="/dashboard/settings" className="w-full block">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs w-full transition-all border-black hover:bg-primary hover:text-white hover:border hover:border-black"
                >
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
            {!isMember ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Activa tu membresía para ver la actividad reciente</p>
                <Link href="/membership">
                  <Button className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black">Completar Suscripción</Button>
                </Link>
              </div>
            ) : loadingActivity ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No hay actividad reciente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="border-b pb-4">
                    <div className="flex items-start">
                      {item.type === 'post' ? (
                        <FileTextIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                      ) : (
                        <Calendar className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">
                          {item.type === 'post' ? 'Nuevo artículo publicado' : 'Evento anunciado'}
                        </p>
                        <div className="flex items-center text-sm text-gray-500">
                          <Link 
                            href={item.type === 'post' ? `/blog/${item.slug}` : `/dashboard/events`}
                            className="hover:underline line-clamp-1"
                          >
                            &ldquo;{item.title}&rdquo;
                          </Link>
                          <span className="mx-1">-</span>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                        {item.type === 'event' && item.date && (
                          <p className="text-xs text-gray-500 mt-1">
                            Fecha: {formatEventDate(item.date)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
                <Button variant="outline" className="w-full justify-start transition-all hover:bg-black hover:text-white hover:border hover:border-black">
                  Blog
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="w-full justify-start transition-all hover:bg-black hover:text-white hover:border hover:border-black">
                  Contacto
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" className="w-full justify-start transition-all hover:bg-black hover:text-white hover:border hover:border-black">
                  Sobre Nosotros
                </Button>
              </Link>
              {subscriptionStatus === "active" && (
                <Link href="/dashboard/membership">
                  <Button variant="outline" className="w-full justify-start transition-all hover:bg-black hover:text-white hover:border hover:border-black">
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
