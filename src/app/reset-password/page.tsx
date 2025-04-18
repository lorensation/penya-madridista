"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Check, Loader2, ArrowRight, LockKeyhole, AlertCircle } from "lucide-react"
import Link from "next/link"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validLink, setValidLink] = useState<boolean | null>(null)

  useEffect(() => {
    const verifyToken = async () => {
      // Check for token in URL parameters
      const token = searchParams.get('token')
      const type = searchParams.get('type')
      
      if (type === 'recovery' && token) {
        // We have a recovery token in the URL
        setValidLink(true)
      } else {
        // No token found or not recovery type, check if user is authenticated as fallback
        try {
          const { data, error } = await supabase.auth.getUser()
          if (error || !data?.user) {
            setValidLink(false)
          } else {
            // User is authenticated somehow, allow password reset
            setValidLink(true)
          }
        } catch (err) {
          console.error("Error checking authentication:", err)
          setValidLink(false)
        }
      }
    }

    verifyToken()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Password validation
      if (password.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres")
      }

      if (password !== confirmPassword) {
        throw new Error("Las contraseñas no coinciden")
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        throw error
      }

      // Password updated successfully
      setSuccess(true)

      // Clear the form
      setPassword("")
      setConfirmPassword("")
      
      // Redirect to login page after delay
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error: unknown) {
      console.error("Error resetting password:", error)
      setError(error instanceof Error ? error.message : "No se pudo restablecer la contraseña")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <LockKeyhole className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Restablecer contraseña</CardTitle>
            <CardDescription className="text-center">
              Crea una nueva contraseña para tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 p-2">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <h3 className="text-lg font-medium">¡Contraseña actualizada!</h3>
                <p className="text-sm text-gray-500">
                  Tu contraseña ha sido cambiada con éxito. Redirigiendo a la página de inicio de sesión...
                </p>
              </div>
            ) : validLink === false ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-amber-100 p-2">
                    <AlertCircle className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-lg font-medium">Enlace no válido o expirado</h3>
                <p className="text-sm text-gray-500">
                  El enlace para restablecer la contraseña no es válido o ha expirado. Por favor, solicita un nuevo enlace.
                </p>
                <Button 
                  className="w-full mt-4 transition-all hover:bg-white hover:text-black hover:border hover:border-black" 
                  onClick={() => router.push("/forgot-password")}
                >
                  Solicitar nuevo enlace
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-1 text-gray-400"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      </span>
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    La contraseña debe tener al menos 6 caracteres
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-1 text-gray-400"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      </span>
                    </Button>
                  </div>
                </div>
                <Button
                  className="w-full"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Cambiar contraseña
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-center text-gray-500">
              <Link href="/login" className="text-primary hover:underline">
                Volver a inicio de sesión
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

// Loading component
function LoadingForm() {
  return (
    <div className="container max-w-3xl py-10">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando formulario para restablecer contraseña...</p>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingForm />}>
      <ResetPasswordContent />
    </Suspense>
  )
}