"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { BlogPostForm } from "@/components/blog/blog-post-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Database } from "@/types/supabase"

type BlogPost = Database['public']['Tables']['posts']['Row']

export default function EditBlogPostPage() {
  const router = useRouter()
  const params = useParams()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  
  const id = params.id as string
  
  // Fetch the blog post with useCallback to prevent unnecessary rerenders
  const fetchBlogPost = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error
      }

      if (!data) {
        router.push("/admin/blog")
        return
      }

      setPost(data)
    } catch (err) {
      console.error("Error fetching blog post:", err)
      setError("No se pudo cargar el artículo del blog")
    } finally {
      setLoading(false)
    }
  }, [id, router])
  
  // Check if user is admin on client side
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error("Authentication error:", userError)
          router.push("/login?redirect=/admin/blog/edit/" + id)
          return
        }
        
        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
          .from('miembros')
          .select('role')
          .eq('user_uuid', user.id)
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
        setAuthChecking(false)
        await fetchBlogPost()
      } catch (err) {
        console.error("Error checking admin status:", err)
        router.push("/dashboard")
      }
    }
    
    checkAdminStatus()
  }, [id, router, fetchBlogPost])

  // Show loading state while checking authentication
  if (authChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" aria-label="Cargando"></div>
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

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-center mt-4">Cargando artículo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Editar Artículo</h1>
      {post && (
        <BlogPostForm
          initialData={{
            ...post,
            excerpt: post.excerpt ?? undefined,
            image_url: post.image_url ?? undefined,
          }}
        />
      )}
    </div>
  )
}