"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { loadStripe } from "@stripe/stripe-js"

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Plan = {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  priceId: string
}

const plans: Plan[] = [
  {
    id: "annual",
    name: "Socio Anual",
    price: 100,
    description: "Membresía anual a la Peña Madridista",
    features: [
      "Acceso a eventos exclusivos",
      "Descuentos en merchandising",
      "Prioridad en entradas para partidos",
      "Boletín mensual exclusivo",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID!,
  },
  {
    id: "family",
    name: "Socio Familiar",
    price: 150,
    description: "Membresía familiar a la Peña Madridista",
    features: [
      "Todos los beneficios del plan anual",
      "Inscribe a un miembro menor junto con un adulto",
      "Descuentos adicionales en eventos",
      "Actividades para los más jóvenes",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID!,
  },
]

export default function PlanSelection() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan)
  }

  const handleSubscribe = async () => {
    if (!selectedPlan) return
    if (!user) {
      router.push("/auth/login?redirect=/hazte-socio")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: selectedPlan.priceId,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al crear la sesión de pago")
      }

      const { sessionId } = await response.json()
      const stripe = await stripePromise

      if (!stripe) {
        throw new Error("Error al cargar Stripe")
      }

      const { error } = await stripe.redirectToCheckout({ sessionId })

      if (error) {
        throw error
      }
    } catch (err: Error | unknown) {
      const errorMessage = err instanceof Error ? err.message : "Ocurrió un error al procesar el pago"
      setError(errorMessage)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold text-center mb-8">Hazte Socio de la Peña Madridista</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`cursor-pointer transition-all ${selectedPlan?.id === plan.id ? "border-primary ring-2 ring-primary" : "hover:border-primary"}`}
            onClick={() => handleSelectPlan(plan)}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">
                {plan.price}€ <span className="text-sm font-normal text-muted-foreground">/año</span>
              </div>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                className="w-full"
                onClick={() => handleSelectPlan(plan)}
              >
                {selectedPlan?.id === plan.id ? "Plan seleccionado" : "Seleccionar plan"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Button size="lg" disabled={!selectedPlan || loading} onClick={handleSubscribe}>
          {loading ? "Procesando..." : "Continuar con el pago"}
        </Button>
      </div>
    </div>
  )
}