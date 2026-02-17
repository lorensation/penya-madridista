"use client"

import { useState } from "react"
import { useCartStore, type Product, type ProductVariant } from "@/stores/cart"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface AddToCartButtonProps {
  product: Product
  productVariant: ProductVariant
  quantity?: number
  className?: string
  showIcon?: boolean
  showLabel?: boolean
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
}

export function AddToCartButton({
  product,
  productVariant,
  quantity = 1,
  className = "",
  showIcon = true,
  showLabel = true,
  buttonVariant = "default",
}: AddToCartButtonProps) {
  const addItem = useCartStore(state => state.addItem)
  const [adding, setAdding] = useState(false)
  
  const handleAddToCart = () => {
    setAdding(true)
    
    // Simulate a short delay for UX feedback
    setTimeout(() => {
      addItem(product, productVariant, quantity)
      setAdding(false)
      toast.success(`${product.name} añadido al carrito`, {
        description: `${quantity} x ${productVariant.option.size || ''} ${productVariant.option.color || ''}`
      })
    }, 500)
  }
  
  return (
    <Button 
      onClick={handleAddToCart}
      disabled={adding || (productVariant.inventory ?? 0) <= 0}
      className={className}
      variant={buttonVariant}
    >
      {adding ? (
        <>
          {showIcon && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {showLabel && "Añadiendo..."}
        </>
      ) : (productVariant.inventory ?? 0) <= 0 ? (
        <>
          {showLabel && "Agotado"}
        </>
      ) : (
        <>
          {showIcon && <ShoppingCart className="mr-2 h-4 w-4" />}
          {showLabel && "Añadir al carrito"}
        </>
      )}
    </Button>
  )
}