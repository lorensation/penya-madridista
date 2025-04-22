"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle, Calendar, CreditCard, Award, BadgeCheck, Gift } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { User } from "@supabase/supabase-js"

// Define membership plans with direct checkout links
const membershipPlans = [
  {
    id: "under25",
    name: "Membresía Joven (Menores de 25)",
    productId: process.env.NEXT_PUBLIC_STRIPE_UNDER25_PRODUCT_ID,
    paymentOptions: [
      {
        id: "monthly",
        name: "Mensual",
        price: "€5",
        period: "/mes",
        checkoutUrl: "https://buy.stripe.com/test_3cs3ch5c6aQN6E86ox",
      },
      {
        id: "annual",
        name: "Anual",
        price: "€50",
        period: "/año",
        checkoutUrl: "https://buy.stripe.com/test_4gw9AF6ga5wtd2w7sv",
        discount: "¡Ahorra 2 meses!"
      }
    ],
    features: [
      "Acceso a eventos exclusivos organizados por la peña",
      "Descuentos en viajes organizados para ver partidos",
      "Participación en sorteos y promociones exclusivas",
      "Acceso al contenido exclusivo en nuestra web",
      "Carnet oficial de socio de la Peña Lorenzo Sanz",
    ],
  },
  {
    id: "over25",
    name: "Membresía Adulto (Mayores de 25)",
    productId: process.env.NEXT_PUBLIC_STRIPE_OVER25_PRODUCT_ID,
    paymentOptions: [
      {
        id: "monthly",
        name: "Mensual",
        price: "€10",
        period: "/mes",
        checkoutUrl: "https://buy.stripe.com/test_bIY149dIC6AxgeI6ou",
      },
      {
        id: "annual",
        name: "Anual",
        price: "€100",
        period: "/año",
        checkoutUrl: "https://buy.stripe.com/test_4gw5kpcEy6Ax9Qk7sx",
        discount: "¡Ahorra 2 meses!"
      }
    ],
    features: [
      "Acceso a eventos exclusivos organizados por la peña",
      "Descuentos en viajes organizados para ver partidos",
      "Participación en sorteos y promociones exclusivas",
      "Acceso al contenido exclusivo en nuestra web",
      "Carnet oficial de socio de la Peña Lorenzo Sanz",
    ],
    popular: true,
  },
  {
    id: "family",
    name: "Membresía Familiar (Un adulto y un menor)",
    productId: process.env.NEXT_PUBLIC_STRIPE_FAMILY_PRODUCT_ID,
    paymentOptions: [
      {
        id: "monthly",
        name: "Mensual",
        price: "€15",
        period: "/mes",
        checkoutUrl: "https://buy.stripe.com/test_14k149fQK2kh4w06ow",
      },
      {
        id: "annual",
        name: "Anual",
        price: "€150",
        period: "/año",
        checkoutUrl: "https://buy.stripe.com/test_dR67sx8oi0c99Qk6ov",
        discount: "¡Ahorra 2 meses!"
      }
    ],
    features: [
      "Todos los beneficios de la membresía individual",
      "Válido para un adulto y un menor miembros de la familia",
      "Descuentos adicionales en eventos familiares",
      "Carnets oficiales para todos los miembros incluidos",
      "Actividades para los más pequeños",
    ],
  },
]

