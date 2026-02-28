"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RedsysRedirectAutoSubmitForm } from "@/components/payments/redsys-redirect-form"
import { prepareShopRedirectPayment } from "@/app/actions/payment"
import { useCartStore, initializeStore } from "@/stores/cart"
import { formatShopPrice } from "@/lib/utils"
import type { RedsysSignedRequest } from "@/lib/redsys"

type CheckoutStep = "shipping" | "processing" | "redirecting"

const FIXED_SHIPPING_CENTS = 500

export default function CheckoutPage() {
  const router = useRouter()

  const [isClient, setIsClient] = useState(false)
  const [step, setStep] = useState<CheckoutStep>("shipping")
  const [error, setError] = useState<string | null>(null)

  const [redirectActionUrl, setRedirectActionUrl] = useState<string | null>(null)
  const [redirectSigned, setRedirectSigned] = useState<RedsysSignedRequest | null>(null)

  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Espana",
    phone: "",
  })

  const { items, getTotal } = useCartStore()

  useEffect(() => {
    initializeStore()
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && items.length === 0 && step !== "redirecting") {
      router.push("/tienda/cart")
    }
  }, [isClient, items.length, router, step])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState((previous) => ({ ...previous, [name]: value }))
  }

  const handleShippingSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!formState.fullName || !formState.email || !formState.address || !formState.city || !formState.postalCode || !formState.phone) {
      setError("Por favor, completa todos los campos obligatorios")
      return
    }

    try {
      setStep("processing")

      const cartItems = items.map((item) => ({
        variantId: item.variant.id,
        qty: item.qty,
        priceCents: item.variant.priceCents,
        productName: item.product.name,
      }))

      const result = await prepareShopRedirectPayment(cartItems, {
        ...formState,
        shippingCents: FIXED_SHIPPING_CENTS,
      })

      if (!result.success || !result.actionUrl || !result.signed || !result.order) {
        setError(result.error || "Error al preparar el pago")
        setStep("shipping")
        return
      }

      setRedirectActionUrl(result.actionUrl)
      setRedirectSigned(result.signed)
      setStep("redirecting")
    } catch (submitError) {
      console.error("[shop-checkout] Error preparing redirect payment", submitError)
      setError("Error al preparar el pago")
      setStep("shipping")
    }
  }

  const subtotal = getTotal()
  const grandTotal = subtotal + FIXED_SHIPPING_CENTS

  if (!isClient) {
    return null
  }

  if (step === "processing") {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <h1 className="text-2xl font-bold mt-4">Preparando pago seguro</h1>
        <p className="text-gray-600 mt-2">Estamos validando tu pedido y preparando la redireccion al TPV.</p>
      </div>
    )
  }

  if (step === "redirecting" && redirectActionUrl && redirectSigned) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <h1 className="text-2xl font-bold mt-4">Redirigiendo a Redsys</h1>
        <p className="text-gray-600 mt-2">No cierres esta pagina. Te llevamos al TPV para completar el pago.</p>
        <div className="mt-6">
          <RedsysRedirectAutoSubmitForm actionUrl={redirectActionUrl} signed={redirectSigned} />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/tienda/cart" className="flex items-center text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al carrito
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-8">Finalizar compra</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-3 space-y-6">
          <form onSubmit={handleShippingSubmit}>
            <div className="border rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Datos de envio</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="fullName">Nombre completo *</Label>
                  <Input id="fullName" name="fullName" value={formState.fullName} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" value={formState.email} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="address">Direccion *</Label>
                  <Input id="address" name="address" value={formState.address} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input id="city" name="city" value={formState.city} onChange={handleChange} required />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Codigo postal *</Label>
                    <Input id="postalCode" name="postalCode" value={formState.postalCode} onChange={handleChange} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Pais *</Label>
                  <Input id="country" name="country" value={formState.country} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="phone">Telefono *</Label>
                  <Input id="phone" name="phone" type="tel" value={formState.phone} onChange={handleChange} required />
                </div>
                <Button type="submit" className="w-full mt-2" size="lg">
                  Ir al pago seguro
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="md:col-span-2">
          <div className="border rounded-lg p-6 bg-gray-50 sticky top-6">
            <h2 className="text-lg font-medium mb-4">Resumen del pedido</h2>

            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.variant.id} className="flex justify-between text-sm">
                  <span>
                    {item.product.name} <span className="text-gray-500">x{item.qty}</span>
                  </span>
                  <span>{formatShopPrice(item.variant.priceCents * item.qty)}</span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatShopPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Envio</span>
                <span>{formatShopPrice(FIXED_SHIPPING_CENTS)}</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-bold mb-4">
              <span>Total</span>
              <span>{formatShopPrice(grandTotal)}</span>
            </div>

            <div className="mt-4 text-center">
              <Link href="/tienda/cart" className="text-sm text-primary hover:underline">
                Volver al carrito
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
