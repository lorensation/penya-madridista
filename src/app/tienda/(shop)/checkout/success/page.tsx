"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle, ShoppingBag, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCartStore } from "@/stores/cart"
import { getCheckoutSession } from "@/app/actions/shop-checkout"

// Define interface for the checkout session
interface CheckoutSessionAddress {
  line1?: string
  line2?: string | null
  city?: string
  state?: string
  postal_code?: string
  country?: string
}

interface CheckoutSessionShipping {
  address?: CheckoutSessionAddress
  name?: string
}

interface CheckoutSessionCustomerDetails {
  name?: string
  email?: string
  phone?: string | null
  address?: CheckoutSessionAddress
}

interface CheckoutSession {
  id: string
  customer_details?: CheckoutSessionCustomerDetails
  shipping?: CheckoutSessionShipping
  amount_total?: number
  currency?: string
  status?: string
  payment_status?: string
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const clearCart = useCartStore(state => state.clearCart)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [orderDetails, setOrderDetails] = useState<CheckoutSession | null>(null)
  
  useEffect(() => {
    // Clear the cart on successful purchase
    clearCart()
    
    // Get the checkout session to display order details
    if (sessionId) {
      const fetchSession = async () => {
        setLoading(true)
        const result = await getCheckoutSession(sessionId)
        setLoading(false)
        
        if (result.error) {
          setError(result.error)
        } else if (result.session) {
          // Cast the session to our interface to ensure type compatibility
          setOrderDetails(result.session as unknown as CheckoutSession)
        }
      }
      
      fetchSession()
    } else {
      setLoading(false)
      setError("No se encontró información del pedido")
    }
  }, [sessionId, clearCart])
  
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
          <CheckCircle size={32} />
        </div>
        <h1 className="text-3xl font-bold mb-2">¡Gracias por tu compra!</h1>
        <p className="text-xl text-gray-600">Tu pedido se ha completado con éxito</p>
      </div>
      
      <Card className="p-6 mb-8">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={32} className="text-primary animate-spin" />
            <span className="ml-3 text-lg">Cargando información del pedido...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <p className="text-gray-600 mb-6">
              No te preocupes, hemos recibido tu pedido correctamente y te enviaremos un correo con los detalles.
            </p>
          </div>
        ) : orderDetails ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold mb-1">Resumen del Pedido</h2>
                <p className="text-gray-600">Pedido completado {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Número de orden</p>
                <p className="font-mono font-medium">{sessionId?.substring(0, 12)}</p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-medium">Productos comprados</h3>
              
              {/* This would ideally display details from the session's line items */}
              {/* Since Stripe doesn't return details in the client, we use a placeholder */}
              <div className="py-4 text-center text-gray-600">
                <p>Los detalles de tu compra han sido enviados a tu correo electrónico.</p>
                <p className="mt-2">También podrás ver los detalles en tu cuenta si estás registrado.</p>
              </div>
            </div>
            
            {orderDetails.customer_details && (
              <>
                <Separator className="my-4" />
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Dirección de envío</h3>
                    <div className="text-gray-600">
                      <p>{orderDetails.customer_details.name}</p>
                      {orderDetails.shipping?.address && (
                        <>
                          <p>{orderDetails.shipping.address.line1}</p>
                          {orderDetails.shipping.address.line2 && <p>{orderDetails.shipping.address.line2}</p>}
                          <p>{orderDetails.shipping.address.postal_code}, {orderDetails.shipping.address.city}</p>
                          <p>{orderDetails.shipping.address.state}, {orderDetails.shipping.address.country}</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Información de contacto</h3>
                    <div className="text-gray-600">
                      <p>Email: {orderDetails.customer_details.email}</p>
                      {orderDetails.customer_details.phone && (
                        <p>Teléfono: {orderDetails.customer_details.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            <Separator className="my-4" />
            
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>{((orderDetails.amount_total || 0) / 100).toFixed(2)} €</span>
            </div>
          </div>
        ) : null}
      </Card>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
          <Link href="/tienda" className="flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Seguir comprando
          </Link>
        </Button>
        
        {!loading && !error && (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard/orders" className="flex items-center">
              Ver mis pedidos
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 md:py-24">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando información de compra...</p>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}