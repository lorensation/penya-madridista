"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, AlertTriangle } from "lucide-react"
import { ImageGallery } from "@/components/ui/image-gallery"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

interface Profile {
  id: string
  subscription_status: string
  [key: string]: string | null | boolean | number
}

export default function HistoricGalleryPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let isMounted = true;
    
    const checkUser = async () => {
      try {
        // Only initialize Supabase client inside the useEffect
        const supabase = createBrowserSupabaseClient()
        
        // First check if user is authenticated
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("Session error:", sessionError)
          if (isMounted) {
            setError("Error al verificar la sesión")
            setLoading(false)
          }
          return
        }
        
        if (!sessionData.session) {
          console.log("No active session found")
          if (isMounted) {
            setLoading(false)
            router.push("/login")
          }
          return
        }
        
        // User is authenticated, set state
        if (isMounted) {
          setIsAuthenticated(true)
        }
        
        // Now get the user data using the session's user
        const userId = sessionData.session.user.id;
        
        // Fetch user profile directly using the session's user ID
        const { data: profileData, error: profileError } = await supabase
          .from("miembros")
          .select("*")
          .eq("id", userId)
          .single()

        if (profileError) {
          console.log("Profile fetch error:", profileError)
          if (isMounted) {
            setProfile(null)
          }
        } else if (isMounted) {
          setProfile(profileData as Profile)
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to load user data"
        console.error("Error fetching user data:", err)
        if (isMounted) {
          setError(errorMsg)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkUser()
    
    return () => {
      isMounted = false;
    }
  }, [router])

  // Add a listener for auth state changes
  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session) {
          setIsAuthenticated(true)
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false)
          router.push('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
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

  // If not authenticated, show loading while redirecting
  if (!isAuthenticated) {
    router.push("/login")
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    )
  }

  // Display error message if there was an error loading the profile
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center w-full">
          <Alert className="mb-8 bg-red-50 border-red-200 max-w-md">
            <AlertTriangle className="h-4 w-4 text-red-800" />
            <AlertDescription className="text-red-800 text-center">{error}</AlertDescription>
          </Alert>
        </div>
        <Button 
          onClick={() => router.push("/dashboard/content")}
          className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black"
        >
          Volver a Contenido
        </Button>
      </div>
    )
  }

  const subscriptionStatus = profile?.subscription_status || "inactive"
  const isSubscribed = subscriptionStatus === "active"

  // Fallback UI for non-members
  if (!isSubscribed) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="outline" 
          onClick={() => router.push("/dashboard/content")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Contenido
        </Button>
        
        <Card className="bg-gray-50 border-dashed">
          <CardHeader>
            <CardTitle>Contenido Premium</CardTitle>
            <CardDescription>
              Esta galería de imágenes históricas solo está disponible para socios con membresía activa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No tienes una membresía activa. Hazte socio para acceder a todo nuestro contenido exclusivo.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4">
              <Button 
                onClick={() => router.push("/dashboard/membership")}
                className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black"
              >
                Ver Planes de Membresía
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="outline" 
        onClick={() => router.push("/dashboard/content")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Contenido
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Colección de fotos históricas</h1>
        <p className="text-gray-600">
          Galería de imágenes inéditas de la época de Lorenzo Sanz como presidente del Real Madrid.
        </p>
      </div>

      <Card className="p-6 mb-8">
        <CardContent className="p-0">
          <ImageGallery 
            bucketName="images" 
            folderPath="historic"
            title="Imágenes históricas"
            description="Una mirada a momentos únicos de la historia del Real Madrid durante la presidencia de Lorenzo Sanz."
          />
        </CardContent>
      </Card>
    </div>
  )
}