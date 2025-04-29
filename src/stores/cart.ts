import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ProductVariant {
  id: string
  sku: string
  option: Record<string, string>
  priceCents: number
  stripePriceId: string
  inventory: number
  productId: string  // Added for cart page compatibility
  image: string      // Added for cart page compatibility
  productName: string // Added for cart page compatibility
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  imageUrl: string
}

export interface CartItem {
  variant: ProductVariant
  product: Product
  qty: number
}

interface CartState {
  items: CartItem[]
  addItem: (product: Product, variant: ProductVariant, qty?: number) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, qty: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
  remove: (variantId: string) => void // Alias for removeItem for compatibility
  total: number // Added computed property for compatibility
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, variant, qty = 1) => {
        set((state) => {
          // Check if item already exists in cart
          const existingItemIndex = state.items.findIndex(
            (item) => item.variant.id === variant.id
          )
          
          if (existingItemIndex !== -1) {
            // If exists, update quantity
            const updatedItems = [...state.items]
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              qty: updatedItems[existingItemIndex].qty + qty
            }
            
            return { items: updatedItems }
          }
          
          // If it doesn't exist, add new item
          return {
            items: [
              ...state.items,
              {
                product: {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  description: product.description,
                  imageUrl: product.imageUrl || ''
                },
                variant: {
                  id: variant.id,
                  sku: variant.sku,
                  option: variant.option || {},
                  priceCents: variant.priceCents,
                  stripePriceId: variant.stripePriceId,
                  inventory: variant.inventory,
                  productId: variant.productId || product.id,
                  image: product.imageUrl || '',
                  productName: product.name
                },
                qty
              }
            ]
          }
        })
      },
      
      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((item) => item.variant.id !== variantId)
        }))
      },
      
      updateQuantity: (variantId, qty) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.variant.id === variantId ? { ...item, qty } : item
          )
        }))
      },
      
      clearCart: () => {
        set({ items: [] })
      },
      
      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.variant.priceCents * item.qty,
          0
        )
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.qty, 0)
      },
      
      // Alias for removeItem
      remove: (variantId) => {
        get().removeItem(variantId)
      },
      
      // Computed property
      get total() {
        return get().getTotal()
      }
    }),
    {
      name: 'penya-cart-store', // Name for localStorage
      storage: createJSONStorage(() => localStorage), // Explicitly define storage
      skipHydration: false, // Allow for hydration
    }
  )
)

// Helper function to handle hydration properly
export const initializeStore = () => {
  if (typeof window !== 'undefined') {
    // This forces a rehydration if localStorage has items
    useCartStore.persist.rehydrate()
  }
}