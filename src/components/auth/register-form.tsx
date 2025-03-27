"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signUp } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthResult {
  success?: boolean
  error?: string
  message?: string
}

export default function RegisterForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuthResult | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData(e.currentTarget)
      const password = formData.get("password") as string
      const confirmPassword = formData.get("confirmPassword") as string

      // Check if passwords match
      if (password !== confirmPassword) {
        setResult({
          success: false,
          error: "Las contraseñas no coinciden",
        })
        setLoading(false)
        return
      }

      const response = await signUp(formData)

      if (response.error) {
        setResult({
          success: false,
          error: response.error,
        })
      } else {
        setResult({
          success: true,
          message: "Registro exitoso. Por favor verifica tu correo electrónico.",
        })
        // Redirect to verification page
        router.push("/auth/verify")
      }
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Error en el registro",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">Crear Cuenta</h2>

        {result && (
          <Alert
            variant={result.success ? "default" : "destructive"}
            className={result.success ? "bg-green-50 border-green-200 text-green-800 mb-4" : "mb-4"}
          >
            <AlertDescription>{result.success ? result.message : result.error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" name="name" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required className="mt-1" />
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Al registrarte, aceptas nuestros{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Términos de Servicio
            </Link>{" "}
            y{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Política de Privacidad
            </Link>
            .
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Procesando..." : "Registrarse"}
          </Button>
        </form>
      </div>
      <div className="text-center">
        <p className="text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

