import Link from "next/link"
import { AlertCircle, Loader2, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPaymentTransactionStatusByOrder } from "@/lib/redsys"

export const dynamic = "force-dynamic"

export default async function CardUpdateKoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const orderParam = params.order
  const order = Array.isArray(orderParam) ? orderParam[0] : orderParam
  const status = order ? await getPaymentTransactionStatusByOrder(order) : null

  const isAuthorized = status?.status === "authorized"
  const isPending = status?.status === "pending"

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
        {isAuthorized && <CheckCircle className="h-14 w-14 text-green-600 mx-auto" />}
        {isPending && <Loader2 className="h-14 w-14 text-primary mx-auto animate-spin" />}
        {!isAuthorized && !isPending && <AlertCircle className="h-14 w-14 text-red-500 mx-auto" />}

        <h1 className="text-3xl font-bold text-primary mt-4">
          {isAuthorized ? "Tarjeta actualizada" : isPending ? "Actualizacion en proceso" : "No se pudo actualizar la tarjeta"}
        </h1>

        <p className="text-gray-600 mt-3">
          {isAuthorized
            ? "La actualizacion ha quedado registrada correctamente."
            : isPending
              ? "Redsys aun no ha enviado la confirmacion final."
              : "La operacion fue cancelada o rechazada por el banco. Puedes intentarlo de nuevo."}
        </p>

        {order && <p className="text-sm text-gray-500 mt-2">Pedido: {order}</p>}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button asChild>
            <Link href="/dashboard/membership">Reintentar actualizacion</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Ir al dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
