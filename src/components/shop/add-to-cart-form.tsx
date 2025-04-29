"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/components/ui/use-toast"
import { useCartStore, initializeStore } from "@/stores/cart"
import { formatShopPrice } from "@/lib/utils"

interface AddToCartFormProps {
  product: {
    id: string
    name: string
    slug: string
    description: string
    image_url: string
    category: string
  }
  variants: {
    id: string
    sku: string
    price_cents: number
    inventory: number
    stripe_price_id: string
    option: Record<string, string>
    active: boolean
  }[]
  optionTypes: string[]
}

export function AddToCartForm({ product, variants, optionTypes }: AddToCartFormProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState<{
    id: string
    sku: string
    price_cents: number
    inventory: number
    stripe_price_id: string
    option: Record<string, string>
    active: boolean
  } | null>(null)
  const { toast } = useToast()
  const { addItem } = useCartStore()
  const router = useRouter()

  // Initialize cart store for persistence
  useEffect(() => {
    initializeStore()
  }, [])

  // Set default options if available
  useEffect(() => {
    if (variants.length > 0 && optionTypes.length > 0) {
      const defaultOptions: Record<string, string> = {}
      optionTypes.forEach(optionType => {
        // Get the first available option value for each option type
        const optionValues = new Set(variants.map(v => v.option[optionType]))
        if (optionValues.size > 0) {
          defaultOptions[optionType] = Array.from(optionValues)[0]
        }
      })
      setSelectedOptions(defaultOptions)
    } else if (variants.length === 1) {
      // If there's only one variant, select it by default
      setSelectedVariant(variants[0])
    }
  }, [variants, optionTypes])

  // Update selected variant when options change
  useEffect(() => {
    if (optionTypes.length === 0 && variants.length === 1) {
      setSelectedVariant(variants[0])
      return
    }

    // Check if all options are selected
    const allOptionsSelected = optionTypes.every(type => selectedOptions[type])
    
    if (allOptionsSelected) {
      // Find the variant that matches all selected options
      const matchingVariant = variants.find(variant => 
        optionTypes.every(type => variant.option[type] === selectedOptions[type])
      )
      
      setSelectedVariant(matchingVariant || null)
    } else {
      setSelectedVariant(null)
    }
  }, [selectedOptions, variants, optionTypes])

  // Handle option change
  const handleOptionChange = (optionType: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionType]: value
    }))
  }

  // Increment quantity
  const incrementQuantity = () => {
    if (selectedVariant && quantity < selectedVariant.inventory) {
      setQuantity(prev => prev + 1)
    }
  }

  // Decrement quantity
  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1)
    }
  }

  // Handle add to cart
  const handleAddToCart = () => {
    if (!selectedVariant) return
    
    // Convert server-side product format to cart store format
    const cartProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      imageUrl: product.image_url
    }
    
    // Convert server-side variant format to cart store format
    const cartVariant = {
      id: selectedVariant.id,
      sku: selectedVariant.sku,
      priceCents: selectedVariant.price_cents,
      stripePriceId: selectedVariant.stripe_price_id,
      inventory: selectedVariant.inventory,
      option: selectedVariant.option || {},
      productId: product.id,
      image: product.image_url,
      productName: product.name
    }
    
    // Add to cart with the correct format
    addItem(cartProduct, cartVariant, quantity)
    
    // Visual feedback
    toast({
      title: "Añadido al carrito",
      description: `${product.name} añadido al carrito`,
    })
  }
  
  // Check if product is out of stock
  const isOutOfStock = !selectedVariant || selectedVariant.inventory <= 0
  
  // Check if we need to show the options selectors
  const hasOptions = optionTypes.length > 0

  return (
    <div className="mt-6">
      {/* Show option selectors if needed */}
      {hasOptions && optionTypes.map(optionType => (
        <div key={optionType} className="mb-6">
          <Label className="mb-2 block font-medium">
            {optionType.charAt(0).toUpperCase() + optionType.slice(1)}
          </Label>
          <RadioGroup 
            value={selectedOptions[optionType] || ''}
            onValueChange={(value) => handleOptionChange(optionType, value)}
            className="flex flex-wrap gap-2"
          >
            {/* Get unique option values for this option type */}
            {Array.from(new Set(variants.map(v => v.option[optionType]))).map(value => (
              <div key={value} className="flex items-center">
                <RadioGroupItem 
                  id={`${optionType}-${value}`} 
                  value={value} 
                  className="peer sr-only"
                />
                <Label 
                  htmlFor={`${optionType}-${value}`} 
                  className="flex cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary"
                >
                  {value}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}

      {/* Price */}
      {selectedVariant && (
        <div className="mb-4 text-lg font-semibold">
          {formatShopPrice(selectedVariant.price_cents)}
        </div>
      )}

      {/* Stock status */}
      <div className="mb-6">
        {isOutOfStock ? (
          <p className="text-red-500">Agotado</p>
        ) : selectedVariant ? (
          <p className="text-green-600">
            {selectedVariant.inventory > 10 
              ? "En stock" 
              : `¡Solo quedan ${selectedVariant.inventory}!`}
          </p>
        ) : hasOptions ? (
          <p className="text-gray-500">Selecciona las opciones</p>
        ) : (
          <p className="text-gray-500">Producto no disponible</p>
        )}
      </div>

      {/* Quantity selector */}
      {!isOutOfStock && (
        <div className="flex items-center mb-6">
          <Label htmlFor="quantity" className="mr-4 font-medium">Cantidad</Label>
          <div className="flex items-center border rounded-md">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={decrementQuantity}
              disabled={quantity <= 1}
              className="h-9 w-9"
            >
              <MinusIcon className="h-3 w-3" />
              <span className="sr-only">Decrementar cantidad</span>
            </Button>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedVariant?.inventory || 1}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (val > 0 && (!selectedVariant || val <= selectedVariant.inventory)) {
                  setQuantity(val)
                }
              }}
              className="h-9 w-12 border-0 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={incrementQuantity}
              disabled={!selectedVariant || quantity >= selectedVariant.inventory}
              className="h-9 w-9"
            >
              <PlusIcon className="h-3 w-3" />
              <span className="sr-only">Incrementar cantidad</span>
            </Button>
          </div>
        </div>
      )}

      {/* Add to cart button */}
      <Button 
        onClick={handleAddToCart}
        disabled={isOutOfStock || !selectedVariant}
        className="w-full hover:bg-white hover:text-black hover:border hover:border-black transition-colors"
        size="lg"
      >
        <ShoppingCartIcon className="mr-2 h-5 w-5" />
        Añadir al Carrito
      </Button>
    </div>
  )
}