export default function Membership() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isMember, setIsMember] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<string | null>(null)

  useEffect(() => {
    const checkUserAndMembership = async () => {
      try {
        setIsLoading(true)
        // Get the current user
        const { data: userData } = await supabase.auth.getUser()
        setUser(userData.user)

        // If user is logged in, check if they are a member
        if (userData.user) {
          const { data: memberData, error: memberError } = await supabase
            .from('users')
            .select('is_member')
            .eq('id', userData.user.id)
            .single()

          if (memberError) {
            console.error('Error checking membership status:', memberError)
          } else if (memberData) {
            setIsMember(memberData.is_member)
          }
        }
      } catch (err) {
        console.error('Error checking user status:', err)
        setError('Error checking membership status')
      } finally {
        setIsLoading(false)
      }
    }

    checkUserAndMembership()
  }, [])

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId)
    setSelectedPaymentOption(null) // Reset payment option when plan changes
  }

  const handleSelectPaymentOption = (optionId: string) => {
    setSelectedPaymentOption(optionId)
  }

  const handleSubscribe = () => {
    if (!selectedPlan || !selectedPaymentOption) return

    if (!user) {
      router.push("/login?redirect=/membership")
      return
    }

    // Get the selected plan and payment option
    const plan = membershipPlans.find((p) => p.id === selectedPlan)
    if (!plan) {
      setError("Plan not found")
      return
    }

    const paymentOption = plan.paymentOptions.find((o) => o.id === selectedPaymentOption)
    if (!paymentOption) {
      setError("Payment option not found")
      return
    }

    // Redirect to the direct Stripe checkout URL
    window.location.href = paymentOption.checkoutUrl
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 md:py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información de membresía...</p>
        </div>
      </div>
    )
  }

  // Render member UI if user is already a member
  if (isMember) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 md:py-24 border-gray-500">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <BadgeCheck className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">¡Gracias por ser Socio!</h1>
              <p className="text-lg text-gray-600">
                Eres un miembro activo de la Peña Lorenzo Sanz.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-primary mb-4">Beneficios de tu membresía</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Award className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span>Acceso a eventos exclusivos organizados por la peña</span>
                </div>
                <div className="flex items-start">
                  <Gift className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span>Descuentos en viajes organizados para ver partidos</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span>Participación en sorteos y promociones exclusivas</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span>Acceso al contenido exclusivo en nuestra web</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <p className="mb-6 text-gray-600">
                Gestiona tu membresía, actualiza tus datos o consulta información sobre renovación.
              </p>
              <Link href="/dashboard/membership">
                <Button size="lg" className="px-6 py-5 text-lg hover:bg-white hover:text-black hover:border hover:border-black">
                  Gestionar mi membresía
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Original non-member UI
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
        
        {/* Rest of the original UI */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {membershipPlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all flex flex-col h-full ${
                  plan.popular ? "border-2 border-secondary" : ""
                } ${selectedPlan === plan.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => handleSelectPlan(plan.id)}
              >
                <div className={`${plan.popular ? "bg-primary text-white" : "bg-primary text-white"} p-6 text-center relative`}>
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-accent text-primary text-xs font-bold px-3 py-1 transform translate-y-2 rotate-45">
                      POPULAR
                    </div>
                  )}
                  <h2 className="text-2xl font-bold">{plan.name}</h2>
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <ul className="space-y-4 mb-auto">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 pt-4">
                    <Button
                      className={`w-full ${
                        selectedPlan === plan.id
                          ? "bg-primary"
                          : plan.popular
                            ? "bg-gray-200 text-black hover:bg-primary hover:text-white"
                            : "bg-gray-200 text-black hover:bg-primary hover:text-white"
                      }`}
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      {selectedPlan === plan.id ? "Plan seleccionado" : "Seleccionar Plan"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedPlan && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-primary mb-4">Elige tu opción de pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {membershipPlans
                  .find((p) => p.id === selectedPlan)
                  ?.paymentOptions.map((option) => (
                    <div
                      key={option.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPaymentOption === option.id ? "border-primary ring-2 ring-primary" : "border-gray-200"
                      }`}
                      onClick={() => handleSelectPaymentOption(option.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {option.id === "monthly" ? (
                            <Calendar className="h-5 w-5 text-primary mr-2" />
                          ) : (
                            <CreditCard className="h-5 w-5 text-primary mr-2" />
                          )}
                          <span className="font-medium">{option.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold">
                            {option.price}
                            <span className="text-sm font-normal text-gray-500">{option.period}</span>
                          </div>
                          {option.discount && (
                            <div className="text-xs text-green-600 font-medium">{option.discount}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <Button 
              size="lg" 
              onClick={handleSubscribe} 
              disabled={!selectedPlan || !selectedPaymentOption} 
              className="px-8 py-6 text-lg"
            >
              {user ? "Continuar con el pago" : "Iniciar Sesión para Suscribirse"}
            </Button>
          </div>

          <div className="mt-12 bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-primary mb-4">¿Tienes preguntas sobre la membresía?</h2>
            <p className="text-gray-600 mb-6">
              Estamos aquí para ayudarte. Contáctanos para obtener más información sobre los beneficios de ser socio.
            </p>
            <Link href="/contact">
              <Button variant="outline" className="transition-colors duration-300 bg-black text-white hover:bg-white hover:text-black hover:border hover:border-black">
                Contactar
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}