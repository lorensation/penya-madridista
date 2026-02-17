"use client"

import { Suspense, useEffect } from "react"
import Link from "next/link"
import { CheckCircle, ShoppingBag, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCartStore } from "@/stores/cart"

function CheckoutSuccessContent() {
  const clearCart = useCartStore(state => state.clearCart)
  
  useEffect(() => {
    // Clear the cart on successful purchase
    clearCart()
  }, [clearCart])
  
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
        <div className="text-center py-8">
          <p className="text-gray-600 mb-2">
            Los detalles de tu compra han sido enviados a tu correo electrónico.
          </p>
          <p className="text-gray-600">
            También podrás ver los detalles en tu cuenta si estás registrado.
          </p>
        </div>
        
        <Separator className="my-4" />
        
        <p className="text-center text-sm text-gray-500">
          Recibirás una confirmación por email con los detalles de tu pedido.
        </p>
      </Card>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
          <Link href="/tienda" className="flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Seguir comprando
          </Link>
        </Button>
        
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href="/dashboard" className="flex items-center">
            Ver mi cuenta
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
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