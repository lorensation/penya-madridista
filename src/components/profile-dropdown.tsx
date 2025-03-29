"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMobile } from "@/hooks/use-mobile"

interface User {
  id: string
  email?: string
  name?: string
}

interface ProfileDropdownProps {
  user: User
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Generate initials from name or email
  const getInitials = () => {
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    } else if (user.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return "US"
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => !isMobile && setIsOpen(true)}
      >
        <Avatar className="h-8 w-8 bg-secondary text-white">
          <AvatarImage src="/logo.jpg" alt={user.name || "User profile"} />
          <AvatarFallback className="bg-secondary text-white">{getInitials()}</AvatarFallback>
        </Avatar>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg z-50"
          onMouseLeave={() => !isMobile && setIsOpen(false)}
        >
          <div className="py-1 rounded-md bg-secondary text-white shadow-xs">
            {user.name && (
              <div className="px-4 py-2 text-sm border-b border-white/10">
                <p className="font-medium">{user.name}</p>
                <p className="text-xs opacity-75 truncate">{user.email}</p>
              </div>
            )}
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm hover:bg-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Panel de Socio
            </Link>
            <Link
              href="/dashboard/settings"
              className="block px-4 py-2 text-sm hover:bg-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Configuración
            </Link>
            <Link
              href="/dashboard/logout"
              className="block px-4 py-2 text-sm text-red-300 hover:bg-primary transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Cerrar Sesión
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

