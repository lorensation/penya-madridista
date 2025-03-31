"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMobile } from "@/hooks/use-mobile"
import {
  Home,
  CreditCard,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

export function DashboardSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true) // Default to collapsed/hidden
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  const isMobile = useMobile()

  // Reset mobile menu state when screen size changes
  useEffect(() => {
    if (!isMobile) {
      setIsMobileOpen(false)
    }
  }, [isMobile])

  // Close mobile sidebar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (isMobile && isMobileOpen && !target.closest("[data-sidebar]") && !target.closest("[data-sidebar-toggle]")) {
        setIsMobileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMobile, isMobileOpen])

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen)
  }

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") {
      return true
    }
    return pathname !== "/dashboard" && pathname?.startsWith(path)
  }

  const navItems = [
    {
      name: "Panel Principal",
      href: "/dashboard",
      icon: <Home className="h-5 w-5" />,
    },
    {
      name: "Membresía",
      href: "/dashboard/membership",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      name: "Eventos",
      href: "/dashboard/events",
      icon: <Calendar className="h-5 w-5" />,
    },
    {
      name: "Contenido Exclusivo",
      href: "/dashboard/content",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      name: "Configuración",
      href: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isMobileOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />}

      {/* Mobile toggle button */}
      {isMobile && (
        <button
          data-sidebar-toggle
          className="fixed top-20 left-4 z-50 p-2 rounded-md bg-primary text-white shadow-md"
          onClick={toggleMobileMenu}
          aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      )}

      {/* Desktop toggle button (always visible) */}
      {!isMobile && (
        <button
          data-sidebar-toggle
          className="fixed top-20 left-4 z-50 p-2 rounded-md bg-primary text-white shadow-md"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      )}

      {/* Sidebar */}
      <div
        data-sidebar
        className={`fixed top-16 bottom-0 left-0 z-40 flex flex-col bg-primary text-white transition-all duration-300 ${
          isCollapsed ? "w-0 overflow-hidden" : "w-64"
        } ${isMobile ? (isMobileOpen ? "translate-x-0" : "-translate-x-full") : "translate-x-0"}`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold">Panel de Socio</h2>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center rounded-md px-3 py-2 transition-colors ${
                    isActive(item.href)
                      ? "bg-secondary text-black font-medium" // Changed text-white to text-black for selected items
                      : "text-white/80 hover:bg-secondary/70 hover:text-white"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/10">
          <Link
            href="/dashboard/logout"
            className="flex items-center rounded-md px-3 py-2 text-red-300 hover:bg-secondary/70 hover:text-red-200 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span>Cerrar Sesión</span>
          </Link>
        </div>
      </div>
    </>
  )
}

