"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { useCartStore } from "@/stores/cart"

export function CartIcon() {
  const [mounted, setMounted] = useState(false)
  const itemCount = useCartStore((state) => state.getItemCount())
  
  // Prevent hydration mismatch by only showing after mounting
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) return null
  
  return (
    <Link 
      href="/tienda/cart"
      aria-label="Carrito de compras"
      className="relative flex items-center justify-center p-2 rounded-md hover:bg-accent"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute top-0 right-0 w-4 h-4 text-[10px] font-bold flex items-center justify-center bg-primary text-primary-foreground rounded-full">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  )
}