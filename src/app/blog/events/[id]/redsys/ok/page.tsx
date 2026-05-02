import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { EventPaymentResultClient } from "@/components/events/event-payment-result-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEventWhatsappBookingLink } from "@/lib/events"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"

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

  const eventPath = `/blog/events/${resolvedParams.id}`
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`${eventPath}/redsys/ok?order=${order}`)}`)
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
    .select("id, status, context, event_id, redsys_order, member_id")
    .eq("redsys_order", order)
    .maybeSingle()

  if (
    !transaction ||
    transaction.context !== "event" ||
    transaction.event_id !== resolvedParams.id ||
    transaction.member_id !== user.id
  ) {
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
    .from("event_assists")
    .select("name, email, apellido1, apellido2, phone, data_confirmed_at")
    .eq("payment_transaction_id", transaction.id)
    .maybeSingle()

  const [{ data: memberProfile }, { data: userProfile }] = assist
    ? [{ data: null }, { data: null }]
    : await Promise.all([
        admin
          .from("miembros")
          .select("email, name, apellido1, apellido2, telefono")
          .eq("user_uuid", user.id)
          .maybeSingle(),
        admin
          .from("users")
          .select("email, name")
          .eq("id", user.id)
          .maybeSingle(),
      ])

  const initialAssist = assist
    ? {
        name: assist.name,
        email: assist.email,
        apellido1: assist.apellido1 ?? "",
        apellido2: assist.apellido2 ?? "",
        phone: assist.phone ?? "",
        confirmedAt: assist.data_confirmed_at,
      }
    : {
        name: memberProfile?.name ?? userProfile?.name ?? "",
        email: memberProfile?.email ?? userProfile?.email ?? user.email ?? "",
        apellido1: memberProfile?.apellido1 ?? "",
        apellido2: memberProfile?.apellido2 ?? "",
        phone: memberProfile?.telefono ? String(memberProfile.telefono) : "",
        confirmedAt: null,
      }

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
              initialAssist={initialAssist}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
