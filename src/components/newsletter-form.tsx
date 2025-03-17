"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { subscribeNewsletter } from "@/app/actions/newsletter"
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

    try {
      const formData = new FormData()
      formData.append("email", email)

      const result = await subscribeNewsletter(formData)

      if (result.error) {
        throw new Error(result.error)
      }

      setSuccess(true)
      setEmail("")
    } catch (error: any) {
      console.error("Error subscribing to newsletter:", error)
      setError(error.message || "Failed to subscribe to newsletter")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {success ? (
        <Alert className="bg-green-50 border-green-200 text-green-800 mb-6">
          <AlertDescription>¡Gracias por suscribirte! Te hemos enviado un correo de confirmación.</AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
        <Input
          type="email"
          placeholder="Tu correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-grow px-4 py-3 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent"
          required
        />
        <Button
          type="submit"
          className="bg-white text-primary hover:bg-accent hover:text-white whitespace-nowrap"
          disabled={loading}
        >
          {loading ? "Suscribiendo..." : "Suscribirse"}
        </Button>
      </form>
    </div>
  )
}

