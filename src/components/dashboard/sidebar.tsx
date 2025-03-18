"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Home, CreditCard, Calendar, FileText, Settings, LogOut, Menu, X } from "lucide-react"

const navigation = [
  { name: "Panel Principal", href: "/dashboard", icon: Home },
  { name: "Membresía", href: "/dashboard/membership", icon: CreditCard },
  { name: "Eventos", href: "/dashboard/events", icon: Calendar },
  { name: "Contenido Exclusivo", href: "/dashboard/content", icon: FileText },
  { name: "Configuración", href: "/dashboard/settings", icon: Settings },
]

export default function DashboardSidebar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    }

    checkUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button variant="outline" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="bg-white">
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar for mobile */}
      <div
        className={`fixed inset-0 z-40 transform ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:hidden transition-transform duration-300 ease-in-out`}
      >
        <div className="fixed inset-0 bg-black/20" onClick={() => setMobileMenuOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out">
          <div className="flex flex-col h-full">
            <div className="px-4 py-6 border-b">
              <h2 className="text-xl font-bold text-primary">Panel de Socio</h2>
              <p className="text-sm text-gray-500 mt-1">{user?.user_metadata?.name || user?.email || "Cargando..."}</p>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    pathname === item.href ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100",
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="px-4 py-4 border-t">
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          <div className="px-4 py-6 border-b">
            <h2 className="text-xl font-bold text-primary">Panel de Socio</h2>
            <p className="text-sm text-gray-500 mt-1">{user?.user_metadata?.name || user?.email || "Cargando..."}</p>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  pathname === item.href ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100",
                )}
              >
                <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="px-4 py-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

