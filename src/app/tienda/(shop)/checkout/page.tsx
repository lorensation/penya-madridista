"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, ArrowLeft, AlertCircle, CheckCircle, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useCartStore, initializeStore } from "@/stores/cart"
import { formatShopPrice } from "@/lib/utils"
import { RedsysInSiteForm } from "@/components/shop/redsys-insite-form"
import { prepareShopPayment, executePayment } from "@/app/actions/payment"

type CheckoutStep = "shipping" | "payment" | "processing" | "success" | "error"

export default function CheckoutPage() {
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [step, setStep] = useState<CheckoutStep>("shipping")
  const [error, setError] = useState<string | null>(null)

  // Shipping form state
  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "España",
    phone: "",
  })

  // Payment state
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  const { items, getTotal, clearCart } = useCartStore()

  useEffect(() => {
    initializeStore()
    setIsClient(true)
  }, [])

  // Redirect if cart is empty
  useEffect(() => {
    if (isClient && items.length === 0 && step !== "success") {
      router.push("/tienda/cart")
    }
  }, [isClient, items.length, step, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  // Step 1 → Step 2: Validate shipping, prepare payment, show InSite
  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic validation
    if (!formState.fullName || !formState.email || !formState.address || !formState.city || !formState.postalCode || !formState.phone) {
      setError("Por favor, completa todos los campos obligatorios")
      return
    }

    try {
      setStep("processing")

      // Prepare payment with server-side price validation
      const cartItems = items.map((item) => ({
        variantId: item.variant.id,
        qty: item.qty,
        priceCents: item.variant.priceCents,
        productName: item.product.name,
      }))

      const result = await prepareShopPayment(cartItems)

      if (!result.success || !result.order) {
        setError(result.error || "Error al preparar el pago")
        setStep("shipping")
        return
      }

      setOrderNumber(result.order)
      setStep("payment")
    } catch (err) {
      console.error("Error preparing payment:", err)
      setError("Error al preparar el pago. Inténtalo de nuevo.")
      setStep("shipping")
    }
  }

  // Step 2: Handle idOper from InSite → execute payment
  const handleIdOperReceived = useCallback(
    async (idOper: string) => {
      if (!orderNumber) return
      setStep("processing")
      setError(null)

      try {
        const result = await executePayment(idOper, orderNumber, "shop")

        if (result.success) {
          clearCart()
          setStep("success")
        } else {
          setError(result.error || "Pago denegado")
          setStep("error")
        }
      } catch (err) {
        console.error("Error executing payment:", err)
        setError("Error al procesar el pago")
        setStep("error")
      }
    },
    [orderNumber, clearCart],
  )

  const handlePaymentError = useCallback((message: string) => {
    setError(message)
  }, [])

  // Calculate totals
  const total = getTotal()
  const shipping = 500 // 5€ fixed shipping in cents
  const grandTotal = total + shipping

  if (!isClient) return null

  // ── Success state ────────────────────────────────────────────────────────

  if (step === "success") {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
          <CheckCircle size={32} />
        </div>
        <h1 className="text-3xl font-bold mb-2">¡Gracias por tu compra!</h1>
        <p className="text-xl text-gray-600 mb-8">Tu pedido se ha completado con éxito</p>
        <p className="text-gray-500 mb-8">
          Recibirás un correo electrónico de confirmación con los detalles de tu pedido.
        </p>
        <div className="flex justify-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/tienda">Seguir comprando</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Mi cuenta</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Main Checkout Layout ─────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/tienda/cart" className="flex items-center text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al carrito
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-8">Finalizar Compra</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left column: Shipping + Payment */}
        <div className="md:col-span-3 space-y-6">
          {/* Shipping Form */}
          <form onSubmit={handleShippingSubmit}>
            <div className="border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">Datos de envío</h2>
                {step !== "shipping" && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStep("shipping")}>
                    Editar
                  </Button>
                )}
              </div>

              {step === "shipping" ? (
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
                    <Label htmlFor="address">Dirección *</Label>
                    <Input id="address" name="address" value={formState.address} onChange={handleChange} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Ciudad *</Label>
                      <Input id="city" name="city" value={formState.city} onChange={handleChange} required />
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Código postal *</Label>
                      <Input id="postalCode" name="postalCode" value={formState.postalCode} onChange={handleChange} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">País *</Label>
                    <Input id="country" name="country" value={formState.country} onChange={handleChange} required />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input id="phone" name="phone" type="tel" value={formState.phone} onChange={handleChange} required />
                  </div>
                  <Button type="submit" className="w-full mt-2" size="lg">
                    Continuar al pago
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{formState.fullName}</p>
                  <p>{formState.address}</p>
                  <p>{formState.postalCode} {formState.city}, {formState.country}</p>
                  <p>{formState.email} · {formState.phone}</p>
                </div>
              )}
            </div>
          </form>

          {/* Payment Form (InSite) */}
          {(step === "payment" || step === "error") && orderNumber && (
            <div className="border rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Datos de pago</h2>
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md p-3 mb-4">
                <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                <span>Conexión segura — Tus datos de tarjeta son procesados directamente por Getnet/Redsys (PCI DSS).</span>
              </div>
              <RedsysInSiteForm
                order={orderNumber}
                onIdOperReceived={handleIdOperReceived}
                onError={handlePaymentError}
                buttonText={`Pagar ${formatShopPrice(grandTotal)}`}
                language="ES"
                formStyle="twoRows"
              />
            </div>
          )}

          {/* Processing state */}
          {step === "processing" && (
            <div className="border rounded-lg p-6 flex items-center justify-center py-12">
              <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
              <span className="text-lg">Procesando tu pago...</span>
            </div>
          )}
        </div>

        {/* Right column: Order Summary */}
        <div className="md:col-span-2">
          <div className="border rounded-lg p-6 bg-gray-50 sticky top-6">
            <h2 className="text-lg font-medium mb-4">Resumen del pedido</h2>

            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.variant.id} className="flex justify-between text-sm">
                  <span>
                    {item.product.name}{" "}
                    <span className="text-gray-500">x{item.qty}</span>
                  </span>
                  <span>{formatShopPrice(item.variant.priceCents * item.qty)}</span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatShopPrice(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Envío</span>
                <span>{formatShopPrice(shipping)}</span>
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