"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { CheckCircle, Calendar, CreditCard, Award, Gift, Loader2, AlertCircle, BadgeCheck, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { hasMembershipAccess } from "@/lib/membership-access"
import type { PaymentInterval, PlanType, RedsysSignedRequest } from "@/lib/redsys"
import { prepareMembershipRedirectPayment } from "@/app/actions/payment"
import { RedsysRedirectAutoSubmitForm } from "@/components/payments/redsys-redirect-form"

const membershipPlans = [
  {
    id: "under25" as PlanType,
    name: "Suscripción Joven (Menores de 25)",
    paymentOptions: [
      { id: "monthly" as PaymentInterval, name: "Mensual", price: "5 €", period: "/mes" },
      { id: "annual" as PaymentInterval, name: "Anual", price: "50 €", period: "/año", discount: "¡Ahorra 2 meses!" },
    ],
    features: [
      "Acceso a eventos exclusivos organizados por la peña",
      "Descuentos en viajes organizados para ver partidos",
      "Participacion en sorteos y promociones exclusivas",
      "Acceso al contenido exclusivo en nuestra web",
      "Carnet oficial de socio de la Peña Lorenzo Sanz",
    ],
  },
  {
    id: "over25" as PlanType,
    name: "Suscripción Adulto (Mayores de 25)",
    paymentOptions: [
      { id: "monthly" as PaymentInterval, name: "Mensual", price: "10 €", period: "/mes" },
      { id: "annual" as PaymentInterval, name: "Anual", price: "100 €", period: "/año", discount: "¡Ahorra 2 meses!" },
    ],
    features: [
      "Acceso a eventos exclusivos organizados por la peña",
      "Descuentos en viajes organizados para ver partidos",
      "Participacion en sorteos y promociones exclusivas",
      "Acceso al contenido exclusivo en nuestra web",
      "Carnet oficial de socio de la Peña Lorenzo Sanz",
    ],
    popular: true,
  },
  // Family plan hidden from UI — kept in backend for potential future use
  // {
  //   id: "family" as PlanType,
  //   name: "Suscripción Familiar (Un adulto y un menor)",
  //   paymentOptions: [
  //     { id: "monthly" as PaymentInterval, name: "Mensual", price: "15 €", period: "/mes" },
  //     { id: "annual" as PaymentInterval, name: "Anual", price: "150 €", period: "/año", discount: "¡Ahorra 2 meses!" },
  //   ],
  //   features: [
  //     "Todos los beneficios de la suscripción individual",
  //     "Valido para un adulto y un menor miembros de la familia",
  //     "Descuentos adicionales en eventos familiares",
  //     "Carnets oficiales para todos los miembros incluidos",
  //     "Actividades para los más pequenos",
  //   ],
  // },
]

type MembershipStep = "select" | "processing" | "redirecting"

interface MembershipSubscription {
  status: string | null
  end_date: string | null
}

