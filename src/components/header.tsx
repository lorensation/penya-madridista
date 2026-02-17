"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { useNavbarMenu } from "@/hooks/use-navbar-menu"
/*import { useCartStore, initializeStore } from "@/stores/cart"
import { ShoppingBag } from "lucide-react"*/

export function Header() {
  // Use the shared navbar menu state
  const { isOpen: isMenuOpen, toggle: toggleMenu, setIsOpen } = useNavbarMenu()
  
  interface User {
    id: string
    email?: string
    name?: string | null
  }

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  /*const [isClient, setIsClient] = useState(false)
  const cartStore = useCartStore()
  const itemCount = isClient ? cartStore.getItemCount() : 0
  
  // Initialize cart store
  useEffect(() => {
    initializeStore()
    setIsClient(true)
  }, [])*/

  const pathname = usePathname()

  useEffect(() => {
    // Function to fetch user data
    async function getUser() {
      try {
        const { data } = await supabase.auth.getUser()

        if (data.user) {
          // Get profile info if user exists
          const { data: profileData } = await supabase
            .from("users")
            .select("name")
            .eq("id", data.user.id)
            .single()

          setUser({
            id: data.user.id,
            email: data.user.email,
            name: profileData?.name || null,
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    getUser()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        // User logged in, fetch their data
        getUser()
      } else {
        // User logged out
        setUser(null)
        setLoading(false)
      }
    })

    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const closeMenu = () => {
    setIsOpen(false)
  }

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container flex h-16 items-center justify-between px-4 w-full max-w-full">
        {/* Logo - always on the left */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="Peña Lorenzo Sanz Logo" width={40} height={40} className="rounded-full" />
            <span className="hidden font-bold sm:inline-block">Peña Lorenzo Sanz</span>
          </Link>
        </div>

        {/* Desktop navigation - centered */}
        <nav className="hidden md:flex md:items-center md:justify-center md:gap-6 flex-1 mx-auto">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary hover:text-underline ${
              isActive("/") ? "text-primary" : "text-gray-600"
            }`}
          >
            Inicio
          </Link>
          <Link
            href="/about"
            className={`text-sm font-medium transition-colors hover:text-primary hover:text-underline ${
              isActive("/about") ? "text-primary" : "text-gray-600"
            }`}
          >
            Sobre Nosotros
          </Link>
          <Link
            href="/blog"
            className={`text-sm font-medium transition-colors hover:text-primary hover:text-underline ${
              isActive("/blog") ? "text-primary" : "text-gray-600"
            }`}
          >
            Blog
          </Link>
          <Link
            href="/membership"
            className={`text-sm font-medium transition-colors hover:text-primary hover:text-underline ${
              isActive("/membership") ? "text-primary" : "text-gray-600"
            }`}
          >
            Hazte Socio
          </Link>
          <Link
            href="/contact"
            className={`text-sm font-medium transition-colors hover:text-primary hover:text-underline ${
              isActive("/contact") ? "text-primary" : "text-gray-600"
            }`}
          >
            Contacto
          </Link>
        </nav>

        {/* Right side with profile/login and mobile menu button */}
        <div className="flex items-center flex-shrink-0">
          {/* Login/Profile button - always on the right */}
          <div className="hidden md:block">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
            ) : user ? (
              <ProfileDropdown user={user} />
            ) : (
              <Button className="hover:bg-white hover:text-black hover:border hover:border-black transition-all" asChild>
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
            )}
          </div>

          {/* Mobile login/profile button */}
          <div className="block md:hidden mr-2">
            {!loading && user && (
              <ProfileDropdown user={user} />
            )}
          </div>

          {/* Cart link with item count 
          <Link href="/tienda/cart" className="relative">
            <ShoppingBag className="h-6 w-6" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>*/}

          {/* Mobile menu button - on the right */}
          <button
            className="block rounded p-2 md:hidden"
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className="sr-only">Abrir menú</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile navigation */}
        {isMenuOpen && (
          <div id="mobile-menu" className="absolute left-0 right-0 top-16 z-50 bg-white p-4 shadow-lg md:hidden">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/") ? "text-primary" : "text-gray-600"
                }`}
                onClick={closeMenu}
              >
                Inicio
              </Link>
              <Link
                href="/about"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/about") ? "text-primary" : "text-gray-600"
                }`}
                onClick={closeMenu}
              >
                Sobre Nosotros
              </Link>
              <Link
                href="/blog"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/blog") ? "text-primary" : "text-gray-600"
                }`}
                onClick={closeMenu}
              >
                Blog
              </Link>
              <Link
                href="/membership"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/membership") ? "text-primary" : "text-gray-600"
                }`}
                onClick={closeMenu}
              >
                Hazte Socio
              </Link>
              <Link
                href="/contact"
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/contact") ? "text-primary" : "text-gray-600"
                }`}
                onClick={closeMenu}
              >
                Contacto
              </Link>
              {!loading && !user && (
                <div className="pt-2">
                  <Button asChild className="w-full">
                    <Link href="/login" onClick={closeMenu}>
                      Iniciar Sesión
                    </Link>
                  </Button>
                </div>
              )}
              {!loading && user && (
                <div className="pt-2">
                  <div className="flex flex-col space-y-2">
                    <Link href="/dashboard" className="text-sm font-medium text-black hover:bg-black hover:text-white" onClick={closeMenu}>
                      Panel de Socio
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="text-sm font-medium text-black hover:bg-black hover:text-white"
                      onClick={closeMenu}
                    >
                      Configuración
                    </Link>
                    <Link href="/dashboard/logout" className="text-sm font-medium text-red-600" onClick={closeMenu}>
                      Cerrar Sesión
                    </Link>
                  </div>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}