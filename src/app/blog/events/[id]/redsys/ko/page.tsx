import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminSupabaseClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

type EventPaymentKoPageProps = {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function EventPaymentKoPage({
  params,
  searchParams,
}: EventPaymentKoPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const orderParam = resolvedSearchParams.order
  const order = Array.isArray(orderParam) ? orderParam[0] : orderParam

  const admin = createAdminSupabaseClient()
  const { data: event } = await admin
    .from("events")
    .select("id, title")
    .eq("id", resolvedParams.id)
    .maybeSingle()

  if (!event) {
    redirect("/blog")
  }

  const transaction = order
    ? (
        await admin
          .from("payment_transactions")
          .select("status, context, event_id")
          .eq("redsys_order", order)
          .maybeSingle()
      ).data
    : null

  if (transaction?.status === "authorized" && transaction.context === "event" && transaction.event_id === resolvedParams.id) {
    redirect(`/blog/events/${resolvedParams.id}/redsys/ok?order=${encodeURIComponent(order!)}`)
  }

  const isPending = transaction?.status === "pending"

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{event.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {isPending ? (
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            ) : (
              <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            )}

            <h2 className="text-2xl font-semibold text-primary">
              {isPending ? "Pago en proceso" : "Pago cancelado o denegado"}
            </h2>
            <p className="text-sm text-gray-600">
              {isPending
                ? "La pasarela aún no nos ha confirmado el resultado final. Si el pago termina autorizándose, te llevaremos al paso final."
                : "No pudimos confirmar el pago. Puedes volver al evento y reintentar la compra cuando quieras."}
            </p>

            {order && <p className="text-xs text-gray-500">Pedido: {order}</p>}

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link href={`/blog/events/${resolvedParams.id}`}>Volver al evento</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/blog">Ir al blog</Link>
              </Button>
            </div>

            {isPending && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-left">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-700" />
                  <p className="text-sm text-green-900">
                    Si Redsys termina autorizando el cargo, la siguiente visita te llevará automáticamente al paso donde podrás registrar tus datos y desbloquear WhatsApp.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
