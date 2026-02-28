import Link from "next/link"
import { CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getPaymentTransactionStatusByOrder } from "@/lib/redsys"
import { ClearCartOnMount } from "@/components/shop/clear-cart-on-mount"

export const dynamic = "force-dynamic"

export default async function ShopRedsysOkPage({
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
      {isAuthorized && <ClearCartOnMount />}

      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
        {isAuthorized && <CheckCircle className="h-14 w-14 text-green-600 mx-auto" />}
        {isPending && <Loader2 className="h-14 w-14 text-primary mx-auto animate-spin" />}
        {!isAuthorized && !isPending && <AlertCircle className="h-14 w-14 text-amber-500 mx-auto" />}

        <h1 className="text-3xl font-bold text-primary mt-4">
          {isAuthorized ? "Pedido confirmado" : isPending ? "Pedido en proceso" : "Estamos verificando tu pedido"}
        </h1>

        <p className="text-gray-600 mt-3">
          {isAuthorized
            ? "Hemos recibido la autorizacion del pago y tu pedido se esta preparando."
            : isPending
              ? "La pasarela aun no ha confirmado el resultado final. Refresca en unos segundos."
              : "No encontramos confirmacion para ese pedido. Si el cargo aparece, se reconciliara automaticamente."}
        </p>

        {order && <p className="text-sm text-gray-500 mt-2">Pedido: {order}</p>}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button asChild>
            <Link href="/tienda">Seguir comprando</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Ir a mi cuenta</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
