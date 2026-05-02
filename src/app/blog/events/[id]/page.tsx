import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicEventDetailClient } from "@/components/events/public-event-detail-client"
import { createUpcomingVisibleEventsQuery, getEventWhatsappBookingLink, getViewerEventAccess } from "@/lib/events"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import type { Database } from "@/types/supabase"
import { formatShopPrice } from "@/lib/utils"

export const dynamic = "force-dynamic"

type EventDetailRow = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "title" | "description" | "date" | "time" | "location" | "capacity" | "available" | "image_url" | "one_time_price_cents"
>

type EventDetailPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const resolvedParams = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: event, error: eventError } = await createUpcomingVisibleEventsQuery(
    supabase,
    "id, title, description, date, time, location, capacity, available, image_url, one_time_price_cents",
  )
    .eq("id", resolvedParams.id)
    .maybeSingle()

  if (eventError || !event) {
    notFound()
  }

  const eventData = event as unknown as EventDetailRow

  const subscription = user
    ? (
        await supabase
          .from("subscriptions")
          .select("status, end_date")
          .eq("member_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data
    : null

  const viewerAccess = getViewerEventAccess(user, {
    status: subscription?.status ?? null,
    endDate: subscription?.end_date ?? null,
  })
  const whatsappLink = getEventWhatsappBookingLink(eventData.title)
  const eventPath = `/blog/events/${eventData.id}`
  let ticketStatus: { order: string; confirmed: boolean } | null = null

  if (user && viewerAccess === "authenticated_non_member") {
    const admin = createAdminSupabaseClient()
    const { data: assist } = await admin
      .from("event_assists")
      .select("redsys_order, data_confirmed_at")
      .eq("event_id", eventData.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (assist?.redsys_order) {
      ticketStatus = {
        order: assist.redsys_order,
        confirmed: Boolean(assist.data_confirmed_at),
      }
    } else {
      const { data: transaction } = await admin
        .from("payment_transactions")
        .select("redsys_order")
        .eq("context", "event")
        .eq("event_id", eventData.id)
        .eq("member_id", user.id)
        .eq("status", "authorized")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (transaction?.redsys_order) {
        ticketStatus = {
          order: transaction.redsys_order,
          confirmed: false,
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Eventos</p>
            <h1 className="mt-2 text-3xl font-bold text-primary md:text-4xl">{eventData.title}</h1>
          </div>
          <Button variant="outline" asChild>
            <Link href="/blog">Volver al blog</Link>
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_380px]">
          <article className="overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="relative h-72 w-full bg-gray-100 md:h-[28rem]">
              <Image
                src={eventData.image_url || "/placeholder.svg"}
                alt={eventData.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
            </div>

            <div className="space-y-6 p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">Evento público</Badge>
                {typeof eventData.one_time_price_cents === "number" && eventData.one_time_price_cents > 0 ? (
                  <Badge variant="outline">{formatShopPrice(eventData.one_time_price_cents)}</Badge>
                ) : (
                  <Badge variant="outline">Reserva para socios</Badge>
                )}
              </div>

              <div className="grid gap-4 rounded-xl border bg-gray-50 p-5 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fecha</p>
                    <p className="font-medium">
                      {new Date(eventData.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {eventData.time && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Hora</p>
                      <p className="font-medium">{eventData.time} h</p>
                    </div>
                  </div>
                )}

                {eventData.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Ubicación</p>
                      <p className="font-medium">{eventData.location}</p>
                    </div>
                  </div>
                )}

                {eventData.capacity && eventData.available !== null && (
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Plazas</p>
                      <p className="font-medium">
                        {eventData.available} disponibles de {eventData.capacity}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="prose max-w-none">
                <p className="whitespace-pre-line text-base leading-7 text-gray-700">
                  {eventData.description || "Pronto compartiremos más información sobre este evento."}
                </p>
              </div>
            </div>
          </article>

          <aside>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Reserva tu plaza</CardTitle>
              </CardHeader>
              <CardContent>
                <PublicEventDetailClient
                  eventId={eventData.id}
                  oneTimePriceCents={eventData.one_time_price_cents}
                  viewerAccess={viewerAccess}
                  whatsappLink={whatsappLink}
                  eventPath={eventPath}
                  ticketStatus={ticketStatus}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
