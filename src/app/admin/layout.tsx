///admin/layout.tsx
import type React from "react"
//import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
//import { checkAdminStatusSSR } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  /*const adminData = await checkAdminStatusSSR()

  // If not an admin, redirect to login
  if (!adminData) {
    console.log("Redirecting non-admin user to login page");
    redirect("/login")
  }*/

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <nav className="flex gap-4">
            <Link href="/admin">
              <Button variant="ghost" className="text-white hover:text-black transition-all hover:bg-white hover:border hover:border-white">
                Dashboard
              </Button>
            </Link>
            <Link href="/admin/blog">
              <Button variant="ghost" className="text-white hover:text-black transition-all hover:bg-white hover:border hover:border-white">
                Blog
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant="ghost" className="text-white hover:text-black transition-all hover:bg-white hover:border hover:border-white">
                Users
              </Button>
            </Link>
            <Link href="/admin/webhooks">
              <Button variant="ghost" className="text-white hover:text-black transition-all hover:bg-white hover:border hover:border-white">
                Webhooks
              </Button>
            </Link>
            <Link href="/admin/fix-subscription">
              <Button variant="ghost" className="text-white hover:text-black transition-all hover:bg-white hover:border hover:border-white">
                Fix Subscriptions
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="text-black hover:text-white transition-all hover:bg-black hover:border hover:border-white">
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