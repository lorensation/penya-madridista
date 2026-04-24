import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { EventPaymentResultClient } from "@/components/events/event-payment-result-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEventWhatsappBookingLink } from "@/lib/events"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type EventPaymentOkPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function EventPaymentOkPage({
  params,
  searchParams,
}: EventPaymentOkPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const orderParam = resolvedSearchParams.order
  const order = Array.isArray(orderParam) ? orderParam[0] : orderParam

  if (!order) {
    notFound()
  }

  const admin = createAdminSupabaseClient()
  const { data: event } = await admin
    .from("events")
    .select("id, title, description, date")
    .eq("id", resolvedParams.id)
    .maybeSingle()

  if (!event) {
    notFound()
  }

  const { data: transaction } = await admin
    .from("payment_transactions")
    .select("id, status, context, event_id, redsys_order")
    .eq("redsys_order", order)
    .maybeSingle()

  if (!transaction || transaction.context !== "event" || transaction.event_id !== resolvedParams.id) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>No encontramos este pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                El pedido indicado no corresponde con este evento o todavía no está disponible.
              </p>
              <Button asChild>
                <Link href={`/blog/events/${resolvedParams.id}`}>Volver al evento</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { data: assist } = await admin
    .from("event_external_assists")
    .select("name, email, phone")
    .eq("payment_transaction_id", transaction.id)
    .maybeSingle()

  const status =
    transaction.status === "authorized" || transaction.status === "pending" || transaction.status === "denied"
      ? transaction.status
      : transaction.status === "error"
        ? "error"
        : "not_found"

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>{event.title}</CardTitle>
                <p className="text-sm text-gray-500">
                  Pedido {order} ·{" "}
                  {new Date(event.date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Tu pago ya está en proceso de validación. Cuando esté autorizado, completa tus datos para desbloquear la reserva por WhatsApp.
            </p>
            <EventPaymentResultClient
              eventId={resolvedParams.id}
              order={order}
              status={status}
              whatsappLink={getEventWhatsappBookingLink(event.title)}
              initialAssist={assist}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
