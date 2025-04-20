"use client"

import type React from "react"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "@/lib/supabase"
import { isUserBlocked } from "@/lib/blocked-users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AuthError } from "@supabase/supabase-js"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

function LoginFormContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get("returnUrl")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { error, data } = await signIn(email, password) // Using the unified function

      if (error) {
        throw error
      }

      // Check if user is blocked
      if (data?.user) {
        const blockedStatus = await isUserBlocked(data.user.id)
        
        if (blockedStatus) {
          // User is blocked, redirect to blocked page with reason
          router.push(`/blocked?reason=${blockedStatus.reason_type || 'other'}`)
          return
        }
      }

      // Set success state before redirecting
      setSuccess(true)

      // Determine where to redirect after login
      const redirectTo = returnUrl ? decodeURIComponent(returnUrl) : "/dashboard"

      // Delay redirect to show success message
      setTimeout(() => {
        router.push(redirectTo)
        router.refresh()
      }, 1500)
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        setError(error.message)
      } else if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Failed to sign in")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
          <AlertDescription className="text-green-800">
            ¡Inicio de sesión exitoso! Redirigiendo...
          </AlertDescription>
        </Alert>
      )}

      {returnUrl && returnUrl.includes("admin_invite") && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            Inicia sesión para completar tu perfil de miembro y activar tu invitación.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      
      {/* Forgot password link */}
      <div className="flex justify-end">
        <Link 
          href="/forgot-password" 
          className="text-sm text-primary hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button type="submit" className="w-full hover:bg-white hover:text-primary hover:border hover:border-black" disabled={loading || success}>
        {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
      </Button>
    </form>
  )
}

// Loading component
function LoadingForm() {
  return (
    <div className="container max-w-3xl py-10">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando formulario de registro...</p>
      </div>
    </div>
  )
}

export function LoginForm() {
  return (
    <Suspense fallback={<LoadingForm />}>
      <LoginFormContent />
    </Suspense>
  )
}