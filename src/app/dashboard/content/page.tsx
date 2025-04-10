"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Video, Download, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase"

// Define types for our content
interface ContentItem {
  id: number
  title: string
  description: string
  type: "video" | "pdf" | "gallery"
  date: string
  duration?: string
  pages?: number
  images?: number
  thumbnail: string
  url: string 
}

const exclusiveContent: ContentItem[] = [
  {
    id: 1,
    title: "Entrevista exclusiva con Fernando Sanz",
    description: "Fernando Sanz nos habla sobre el legado de su padre y comparte anécdotas nunca antes contadas.",
    type: "video",
    date: "2023-11-10",
    duration: "45 min",
    thumbnail: "/fernandosanz-charla.jpg",
    url: "https://youtu.be/7hREq-thSEU?si=_ctHiXIRb-5Fso56"
  },
  {
    id: 2,
    title: "La Séptima: El camino hacia la gloria",
    description:
      "Documental especial sobre el camino del Real Madrid hacia la Séptima Copa de Europa bajo la presidencia de Lorenzo Sanz.",
    type: "video",
    date: "2023-10-15",
    duration: "60 min",
    thumbnail: "/reportaje-movistar.jpg",
    url: "https://youtu.be/jBbeZ5s04EI?si=Qdm0-UCOlbNw9XSF"
  },
  {
    id: 3,
    title: "Guía de viaje: Santiago Bernabéu",
    description: "Todo lo que necesitas saber para disfrutar al máximo de tu visita al estadio Santiago Bernabéu.",
    type: "pdf",
    date: "2023-09-20",
    pages: 5,
    thumbnail: "/santiagobernabeu.jpg",
    url: "https://www.esmadrid.com/informacion-turistica/estadio-santiago-bernabeu"
  },
  {
    id: 4,
    title: "Historia ilustrada del Real Madrid",
    description: "Un recorrido visual por la historia del club desde su fundación hasta la actualidad.",
    type: "pdf",
    date: "2023-08-05",
    pages: 120,
    thumbnail: "/Logo-Penya-LS.jpg",
    url: "/content/pdfs/historia-ilustrada"
  },
  {
    id: 5,
    title: "Colección de fotos históricas",
    description: "Galería de imágenes inéditas de la época de Lorenzo Sanz como presidente del Real Madrid.",
    type: "gallery",
    date: "2023-07-12",
    images: 45,
    thumbnail: "/lorenzosanz-bufanda.jpg",
    url: "/content/galleries/fotos-historicas"
  },
  {
    id: 6,
    title: "Entrevista exclusiva con Lorenzo Sanz",
    description: "Lorenzo Sanz hijo nos cuenta como su padre revolucionó el ámbito de la gestión deportiva y otros temas.",
    type: "video",
    date: "2025-03-08",
    duration: "100 min",
    thumbnail: "/LorenzoSanzjr-lagalerna.jpg",
    url: "/content/galleries/fotos-historicas"
  },
]

// Define types for profile
interface Profile {
  id: string
  subscription_status: string
  [key: string]: string | null | boolean | number
}