export default function MembershipPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userAge, setUserAge] = useState<number | null>(null)
  const [needsDob, setNeedsDob] = useState(false)
  const [fallbackDob, setFallbackDob] = useState("")

  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)
  const [selectedPaymentOption, setSelectedPaymentOption] = useState<PaymentInterval | null>(null)

  const [step, setStep] = useState<MembershipStep>("select")
  const [redirectActionUrl, setRedirectActionUrl] = useState<string | null>(null)
  const [redirectSigned, setRedirectSigned] = useState<RedsysSignedRequest | null>(null)

  useEffect(() => {
    const checkUserAndMembership = async () => {
      try {
        setIsLoading(true)

        const { data: userData } = await supabase.auth.getUser()
        setUser(userData.user)

        if (!userData.user) {
          return
        }

        // Read fecha_nacimiento from user metadata and compute age
        const dob = userData.user.user_metadata?.fecha_nacimiento as string | undefined
        if (dob) {
          const birthDate = new Date(dob)
          const today = new Date()
          let age = today.getFullYear() - birthDate.getFullYear()
          const m = today.getMonth() - birthDate.getMonth()
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
          }
          setUserAge(age)
        } else {
          // Existing user without DOB in metadata — will need fallback
          setNeedsDob(true)
        }

        const { data: memberData, error: memberError } = await supabase
          .from("users")
          .select("is_member")
          .eq("id", userData.user.id)
          .maybeSingle()

        if (memberError) {
          console.error("[membership] Error checking membership status", memberError)
        }

        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from("subscriptions")
          .select("status, end_date")
          .eq("member_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        if (subscriptionError) {
          console.error("[membership] Error checking subscription status", subscriptionError)
        }

        const subscription = subscriptionData as MembershipSubscription | null
        const hasCurrentAccess = subscription
          ? hasMembershipAccess({
              status: subscription.status,
              endDate: subscription.end_date,
            })
          : Boolean(memberData?.is_member)

        setIsMember(hasCurrentAccess)
      } catch (loadError) {
        console.error("[membership] Error checking user status", loadError)
        setError("Error al comprobar el estado de suscripción")
      } finally {
        setIsLoading(false)
      }
    }

    checkUserAndMembership()
  }, [])

  // Helper to compute age from a date string
  const computeAge = (dob: string): number => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Handle fallback DOB submission for existing users without metadata
  const handleFallbackDobSubmit = async () => {
    if (!fallbackDob || !user) return
    const age = computeAge(fallbackDob)
    setUserAge(age)
    setNeedsDob(false)

    // Persist to user metadata so they don't have to enter it again
    try {
      await supabase.auth.updateUser({
        data: { fecha_nacimiento: fallbackDob },
      })
    } catch (e) {
      console.error("[membership] Failed to persist DOB to user metadata", e)
    }
  }

  const handleSelectPlan = (planId: PlanType) => {
    if (planId === "under25" && userAge !== null && userAge >= 25) {
      setError("La suscripción Joven está disponible solo para menores de 25 años. Por favor, selecciona la suscripción Adulto.")
      return
    }
    setSelectedPlan(planId)
    setSelectedPaymentOption(null)
    setError(null)
  }

  const handleSubscribe = async () => {
    if (!selectedPlan || !selectedPaymentOption) {
      return
    }

    if (!user) {
      router.push("/login?redirect=/membership")
      return
    }

    setError(null)
    setStep("processing")

    try {
      const result = await prepareMembershipRedirectPayment(selectedPlan, selectedPaymentOption)

      if (!result.success || !result.actionUrl || !result.signed || !result.order) {
        setError(result.error || "No se pudo preparar el pago")
        setStep("select")
        return
      }

      setRedirectActionUrl(result.actionUrl)
      setRedirectSigned(result.signed)
      setStep("redirecting")
    } catch (prepareError) {
      console.error("[membership] Error preparing redirect payment", prepareError)
      setError("Error al preparar el pago")
      setStep("select")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 md:py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando informacion de suscripción...</p>
        </div>
      </div>
    )
  }

  if (isMember) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 md:py-24 border-gray-500">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <BadgeCheck className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">Gracias por ser socio</h1>
              <p className="text-lg text-gray-600">Eres un miembro activo de la Peña Lorenzo Sanz.</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-primary mb-4">Beneficios de tu suscripción</h2>
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
                  <span>Participacion en sorteos y promociones exclusivas</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span>Acceso al contenido exclusivo en nuestra web</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="mb-6 text-gray-600">Gestiona tu suscripción, actualiza tus datos o consulta renovaciones.</p>
              <Link href="/dashboard/membership">
                <Button size="lg" className="px-6 py-5 text-lg hover:bg-white hover:text-black hover:border hover:border-black">
                  Gestionar mi suscripción
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === "processing") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 md:py-24">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Preparando pasarela de pago...</p>
        </div>
      </div>
    )
  }

  if (step === "redirecting" && redirectActionUrl && redirectSigned) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 md:py-24">
        <div className="max-w-lg w-full bg-white rounded-lg shadow-md p-8 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-primary mt-4">Redirigiendo a Redsys</h1>
          <p className="text-gray-600 mt-2">No cierres esta pagina. Te llevamos al TPV seguro para completar el pago.</p>
          <div className="mt-6">
            <RedsysRedirectAutoSubmitForm actionUrl={redirectActionUrl} signed={redirectSigned} />
          </div>
        </div>
      </div>
    )
  }

  const selectedPlanData = membershipPlans.find((plan) => plan.id === selectedPlan)

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">Hazte socio de la Peña Lorenzo Sanz</h1>
          <p className="text-lg text-gray-600">Unete a nuestra comunidad madridista y disfruta de beneficios exclusivos.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="max-w-3xl mx-auto mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Fallback: ask for DOB if existing user has no fecha_nacimiento in metadata */}
        {user && needsDob && (
          <div className="max-w-md mx-auto mb-8 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start gap-3 mb-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary">Necesitamos tu fecha de nacimiento</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Para verificar tu elegibilidad en los distintos planes de suscripción, introduce tu fecha de nacimiento.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Input
                type="date"
                value={fallbackDob}
                onChange={(e) => setFallbackDob(e.target.value)}
                className="flex-grow"
              />
              <Button onClick={handleFallbackDobSubmit} disabled={!fallbackDob}>
                Confirmar
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Declaro que mi fecha de nacimiento es correcta. La peña se reserva el derecho de solicitar documentación acreditativa.
            </p>
          </div>
        )}

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {membershipPlans.map((plan) => {
              const isUnder25Disabled = plan.id === "under25" && userAge !== null && userAge >= 25
              return (
              <button
                key={plan.id}
                type="button"
                disabled={isUnder25Disabled}
                className={`bg-white rounded-lg shadow-md overflow-hidden text-left transition-all flex flex-col h-full ${
                  plan.popular ? "border-2 border-secondary" : ""
                } ${selectedPlan === plan.id ? "ring-2 ring-primary" : ""} ${
                  isUnder25Disabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => handleSelectPlan(plan.id)}
              >
                <div className="bg-primary text-white p-6 text-center relative">
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-accent text-primary text-xs font-bold px-3 py-1 transform translate-y-2 rotate-45">
                      POPULAR
                    </div>
                  )}
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                </div>
                <div className="p-6 flex-grow flex flex-col">
                  <div className="mb-6 border-b pb-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-primary mr-1" />
                        <span className="text-sm">Mensual</span>
                      </div>
                      <span className="font-bold">{plan.paymentOptions.find((opt) => opt.id === "monthly")?.price}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 text-primary mr-1" />
                        <span className="text-sm">Anual</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{plan.paymentOptions.find((opt) => opt.id === "annual")?.price}</span>
                        {plan.paymentOptions.find((opt) => opt.id === "annual")?.discount && (
                          <div className="text-xs text-green-600">{plan.paymentOptions.find((opt) => opt.id === "annual")?.discount}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-4 mb-auto">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </button>
              )
            })}
          </div>

          {selectedPlanData && (
            <div className="mt-8 bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-primary mb-4">Elige tu opcion de pago</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedPlanData.paymentOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`border rounded-lg p-4 text-left transition-all ${
                      selectedPaymentOption === option.id ? "border-primary ring-2 ring-primary" : "border-gray-200"
                    }`}
                    onClick={() => setSelectedPaymentOption(option.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{option.name}</span>
                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {option.price}
                          <span className="text-sm font-normal text-gray-500">{option.period}</span>
                        </div>
                        {option.discount && <div className="text-xs text-green-600 font-medium">{option.discount}</div>}
                      </div>
                    </div>
                  </button>
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
              {!user ? "Iniciar sesion para suscribirse" : "Continuar con el pago"}
            </Button>
          </div>

          <div className="mt-12 bg-white rounded-lg shadow-md p-8 text-center">
            <h2 className="text-2xl font-bold text-primary mb-4">¿Tienes preguntas sobre la suscripción?</h2>
            <p className="text-gray-600 mb-6">Estamos aquí para ayudarte con cualquier duda sobre nuestros planes.</p>
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
