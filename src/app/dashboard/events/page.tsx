"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, MapPin, Clock, Users, AlertTriangle } from "lucide-react"

// Define types for our data
interface Event {
  id: number
  title: string
  description: string
  date: string
  time: string
  location: string
  capacity: number
  available: number
  image: string
}

interface Profile {
  id: string
  subscription_status?: string
  // Replace any with a more specific type
  [key: string]: string | number | boolean | null | undefined
}

// Mock events data
const events: Event[] = [
  {
    id: 1,
    title: "Cena Anual de Socios",
    description:
      "Cena de gala para celebrar el aniversario de la peña con la presencia de exjugadores del Real Madrid.",
    date: "2023-12-15",
    time: "20:00",
    location: "Hotel Meliá Castilla, Madrid",
    capacity: 150,
    available: 72,
    image: "/placeholder.svg?height=200&width=400",
  },
  {
    id: 2,
    title: "Viaje a París - Champions League",
    description:
      "Viaje organizado para ver el partido de Champions League contra el PSG en el Parque de los Príncipes.",
    date: "2024-02-10",
    time: "21:00",
    location: "París, Francia",
    capacity: 50,
    available: 8,
    image: "/placeholder.svg?height=200&width=400",
  },
  {
    id: 3,
    title: "Charla con Fernando Hierro",
    description:
      "Coloquio exclusivo con Fernando Hierro sobre la época dorada del Real Madrid bajo la presidencia de Lorenzo Sanz.",
    date: "2024-01-20",
    time: "18:30",
    location: "Sede de la Peña, Madrid",
    capacity: 80,
    available: 35,
    image: "/placeholder.svg?height=200&width=400",
  },
]

export default function EventsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null) // Renamed to use it later

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()

        if (!userData.user) {
          router.push("/login")
          return
        }

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userData.user.id)
          .single()

        if (profileError) throw profileError

        setProfile(profileData)
        setLoading(false)
      } catch (error: unknown) {
        console.error("Error fetching user data:", error)
        setError(error instanceof Error ? error.message : "Failed to load user data")
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

  // Display error message if there was an error
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-8 bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-800" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const subscriptionStatus = profile?.subscription_status || "inactive"

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Eventos</h1>
        <p className="text-gray-600">Descubre y reserva tu plaza en los próximos eventos exclusivos para socios</p>
      </div>

      {subscriptionStatus !== "active" && (
        <Alert className="mb-8 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-800" />
          <AlertDescription className="text-yellow-800">
            Para reservar plazas en los eventos, necesitas tener una membresía activa.
            <Link href="/membership" className="font-medium underline ml-1">
              Completa tu suscripción
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card key={event.id} className="overflow-hidden">
            <div className="relative h-48">
              <Image 
                src={event.image || "/placeholder.svg"} 
                alt={event.title} 
                fill
                className="object-cover"
              />
            </div>
            <CardHeader className="pb-2">
              <CardTitle>{event.title}</CardTitle>
              <CardDescription>{event.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                <div className="flex items-start">
                  <Calendar className="h-4 w-4 text-primary mr-2 mt-0.5" />
                  <span className="text-sm">
                    {new Date(event.date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-start">
                  <Clock className="h-4 w-4 text-primary mr-2 mt-0.5" />
                  <span className="text-sm">{event.time} h</span>
                </div>
                <div className="flex items-start">
                  <MapPin className="h-4 w-4 text-primary mr-2 mt-0.5" />
                  <span className="text-sm">{event.location}</span>
                </div>
                <div className="flex items-start">
                  <Users className="h-4 w-4 text-primary mr-2 mt-0.5" />
                  <span className="text-sm">
                    {event.available} plazas disponibles de {event.capacity}
                  </span>
                </div>
              </div>
              <Button className="w-full bg-primary hover:bg-secondary" disabled={subscriptionStatus !== "active"}>
                {subscriptionStatus === "active" ? "Reservar Plaza" : "Membresía Requerida"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}