export default function ContentPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Initialize Supabase client
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    
    const checkUser = async () => {
      try {
        // First check if user is authenticated - using getSession instead of directly checking for user
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("Session error:", sessionError)
          if (isMounted) {
            setError("Error al verificar la sesión")
            setLoading(false)
          }
          return
        }
        
        if (!sessionData.session) {
          console.log("No active session found")
          if (isMounted) {
            setLoading(false)
            router.push("/login")
          }
          return
        }
        
        // User is authenticated, set state
        if (isMounted) {
          setIsAuthenticated(true)
        }
        
        // Now get the user data using the session's user
        const userId = sessionData.session.user.id;
        
        // Fetch user profile directly using the session's user ID
        const { data: profileData, error: profileError } = await supabase
          .from("miembros")
          .select("*")
          .eq("id", userId)
          .single()

        if (profileError) {
          console.log("Profile fetch error:", profileError)
          // Don't throw error, just set profile to null
          if (isMounted) {
            setProfile(null)
          }
        } else if (isMounted) {
          setProfile(profileData as Profile)
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load user data"
        console.error("Error fetching user data:", err)
        if (isMounted) {
          setError(errorMsg)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkUser()
    
    // Cleanup function to prevent state updates after component unmount
    return () => {
      isMounted = false;
    }
  }, [router, supabase])

  // Add a listener for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true)
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false)
          router.push('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

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

  // If not authenticated, show loading while redirecting
  if (!isAuthenticated) {
    router.push("/login")
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    )
  }

  // Display error message if there was an error loading the profile
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center w-full">
          <Alert className="mb-8 bg-red-50 border-red-200 max-w-md">
            <AlertTriangle className="h-4 w-4 text-red-800" />
            <AlertDescription className="text-red-800 text-center">{error}</AlertDescription>
          </Alert>
        </div>
        <Button 
          onClick={() => router.push("/dashboard")}
          className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black"
        >
          Volver al Dashboard
        </Button>
      </div>
    )
  }

  const subscriptionStatus = profile?.subscription_status || "inactive"
  const isSubscribed = subscriptionStatus === "active"

  // Fallback UI for non-members
  if (!isSubscribed) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Contenido Exclusivo</h1>
          <p className="text-gray-500">Accede a contenido exclusivo disponible solo para socios</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="bg-gray-50 border-dashed">
          <CardHeader>
            <CardTitle>Contenido Premium</CardTitle>
            <CardDescription>
              El contenido exclusivo solo está disponible para miembros con suscripción activa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No tienes una membresía activa. Hazte socio para acceder a todo nuestro contenido exclusivo.
              </AlertDescription>
            </Alert>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">¿Qué incluye nuestro contenido exclusivo?</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Entrevistas exclusivas con jugadores y leyendas del Real Madrid</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Documentales sobre la historia del club y momentos históricos</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Guías de viaje para visitar el Santiago Bernabéu y Madrid</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Galerías de fotos históricas y material de archivo exclusivo</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Análisis tácticos y contenido educativo sobre fútbol</span>
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => router.push("/dashboard")}
              className="transition-all bg-white border-black text-black hover:bg-black hover:text-white hover:border-black"
            >
              Volver al Dashboard
            </Button>
            <Button 
              onClick={() => router.push("/dashboard/membership")}
              className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black"
            >
              Ver Planes de Membresía
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vista previa de contenido</CardTitle>
            <CardDescription>Algunos ejemplos del contenido exclusivo disponible para miembros</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {exclusiveContent.slice(0, 3).map((content, index) => (
                <div key={index} className="relative h-40 rounded-md overflow-hidden opacity-70 hover:opacity-60 transition-opacity">
                  <Image 
                    src={content.thumbnail} 
                    alt={content.title} 
                    fill 
                    className="object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white text-center p-4">
                      <p className="font-medium">{content.title}</p>
                      <p className="text-xs mt-1">Disponible con membresía</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Contenido Exclusivo</h1>
        <p className="text-gray-600">Accede a contenido exclusivo disponible solo para socios</p>
      </div>

      <Card className="p-4 border-black/5 mb-8">
        <CardHeader>
          <CardTitle className="font-medium">Membresía Activa</CardTitle>
          <CardDescription>
            Tienes acceso completo a todo el contenido exclusivo de la Peña Madridista Lorenzo Sanz.
          </CardDescription>
        </CardHeader>
      </Card>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exclusiveContent.map((content) => (
          <Card key={content.id} className="overflow-hidden flex flex-col h-full">
            <div className="relative h-48">
              <Image src={content.thumbnail || "/placeholder.svg"} alt={content.title} fill className="object-cover" />
              {content.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center">
                    <div className="w-0 h-0 border-y-8 border-y-transparent border-l-12 border-l-primary ml-1"></div>
                  </div>
                </div>
              )}
            </div>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {content.type === "video" && <Video className="h-4 w-4 text-primary mr-2" />}
                  {content.type === "pdf" && <FileText className="h-4 w-4 text-primary mr-2" />}
                  {content.type === "gallery" && <Download className="h-4 w-4 text-primary mr-2" />}
                  <span className="text-xs text-gray-500 uppercase">
                    {content.type === "video" ? "Video" : content.type === "pdf" ? "PDF" : "Galería"}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(content.date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <CardTitle className="text-lg">{content.title}</CardTitle>
              <CardDescription>{content.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-sm text-gray-500">
                {content.type === "video" && `Duración: ${content.duration}`}
                {content.type === "pdf" && `${content.pages} páginas`}
                {content.type === "gallery" && `${content.images} imágenes`}
              </div>
            </CardContent>
            <CardFooter className="mt-auto pt-4">
              <Button 
                className="w-full transition-colors hover:bg-white hover:text-primary hover:border hover:border-black"
                onClick={() => router.push(content.url)}
              >
                {content.type === "video"
                  ? "Ver Video"
                  : content.type === "pdf"
                    ? "Descargar PDF"
                    : "Ver Galería"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}