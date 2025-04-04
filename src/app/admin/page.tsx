"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Users, Settings, CreditCard, Webhook, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase-client"

// Add route segment config to mark this route as dynamic
export const dynamic = 'force-dynamic'

export default function AdminDashboard() {
  const router = useRouter()
  const [authChecking, setAuthChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin on client side
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error("Authentication error:", userError)
          router.push("/login?redirect=/admin")
          return
        }
        
        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
          .from('miembros')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (profileError) {
          console.error("Error fetching profile:", profileError)
          router.push("/dashboard")
          return
        }
        
        if (profile?.role !== 'admin') {
          console.log("Non-admin user attempting to access admin page")
          router.push("/dashboard")
          return
        }
        
        setIsAdmin(true)
      } catch (err) {
        console.error("Error checking admin status:", err)
        router.push("/dashboard")
      } finally {
        setAuthChecking(false)
      }
    }
    
    checkAdminStatus()
  }, [router])

  // Show loading state while checking authentication
  if (authChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos de administrador...</p>
        </div>
      </div>
    )
  }

  // If not admin, this will redirect (handled in useEffect)
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" />
              Blog Management
            </CardTitle>
            <CardDescription>Create, edit, and manage blog posts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Manage all blog content including creating new posts, editing existing ones, and removing outdated
              content.
            </p>
            <Link href="/admin/blog">
              <Button>Manage Blog</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              User Management
            </CardTitle>
            <CardDescription>Manage users and their roles</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">View, edit, and manage user accounts, roles, and permissions.</p>
            <Link href="/admin/users">
              <Button>Manage Users</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Webhook className="mr-2 h-5 w-5 text-primary" />
              Webhook Configuration
            </CardTitle>
            <CardDescription>Set up and manage Supabase webhooks</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Configure webhooks to handle events from Supabase, such as user creation, updates, and deletions.
            </p>
            <Link href="/admin/webhooks">
              <Button>Manage Webhooks</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="mr-2 h-5 w-5 text-primary" />
              Subscription Fixes
            </CardTitle>
            <CardDescription>Fix user subscription issues</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Manually update subscription status for users when webhooks fail or other issues occur.
            </p>
            <Link href="/admin/fix-subscription">
              <Button>Fix Subscriptions</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5 text-primary" />
              Site Settings
            </CardTitle>
            <CardDescription>Configure website settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Manage global site settings, configurations, and preferences.</p>
            <Button disabled>Coming Soon</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}