"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { hasMembershipAccess } from "@/lib/membership-access"
import { getLatestSubscriptionByUserId } from "@/lib/data/subscription"
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

interface Subscription {
  status: string | null
  end_date: string | null
}

export default function EventsPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (!userData.user) {
          console.log("Auth User fetch error: ", userError)
          setLoading(false)
          return
        }

        const userId = userData.user.id

        const { data: subscriptionData, error: subscriptionError } = await getLatestSubscriptionByUserId(
          supabase,
          userId,
        )

        if (subscriptionError) {
          console.error("Subscription fetch error:", subscriptionError)
          setSubscription(null)
        } else {
          setSubscription(
            subscriptionData
              ? {
                  status: subscriptionData.status,
                  end_date: subscriptionData.end_date,
                }
              : null,
          )
        }

        // Fetch events from database
        const { data: eventsData, error: eventsError } = await supabase
          .from("events")
          .select("*")
          .order('date', { ascending: true })
        
        if (eventsError) {
          console.error("Error fetching events:", eventsError)
          setError("No se pudieron cargar los eventos. Por favor, intÃ©ntalo de nuevo mÃ¡s tarde.")
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

  const subscriptionStatus = subscription?.status || "inactive"
  const hasPrivilegedAccess = hasMembershipAccess({
    status: subscriptionStatus,
    endDate: subscription?.end_date ?? null,
  })

  // Create a WhatsApp chat link for event reservation
  const createWhatsAppLink = (eventTitle: string) => {
    // Format the message for WhatsApp
    const message = encodeURIComponent(`Hola, me gustarÃ­a reservar una plaza para el evento: ${eventTitle}`);
    return `https://wa.me/34665652251?text=${message}`; // Replace with your actual WhatsApp number
  };

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Eventos</h1>
        <p className="text-gray-500">Descubre y reserva tu plaza en los prÃ³ximos eventos exclusivos para socios</p>
      </div>

      {!hasPrivilegedAccess && (
        <Alert className="mb-8 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-800" />
          <AlertDescription className="text-yellow-800">
            Para reservar plazas en los eventos, necesitas tener una membresÃ­a activa.
            <Link href="/membership" className="font-medium underline ml-1">
              Completa tu suscripciÃ³n
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
              <div className="relative h-48 min-h-[200px] md:h-56 lg:h-64">
                <Image 
                  src={event.image_url || "/placeholder.svg"} 
                  alt={event.title} 
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority 
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
                                {hasPrivilegedAccess ? (
                  <a
                    href={createWhatsAppLink(event.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-auto"
                  >
                    <Button className="w-full transition-all flex items-center justify-center gap-2 hover:bg-white hover:text-primary hover:border hover:border-black">
                      <PhoneOutgoing className="h-4 w-4" />
                      Reservar Plaza por WhatsApp
                    </Button>
                  </a>
                ) : (
                  <div className="w-full mt-auto space-y-2">
                    <Button
                      className="w-full transition-all flex items-center justify-center gap-2 bg-gray-400 hover:bg-gray-500 cursor-not-allowed"
                      disabled
                      aria-disabled="true"
                    >
                      <PhoneOutgoing className="h-4 w-4" />
                      Membresia Requerida
                    </Button>
                    <Link href="/membership" className="block text-center text-xs text-primary hover:underline">
                      Hazte miembro
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


