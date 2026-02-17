"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
//import { useRouter } from "next/navigation"
import { Trash2, ShoppingBag, Minus, Plus, ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useCartStore, initializeStore } from "@/stores/cart"
import { formatShopPrice } from "@/lib/utils"

export default function CartPage() {
  //const router = useRouter()
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSubmitting, _setIsSubmitting] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, _setError] = useState<string | null>(null)
  
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore()
  
  // Fix for hydration issues and ensure cart persists
  useEffect(() => {
    // Initialize the store to hydrate from localStorage
    initializeStore()
    setIsClient(true)
  }, [])
  
  // Handle quantity change
  const handleQuantityChange = (id: string, qty: number, maxQty: number) => {
    if (qty < 1) qty = 1
    if (qty > maxQty) qty = maxQty
    updateQuantity(id, qty)
  }
  
  // Handle checkout process
  const handleCheckout = async () => {
    if (items.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "No hay productos en tu carrito",
        variant: "destructive"
      })
      return
    }
    
    // Navigate to checkout page (InSite payment form)
    window.location.href = "/tienda/checkout"
  }
  
  // Calculate total
  const total = getTotal()
  
  // Don't render anything on the server to prevent hydration issues
  if (!isClient) {
    return null
  }
  
  // If cart is empty
  if (items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/tienda" className="flex items-center text-sm text-gray-500 hover:text-gray-900">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la Tienda
            </Link>
          </Button>
          
          <h1 className="text-3xl font-bold">Tu Carrito</h1>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Tu carrito está vacío</h2>
          <p className="text-gray-500 mb-6">No hay productos en tu carrito de compra</p>
          <Button asChild className="hover:bg-white hover:border hover:border-black hover:text-black transition-colors">
            <Link href="/tienda">Ver Productos</Link>
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/tienda" className="flex items-center text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la Tienda
          </Link>
        </Button>
        
        <h1 className="text-3xl font-bold">Tu Carrito</h1>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Imagen</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.variant.id}>
                    <TableCell>
                      <div className="relative aspect-square w-20 rounded-md bg-white border overflow-hidden">
                        <Image
                          src={item.product.imageUrl || "/placeholder-product.png"}
                          alt={item.product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-contain"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/tienda/producto/${item.product.slug}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {item.product.name}
                      </Link>
                      <div className="text-sm text-gray-500">
                        {Object.values(item.variant.option).join(" / ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatShopPrice(item.variant.priceCents)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(
                            item.variant.id, 
                            item.qty - 1, 
                            item.variant.inventory ?? 0
                          )}
                          disabled={item.qty <= 1}
                        >
                          <Minus className="h-3 w-3" />
                          <span className="sr-only">Disminuir cantidad</span>
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max={item.variant.inventory ?? 0}
                          value={item.qty}
                          onChange={(e) =>
                            handleQuantityChange(
                              item.variant.id,
                              parseInt(e.target.value) || 1,
                              item.variant.inventory ?? 0
                            )
                          }
                          className="h-8 w-14 text-center mx-2"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleQuantityChange(
                            item.variant.id,
                            item.qty + 1,
                            item.variant.inventory ?? 0
                          )}
                          disabled={item.qty >= (item.variant.inventory ?? 0)}
                        >
                          <Plus className="h-3 w-3" />
                          <span className="sr-only">Aumentar cantidad</span>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatShopPrice(item.variant.priceCents * item.qty)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeItem(item.variant.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Clear cart button */}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => clearCart()}>
              Vaciar Carrito
            </Button>
          </div>
        </div>
        
        {/* Order summary */}
        <div className="bg-gray-50 p-6 rounded-lg border h-fit">
          <h2 className="text-lg font-bold mb-4">Resumen del Pedido</h2>
          
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatShopPrice(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Envío:</span>
              <span>Calculado en el checkout</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total:</span>
              <span>{formatShopPrice(total)}</span>
            </div>
          </div>
          
          <Button
            className="w-full mb-4 hover:bg-white hover:text-black hover:border hover:border-black transition-colors"
            size="lg"
            onClick={handleCheckout}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Proceder al Checkout"
            )}
          </Button>
          
          <p className="text-sm text-gray-500 text-center">
            Los impuestos y gastos de envío se calcularán en el checkout
          </p>
        </div>
      </div>
    </div>
  )
}