import Link from "next/link"
import Image from "next/image"
import { Calendar, Clock, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createUpcomingVisibleEventsQuery } from "@/lib/events"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/supabase"
import { formatShopPrice } from "@/lib/utils"

export const dynamic = "force-dynamic"

type BlogEventCard = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "title" | "description" | "date" | "time" | "location" | "image_url" | "one_time_price_cents"
>

async function getBlogPosts() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching blog posts:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    return []
  }
}

async function getUpcomingEvents() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await createUpcomingVisibleEventsQuery(
      supabase,
      "id, title, description, date, time, location, image_url, one_time_price_cents",
    ).limit(6)

    if (error) {
      console.error("Error fetching upcoming events:", error)
      return []
    }

    return ((data as unknown as BlogEventCard[] | null) ?? [])
  } catch (error) {
    console.error("Error fetching upcoming events:", error)
    return []
  }
}

export default async function Blog() {
  const [blogPosts, upcomingEvents] = await Promise.all([getBlogPosts(), getUpcomingEvents()])

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h1 className="mb-4 text-3xl font-bold text-primary md:text-4xl">Blog</h1>
          <p className="text-lg text-gray-600">
            Noticias, historias y eventos relacionados con la Peña Lorenzo Sanz y el Real Madrid.
          </p>
        </div>

        <section className="mb-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Próximos eventos</p>
              <h2 className="mt-2 text-2xl font-bold text-primary md:text-3xl">
                Vive los próximos encuentros de la peña
              </h2>
            </div>
            {upcomingEvents.length > 0 && (
              <Button variant="outline" asChild>
                <Link href="/dashboard/events">Ver todos</Link>
              </Button>
            )}
          </div>

          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-600">
                No hay eventos públicos próximos en este momento.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {upcomingEvents.map((event) => (
                <Link key={event.id} href={`/blog/events/${event.id}`} className="group block h-full">
                  <Card className="flex h-full flex-col overflow-hidden transition-shadow group-hover:shadow-lg">
                    <div className="relative h-52 bg-gray-100">
                      <Image
                        src={event.image_url || "/placeholder.svg?height=400&width=600"}
                        alt={event.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                    <CardHeader className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Evento</Badge>
                        {typeof event.one_time_price_cents === "number" && event.one_time_price_cents > 0 && (
                          <Badge variant="outline">{formatShopPrice(event.one_time_price_cents)}</Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col">
                      <p className="mb-4 line-clamp-3 text-sm text-gray-600">
                        {event.description || "Consulta toda la información y reserva tu plaza desde la ficha del evento."}
                      </p>
                      <div className="mt-auto space-y-2 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                          <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                          <span>
                            {new Date(event.date).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {event.time && (
                          <div className="flex items-start gap-2">
                            <Clock className="mt-0.5 h-4 w-4 text-primary" />
                            <span>{event.time} h</span>
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          {blogPosts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-gray-600">No hay artículos publicados aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post) => (
                <div key={post.id} className="overflow-hidden rounded-lg bg-white shadow-md">
                  <div className="relative h-48">
                    <Image
                      src={post.image_url || "/placeholder.svg?height=400&width=600"}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="mb-2 flex items-center text-sm text-gray-500">
                      <span>{post.category}</span>
                      <span className="mx-2">•</span>
                      <span>
                        {post.created_at
                          ? new Date(post.created_at).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                    <h2 className="mb-2 line-clamp-2 text-xl font-bold text-primary">{post.title}</h2>
                    <p className="mb-4 line-clamp-3 text-gray-600">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Por {post.author}</span>
                      <Link href={`/blog/${post.slug}`}>
                        <Button
                          variant="outline"
                          className="text-sm border-primary text-primary hover:bg-primary hover:text-white"
                        >
                          Leer más
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
