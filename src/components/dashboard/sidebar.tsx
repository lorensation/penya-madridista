"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMobile } from "@/hooks/use-mobile"
import { useNavbarMenu } from "@/hooks/use-navbar-menu"
import {
  Home,
  CreditCard,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface DashboardSidebarProps {
  onStateChange?: (isOpen: boolean) => void
}

export function DashboardSidebar({ onStateChange }: DashboardSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true) // Default to collapsed/hidden
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()
  const isMobile = useMobile()
  
  // Get the navbar menu state
  const { isOpen: isNavbarMenuOpen } = useNavbarMenu()

  // Notify parent component about sidebar state changes
  useEffect(() => {
    if (onStateChange) {
      if (isMobile) {
        onStateChange(isMobileOpen)
      } else {
        onStateChange(!isCollapsed)
      }
    }
  }, [isMobile, isMobileOpen, isCollapsed, onStateChange])

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
    // Special case for dashboard home
    if (path === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/"
    }
    return pathname?.startsWith(path)
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
      {/* Mobile overlay - only when expanded */}
      {isMobile && isMobileOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />}

      {/* Mobile toggle button - only visible when sidebar is NOT open AND navbar menu is NOT open */}
      {isMobile && !isMobileOpen && !isNavbarMenuOpen && (
        <button
          data-sidebar-toggle
          className="fixed z-50 p-2 rounded-md bg-primary text-white shadow-md top-20 left-4"
          onClick={toggleMobileMenu}
          aria-label="Expandir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {/* Desktop toggle button */}
      {!isMobile && (
        <button
          data-sidebar-toggle
          className={`fixed z-50 p-2 rounded-md bg-primary text-white shadow-md ${
            isCollapsed ? "top-20 left-4" : "hidden"
          }`}
          onClick={toggleCollapse}
          aria-label="Expandir menú"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Expanded Sidebar */}
      <div
        data-sidebar
        className={`fixed top-16 bottom-0 left-0 z-40 flex flex-col bg-primary text-white transition-all duration-300 ${
          isMobile
            ? isMobileOpen
              ? "w-64 translate-x-0"
              : "w-0 -translate-x-100"
            : isCollapsed
              ? "w-0 overflow-hidden"
              : "w-64"
        }`}
      >
        {/* Sidebar header with toggle button on the right */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold">Panel de Socio</h2>
          <button
            data-sidebar-toggle
            className="p-1 rounded-md text-white hover:bg-white/10"
            onClick={isMobile ? toggleMobileMenu : toggleCollapse}
            aria-label="Colapsar menú"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
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
                      ? "bg-secondary text-black font-medium"
                      : "bg-black text-white hover:bg-secondary hover:text-black"
                  }`}
                  onClick={() => isMobile && setIsMobileOpen(false)}
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
            className="flex items-center rounded-md px-3 py-2 text-red-300 hover:bg-secondary hover:text-red-500 transition-colors"
            onClick={() => isMobile && setIsMobileOpen(false)}
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span>Cerrar Sesión</span>
          </Link>
        </div>
      </div>

      {/* Icons-only sidebar for desktop (visible when collapsed) */}
      {(!isMobile && isCollapsed) && (
        <div className="fixed top-16 bottom-0 left-0 z-30 w-16 bg-primary flex flex-col items-center py-8 overflow-y-auto">
          {/* Start navigation items below the toggle button */}
          <ul className="space-y-6 w-full mt-8">
            {navItems.map((item) => (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  className={`p-2 rounded-md transition-colors ${
                    isActive(item.href)
                      ? "bg-secondary text-black"
                      : "bg-black text-white hover:bg-secondary hover:text-black"
                  }`}
                  title={item.name}
                >
                  {item.icon}
                  {/* Remove the text span to only show icons */}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-auto mb-4 flex justify-center w-full">
            <Link
              href="/dashboard/logout"
              className="p-2 rounded-md bg-black text-red-300 hover:bg-secondary hover:text-red-500 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="h-5 w-5" />
              {/* Remove the text span to only show icon */}
            </Link>
          </div>
        </div>
      )}

      {/* Mobile collapsed sidebar - only shows toggle button, no icons */}
      {(isMobile && !isMobileOpen) && (
        <div className="fixed top-16 bottom-0 left-0 z-30 w-0 bg-primary overflow-hidden">
          {/* This is intentionally empty - we only want the toggle button for mobile */}
        </div>
      )}
    </>
  )
}