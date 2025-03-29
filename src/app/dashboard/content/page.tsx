"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Video, Download, AlertTriangle } from "lucide-react"
import type { Database } from "@/types/supabase"

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
}

// Mock content data
const exclusiveContent: ContentItem[] = [
  {
    id: 1,
    title: "Entrevista exclusiva con Fernando Sanz",
    description: "Fernando Sanz nos habla sobre el legado de su padre y comparte anécdotas nunca antes contadas.",
    type: "video",
    date: "2023-11-10",
    duration: "45 min",
    thumbnail: "/placeholder.svg?height=200&width=400",
  },
  {
    id: 2,
    title: "La Séptima: El camino hacia la gloria",
    description:
      "Documental especial sobre el camino del Real Madrid hacia la Séptima Copa de Europa bajo la presidencia de Lorenzo Sanz.",
    type: "video",
    date: "2023-10-15",
    duration: "60 min",
    thumbnail: "/placeholder.svg?height=200&width=400",
  },
  {
    id: 3,
    title: "Guía de viaje: Santiago Bernabéu",
    description: "Todo lo que necesitas saber para disfrutar al máximo de tu visita al estadio Santiago Bernabéu.",
    type: "pdf",
    date: "2023-09-20",
    pages: 25,
    thumbnail: "/placeholder.svg?height=200&width=400",
  },
  {
    id: 4,
    title: "Historia ilustrada del Real Madrid",
    description: "Un recorrido visual por la historia del club desde su fundación hasta la actualidad.",
    type: "pdf",
    date: "2023-08-05",
    pages: 120,
    thumbnail: "/placeholder.svg?height=200&width=400",
  },
  {
    id: 5,
    title: "Colección de fotos históricas",
    description: "Galería de imágenes inéditas de la época de Lorenzo Sanz como presidente del Real Madrid.",
    type: "gallery",
    date: "2023-07-12",
    images: 45,
    thumbnail: "/placeholder.svg?height=200&width=400",
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

  // Initialize Supabase client
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError || !userData.user) {
          router.push("/login")
          return
        }

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("miembros")
          .select("*")
          .eq("auth_id", userData.user.id)
          .single()

        if (profileError) {
          console.log("Profile fetch error:", profileError)
          // Don't throw error, just set profile to null
          setProfile(null)
        } else {
          setProfile(profileData as Profile)
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load user data"
        console.error("Error fetching user data:", err)
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [router, supabase])

  const handleSubscribe = () => {
    router.push("/membership")
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
        <Button onClick={() => router.push("/dashboard")}>Volver al Dashboard</Button>
      </div>
    )
  }

  const subscriptionStatus = profile?.subscription_status || "inactive"
  const isSubscribed = subscriptionStatus === "active"

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Contenido Exclusivo</h1>
        <p className="text-gray-600">Accede a contenido exclusivo disponible solo para socios</p>
      </div>

      {!isSubscribed && (
        <Alert className="mb-8 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-800" />
          <AlertDescription className="text-yellow-800">
            Para acceder al contenido exclusivo, necesitas tener una membresía activa.
            <Link href="/membership" className="font-medium underline ml-1">
              Completa tu suscripción
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <Card className="p-4 border-black/5 mb-8">
        {isSubscribed ? (
          <CardHeader>
            <CardTitle className="font-medium">Membresía Activa</CardTitle>
            <CardDescription>
              Tienes acceso completo a todo el contenido exclusivo de la Peña Madridista Lorenzo Sanz.
            </CardDescription>
          </CardHeader>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="font-medium">Membresía Requerida</CardTitle>
              <CardDescription>
                Hazte socio para acceder a todo el contenido exclusivo de la Peña Madridista Lorenzo Sanz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleSubscribe} className="w-full">
                Suscribirse Ahora
              </Button>
            </CardContent>
          </>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exclusiveContent.map((content) => (
          <Card key={content.id} className="overflow-hidden">
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
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {content.type === "video" && `Duración: ${content.duration}`}
                  {content.type === "pdf" && `${content.pages} páginas`}
                  {content.type === "gallery" && `${content.images} imágenes`}
                </span>
              </div>
              <Button className="w-full" disabled={!isSubscribed}>
                {isSubscribed
                  ? content.type === "video"
                    ? "Ver Video"
                    : content.type === "pdf"
                      ? "Descargar PDF"
                      : "Ver Galería"
                  : "Membresía Requerida"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}