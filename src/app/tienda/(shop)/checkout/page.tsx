"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import Link from "next/link"

// Placeholder cart items to simulate checkout
const cartItems = [
  {
    id: "1-m",
    name: "Camiseta Oficial - M",
    price: 24.99,
    quantity: 1,
  },
  {
    id: "2-l",
    name: "Polo Blanco - L",
    price: 29.99,
    quantity: 2,
  }
]

export default function CheckoutPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "España",
    phone: "",
  })
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // In the real implementation, we would call an API or server action here
    try {
      // Mock submission
      await new Promise(resolve => setTimeout(resolve, 1500))
      alert("¡Gracias por tu pedido! Serías redirigido a la pasarela de pago.")
      // window.location.href = "/tienda/checkout/success"
    } catch (error) {
      console.error("Error processing checkout:", error)
      alert("Error al procesar el pago. Por favor, inténtalo de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }
  
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const shipping = 5.00 // Fixed shipping cost
  const total = subtotal + shipping
  
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Finalizar Compra</h1>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Customer info and shipping */}
        <div className="md:col-span-3 space-y-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">Datos de envío</h2>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input 
                  id="fullName" 
                  name="fullName" 
                  value={formState.fullName} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={formState.email} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input 
                  id="address" 
                  name="address" 
                  value={formState.address} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <Input 
                    id="city" 
                    name="city" 
                    value={formState.city} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="postalCode">Código postal</Label>
                  <Input 
                    id="postalCode" 
                    name="postalCode" 
                    value={formState.postalCode} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="country">País</Label>
                <Input 
                  id="country" 
                  name="country" 
                  value={formState.country} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  type="tel" 
                  value={formState.phone} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Order summary */}
        <div className="md:col-span-2">
          <div className="border rounded-lg p-6 bg-gray-50 sticky top-6">
            <h2 className="text-lg font-medium mb-4">Resumen del pedido</h2>
            
            <div className="space-y-3 mb-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.name} <span className="text-gray-500">x{item.quantity}</span>
                  </span>
                  <span>{(item.price * item.quantity).toFixed(2)} €</span>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} €</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Envío</span>
                <span>{shipping.toFixed(2)} €</span>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex justify-between font-bold mb-6">
              <span>Total</span>
              <span>{total.toFixed(2)} €</span>
            </div>
            
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Finalizar y pagar"
              )}
            </Button>
            
            <div className="mt-4 text-center">
              <Link 
                href="/tienda/cart" 
                className="text-sm text-primary hover:underline"
              >
                Volver al carrito
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}