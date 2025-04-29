import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { CartIcon } from "@/components/shop/cart-icon"

export const metadata: Metadata = {
  title: "Tienda Oficial - Peña Lorenzo Sanz",
  description: "Tienda oficial de productos de la Peña Madridista Lorenzo Sanz",
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background min-h-screen w-full">
      <div className="w-full px-4 py-2 border-b shadow-sm sticky top-0 bg-background z-40">
        {/* Navigation */}
        <div className="max-w-full mx-auto flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <Link href="/tienda" className="flex items-center space-x-2">
              <div className="relative w-10 h-10">
                <Image
                  src="/Logo-Penya-LS-resized.jpg"
                  alt="Peña Lorenzo Sanz"
                  fill
                  sizes="40px"
                  className="object-contain"
                />
              </div>
              <span className="font-bold text-xl hidden sm:inline-block">Tienda</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <CartIcon />
            <Link 
              href="/"
              className="text-sm font-medium hover:underline"
            >
              Volver a la página principal
            </Link>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <main className="justify-center px-4 py-8">
        {children}
      </main>
    </div>
  )
}