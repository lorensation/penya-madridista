"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { hasMembershipAccess } from "@/lib/membership-access"
import { getLatestSubscriptionByUserId } from "@/lib/data/subscription"
import { createUpcomingVisibleEventsQuery, getEventWhatsappBookingLink } from "@/lib/events"
import { formatShopPrice } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, MapPin, Clock, Users, AlertTriangle, CalendarX, PhoneOutgoing, Ticket } from "lucide-react"

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
  one_time_price_cents: number | null
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
    const loadPage = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (!userData.user) {
          console.log("Auth User fetch error: ", userError)
          setLoading(false)
          return
        }

        const userId = userData.user.id
        const [subscriptionResult, eventsResult] = await Promise.all([
          getLatestSubscriptionByUserId(supabase, userId),
          createUpcomingVisibleEventsQuery(supabase),
        ])

        if (subscriptionResult.error) {
          console.error("Subscription fetch error:", subscriptionResult.error)
          setSubscription(null)
        } else {
          setSubscription(
            subscriptionResult.data
              ? {
                  status: subscriptionResult.data.status,
                  end_date: subscriptionResult.data.end_date,
                }
              : null,
          )
        }

        if (eventsResult.error) {
          console.error("Error fetching events:", eventsResult.error)
          setError("No se pudieron cargar los eventos. Por favor, inténtalo de nuevo más tarde.")
        } else {
          setEvents(((eventsResult.data as unknown as Event[] | null) ?? []))
        }
      } catch (loadError: unknown) {
        console.error("Error loading dashboard events page:", loadError)
        setError(loadError instanceof Error ? loadError.message : "Failed to load events")
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center w-full">
        <Alert className="mb-8 max-w-md border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-800" />
          <AlertDescription className="text-center text-red-800">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const subscriptionStatus = subscription?.status || "inactive"
  const hasPrivilegedAccess = hasMembershipAccess({
    status: subscriptionStatus,
    endDate: subscription?.end_date ?? null,
  })

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Eventos</h1>
        <p className="text-gray-500">
          Consulta los próximos eventos de la peña. Los socios reservan por WhatsApp y los usuarios autenticados sin
          suscripción pueden comprar una entrada puntual.
        </p>
      </div>

      {!hasPrivilegedAccess && (
        <Alert className="mb-8 border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-800" />
          <AlertDescription className="text-yellow-800">
            Puedes comprar entradas puntuales para los eventos disponibles o{" "}
            <Link href="/membership" className="ml-1 font-medium underline">
              hacerte socio
            </Link>{" "}
            para reservar directamente por WhatsApp.
          </AlertDescription>
        </Alert>
      )}

      {events.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarX className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-xl font-medium text-gray-700">No hay eventos disponibles</h3>
          <p className="mb-8 text-gray-600">Actualmente no hay eventos próximos programados. Vuelve a consultar pronto.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="flex h-full flex-col overflow-hidden">
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
              <CardContent className="flex flex-grow flex-col">
                <div className="mb-4 space-y-3">
                  <div className="flex items-start">
                    <Calendar className="mr-2 mt-0.5 h-4 w-4 text-primary" />
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
                      <Clock className="mr-2 mt-0.5 h-4 w-4 text-primary" />
                      <span className="text-sm">{event.time} h</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-start">
                      <MapPin className="mr-2 mt-0.5 h-4 w-4 text-primary" />
                      <span className="text-sm">{event.location}</span>
                    </div>
                  )}
                  {event.capacity && event.available !== null && (
                    <div className="flex items-start">
                      <Users className="mr-2 mt-0.5 h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {event.available} plazas disponibles de {event.capacity}
                      </span>
                    </div>
                  )}
                  {typeof event.one_time_price_cents === "number" && event.one_time_price_cents > 0 && (
                    <div className="flex items-start">
                      <Ticket className="mr-2 mt-0.5 h-4 w-4 text-primary" />
                      <span className="text-sm">Entrada puntual: {formatShopPrice(event.one_time_price_cents)}</span>
                    </div>
                  )}
                </div>

                {hasPrivilegedAccess ? (
                  <a
                    href={getEventWhatsappBookingLink(event.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto w-full"
                  >
                    <Button className="flex w-full items-center justify-center gap-2 transition-all hover:border hover:border-black hover:bg-white hover:text-primary">
                      <PhoneOutgoing className="h-4 w-4" />
                      Reservar por WhatsApp
                    </Button>
                  </a>
                ) : (
                  <div className="mt-auto space-y-2">
                    <Button asChild className="w-full">
                      <Link href={`/blog/events/${event.id}`}>
                        {typeof event.one_time_price_cents === "number" && event.one_time_price_cents > 0
                          ? "Comprar entrada"
                          : "Ver detalles"}
                      </Link>
                    </Button>
                    <Link
                      href={`/blog/events/${event.id}`}
                      className="block text-center text-xs text-primary hover:underline"
                    >
                      Más información del evento
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
