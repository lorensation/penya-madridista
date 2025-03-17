"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Video, Download, AlertTriangle } from "lucide-react"

// Mock content data
const exclusiveContent = [
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

export default function ContentPage() {
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

  const subscriptionStatus = profile?.subscription_status || "inactive"

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Contenido Exclusivo</h1>
        <p className="text-gray-600">Accede a contenido exclusivo disponible solo para socios</p>
      </div>

      {subscriptionStatus !== "active" && (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exclusiveContent.map((content) => (
          <Card key={content.id} className="overflow-hidden">
            <div className="relative h-48">
              <img
                src={content.thumbnail || "/placeholder.svg"}
                alt={content.title}
                className="w-full h-full object-cover"
              />
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
              <Button className="w-full bg-primary hover:bg-secondary" disabled={subscriptionStatus !== "active"}>
                {subscriptionStatus === "active"
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

