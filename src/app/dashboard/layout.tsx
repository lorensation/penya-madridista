"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { isUserBlocked } from "@/lib/blocked-users"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { useMobile } from "@/hooks/use-mobile"
import { useNavbarMenu } from "@/hooks/use-navbar-menu"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isMobile = useMobile()
  const { isOpen: isNavbarMenuOpen } = useNavbarMenu()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getUser()

        if (!data.user) {
          router.push("/login")
          return
        }

        // Check if user is blocked
        const blockedStatus = await isUserBlocked(data.user.id)
        if (blockedStatus) {
          console.log("Blocked user attempted to access dashboard:", data.user.email)
          // Force sign out
          await supabase.auth.signOut()
          // Redirect to blocked page with reason
          router.push(`/blocked?reason=${blockedStatus.reason_type || 'other'}`)
          return
        }

        setAuthenticated(true)
      } catch (error) {
        console.error("Error checking authentication:", error)
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar onStateChange={setIsSidebarOpen} />
      <main 
        className={`transition-all duration-300 ${
          isMobile 
            ? (!isSidebarOpen && !isNavbarMenuOpen) 
              ? "pt-20 pb-8 px-4 mx-auto max-w-3xl" // Center content on mobile when sidebar is closed
              : "pt-20 pb-8 px-4" 
            : isSidebarOpen
              ? "pt-16 pl-64 pr-4 pb-8" // Full sidebar on desktop
              : "pt-16 pl-16 pr-4 pb-8" // Icon sidebar on desktop
        }`}
      >
        {children}
      </main>
    </div>
  )
}