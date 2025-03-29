"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  CreditCard,
  Calendar,
  FileText,
  Settings,
  Menu,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  className?: string
}

export function DashboardSidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    }
  }

  const closeMobileSidebar = () => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const navItems = [
    {
      title: "Panel Principal",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Membresía",
      href: "/dashboard/membership",
      icon: CreditCard,
    },
    {
      title: "Eventos",
      href: "/dashboard/events",
      icon: Calendar,
    },
    {
      title: "Contenido Exclusivo",
      href: "/dashboard/content",
      icon: FileText,
    },
    {
      title: "Configuración",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && mobileOpen && <div className="fixed inset-0 bg-black/50 z-40" onClick={closeMobileSidebar} />}

      {/* Mobile toggle button */}
      {isMobile && (
        <Button variant="outline" size="icon" className="fixed top-20 left-4 z-50 md:hidden" onClick={toggleSidebar}>
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      )}

      <div
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-white border-r transition-all duration-300 pt-16",
          collapsed && !mobileOpen ? "w-16" : "w-64",
          isMobile && !mobileOpen && "transform -translate-x-full",
          isMobile && mobileOpen && "transform translate-x-0",
          className,
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2
              className={cn(
                "font-semibold text-primary transition-opacity",
                collapsed && !mobileOpen ? "opacity-0 w-0" : "opacity-100",
              )}
            >
              Panel de Socio
            </h2>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-auto">
              {collapsed && !mobileOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} onClick={closeMobileSidebar}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm transition-colors",
                    pathname === item.href ? "bg-primary text-primary-foreground" : "text-gray-700 hover:bg-gray-100",
                    collapsed && !mobileOpen ? "justify-center" : "justify-start",
                  )}
                >
                  <item.icon
                    className={cn("h-5 w-5", pathname === item.href ? "text-primary-foreground" : "text-gray-500")}
                  />
                  <span
                    className={cn(
                      "ml-3 transition-opacity",
                      collapsed && !mobileOpen ? "opacity-0 w-0 hidden" : "opacity-100",
                    )}
                  >
                    {item.title}
                  </span>
                </div>
              </Link>
            ))}
          </nav>

          <div className={cn("p-4 border-t", collapsed && !mobileOpen ? "hidden" : "block")}>
            <Link href="/dashboard/logout">
              <Button variant="outline" className="w-full">
                Cerrar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}