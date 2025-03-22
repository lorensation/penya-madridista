import type React from "react"
import { supabase } from "@/lib/supabase" // Updated import
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

async function getAdminUser() {
  // Get the current user
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  // Get the user profile from the miembros table
  const { data: profile } = await supabase.from("miembros").select("*").eq("auth_id", session.user.id).single()

  // Check if user is an admin
  if (!profile || profile.role !== "admin") {
    return null
  }

  return {
    user: session.user,
    profile,
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminUser = await getAdminUser()

  // If not an admin, redirect to login
  if (!adminUser) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <nav className="flex gap-4">
            <Link href="/admin">
              <Button variant="ghost" className="text-white hover:text-white hover:bg-primary/80">
                Dashboard
              </Button>
            </Link>
            <Link href="/admin/webhooks">
              <Button variant="ghost" className="text-white hover:text-white hover:bg-primary/80">
                Webhooks
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="bg-white text-primary hover:bg-gray-100">
                Exit Admin
              </Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">{children}</main>
    </div>
  )
}

