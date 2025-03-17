"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"
import { createStripeCheckout } from "@/app/actions/stripe"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Define membership plans
const membershipPlans = [
  {
    id: "annual",
    name: "Membresía Anual",
    price: "€50",
    period: "/año",
    priceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || "price_annual",
    features: [
      "Acceso a eventos exclusivos organizados por la peña",
      "Descuentos en viajes organizados para ver partidos",
      "Participación en sorteos y promociones exclusivas",
      "Acceso al contenido exclusivo en nuestra web",
      "Carnet oficial de socio de la Peña Lorenzo Sanz",
    ],
  },
  {
    id: "family",
    name: "Membresía Familiar",
    price: "€80",
    period: "/año",
    priceId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRICE_ID || "price_family",
    features: [
      "Todos los beneficios de la membresía individual",
      "Válido para hasta 4 miembros de la familia",
      "Descuentos adicionales en eventos familiares",
      "Prioridad en la reserva de entradas para partidos",
      "Carnets oficiales para todos los miembros incluidos",
    ],
    popular: true,
  },
]

export default function Membership() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      setLoading(false)
    }

    checkUser()
  }, [])

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push("/login?redirect=/membership")
      return
    }

    setCheckoutLoading(true)
    setError(null)

    try {
      const plan = membershipPlans.find((p) => p.id === planId)
      if (!plan) {
        throw new Error("Plan not found")
      }

      const formData = new FormData()
      formData.append("priceId", plan.priceId)
      formData.append("userId", user.id)
      formData.append("email", user.email)
      formData.append("name", user.user_metadata?.name || user.email)
      formData.append("planType", planId)

      const result = await createStripeCheckout(formData)

      if (result.error) {
        throw new Error(result.error)
      }

      if (result.url) {
        window.location.href = result.url
      }
    } catch (error: any) {
      console.error("Error subscribing:", error)
      setError(error.message || "Failed to process subscription")
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">Hazte Socio de la Peña Lorenzo Sanz</h1>
          <p className="text-lg text-gray-600">
            Únete a nuestra comunidad madridista y disfruta de beneficios exclusivos para socios.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="max-w-3xl mx-auto mb-8">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {membershipPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden ${plan.popular ? "border-2 border-secondary" : ""}`}
              >
                <div className={`${plan.popular ? "bg-secondary" : "bg-primary"} p-6 text-white text-center relative`}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-accent text-primary text-xs font-bold px-3 py-1 transform translate-y-2 rotate-45">
                      POPULAR
                    </div>
                  )}
                  <h2 className="text-2xl font-bold">{plan.name}</h2>
                  <p className="text-3xl font-bold mt-2">
                    {plan.price}
                    <span className="text-sm font-normal">{plan.period}</span>
                  </p>
                </div>
                <div className="p-6">
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Button
                      className={`w-full ${plan.popular ? "bg-secondary hover:bg-primary" : "bg-primary hover:bg-secondary"}`}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={checkoutLoading}
                    >
                      {checkoutLoading
                        ? "Procesando..."
                        : user
                          ? "Seleccionar Plan"
                          : "Iniciar Sesión para Suscribirse"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-primary mb-4">¿Tienes preguntas sobre la membresía?</h2>
            <p className="text-gray-600 mb-6">
              Estamos aquí para ayudarte. Contáctanos para obtener más información sobre los beneficios de ser socio.
            </p>
            <Link href="/contact">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                Contactar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

