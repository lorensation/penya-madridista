"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, MapPin, Clock, Users, AlertTriangle, CalendarX, PhoneOutgoing } from "lucide-react"

// Define types for our data
interface Event {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  location: string | null
  capacity: number | null
  available: number | null
  image_url: string | null
  created_at: string | null
  updated_at: string | null
}

interface Profile {
  id: string
  subscription_status?: string
  [key: string]: string | number | boolean | null | undefined
}

export default function EventsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (!userData.user) {
          console.log("Auth User fetch error: ", userError)
        }

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("miembros")
          .select("*")
          .eq("id", userData.user?.id || "")
          .single()

        if (profileError) {
          console.log("Profile fetch error:", profileError)
          // Don't throw error, just set profile to null
          setProfile(null)
        } else {
          setProfile(profileData)
        }

        // Fetch events from database
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .order('date', { ascending: true })
        
        if (eventsError) {
          console.error("Error fetching events:", eventsError)
          setError("No se pudieron cargar los eventos. Por favor, inténtalo de nuevo más tarde.")
        } else {
          setEvents(eventsData || [])
        }

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
      <div className="flex justify-center w-full">
        <Alert className="mb-8 bg-red-50 border-red-200 max-w-md">
          <AlertTriangle className="h-4 w-4 text-red-800" />
          <AlertDescription className="text-red-800 text-center">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const subscriptionStatus = profile?.subscription_status || "inactive"

  // Create a WhatsApp chat link for event reservation
  const createWhatsAppLink = (eventTitle: string) => {
    // Format the message for WhatsApp
    const message = encodeURIComponent(`Hola, me gustaría reservar una plaza para el evento: ${eventTitle}`);
    return `https://wa.me/34679240500?text=${message}`; // Replace with your actual WhatsApp number
  };

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

      {events.length === 0 ? (
        <div className="text-center py-16">
          <CalendarX className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No hay eventos disponibles</h3>
          <p className="text-gray-600 mb-8">
            Actualmente no hay eventos programados. Vuelve a consultar pronto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden flex flex-col h-full">
              <div className="relative h-48">
                <Image 
                  src={event.image_url || "/placeholder.svg"} 
                  alt={event.title} 
                  fill 
                  className="object-cover" 
                />
              </div>
              <CardHeader className="pb-2">
                <CardTitle>{event.title}</CardTitle>
                <CardDescription>{event.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-grow">
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
                  {event.time && (
                    <div className="flex items-start">
                      <Clock className="h-4 w-4 text-primary mr-2 mt-0.5" />
                      <span className="text-sm">{event.time} h</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 text-primary mr-2 mt-0.5" />
                      <span className="text-sm">{event.location}</span>
                    </div>
                  )}
                  {event.capacity && event.available !== null && (
                    <div className="flex items-start">
                      <Users className="h-4 w-4 text-primary mr-2 mt-0.5" />
                      <span className="text-sm">
                        {event.available} plazas disponibles de {event.capacity}
                      </span>
                    </div>
                  )}
                </div>
                <a 
                  href={createWhatsAppLink(event.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-auto"
                >
                  <Button 
                    className={`w-full transition-all flex items-center justify-center gap-2 
                    ${subscriptionStatus === "active" 
                      ? "hover:bg-white hover:text-primary hover:border hover:border-black" 
                      : "bg-gray-400 hover:bg-gray-500 cursor-not-allowed"}`} 
                    disabled={subscriptionStatus !== "active"}
                  >
                    <PhoneOutgoing className="h-4 w-4" />
                    {subscriptionStatus === "active" ? "Reservar Plaza por WhatsApp" : "Membresía Requerida"}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}