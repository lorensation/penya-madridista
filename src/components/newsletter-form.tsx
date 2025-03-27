"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { subscribeToNewsletter } from "@/app/actions/newsletter"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function NewsletterForm() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append("email", email)

      const result = await subscribeToNewsletter(formData)

      if (result.success) {
        setSuccess(true)
        setEmail("")
      } else {
        setError(result.error || "Error al suscribirse. Inténtalo de nuevo.")
      }
    } catch (error) {
      setError("Error al suscribirse. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {success ? (
        <Alert className="bg-white/10 border-white/20 text-white mb-6">
          <AlertDescription>
            ¡Gracias por suscribirte! Recibirás nuestras actualizaciones en tu correo electrónico.
          </AlertDescription>
        </Alert>
      ) : error ? (
        <Alert className="bg-red-500/20 border-red-500/30 text-white mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          placeholder="Tu correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/70 focus:border-white"
        />
        <Button
          type="submit"
          disabled={loading}
          className="bg-white text-primary hover:bg-accent hover:text-white transition-colors"
        >
          {loading ? "Enviando..." : "Suscribirse"}
        </Button>
      </form>
    </div>
  )
}

