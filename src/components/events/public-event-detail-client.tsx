"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Lock, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RedsysRedirectAutoSubmitForm } from "@/components/payments/redsys-redirect-form"
import { prepareEventRedirectPayment } from "@/app/actions/payment"
import type { EventViewerAccess } from "@/lib/events"
import type { RedsysSignedRequest } from "@/lib/redsys"
import { formatShopPrice } from "@/lib/utils"

interface PublicEventDetailClientProps {
  eventId: string
  oneTimePriceCents: number | null
  viewerAccess: EventViewerAccess
  whatsappLink: string
  eventPath: string
  ticketStatus: {
    order: string
    confirmed: boolean
  } | null
}

type EventCheckoutStep = "idle" | "processing" | "redirecting"

export function PublicEventDetailClient({
  eventId,
  oneTimePriceCents,
  viewerAccess,
  whatsappLink,
  eventPath,
  ticketStatus,
}: PublicEventDetailClientProps) {
  const [step, setStep] = useState<EventCheckoutStep>("idle")
  const [error, setError] = useState<string | null>(null)
  const [redirectActionUrl, setRedirectActionUrl] = useState<string | null>(null)
  const [redirectSigned, setRedirectSigned] = useState<RedsysSignedRequest | null>(null)
  const ticketPriceCents =
    typeof oneTimePriceCents === "number" && Number.isInteger(oneTimePriceCents) ? oneTimePriceCents : null

  const handlePurchase = async () => {
    setError(null)
    setStep("processing")

    try {
      const result = await prepareEventRedirectPayment(eventId)

      if (!result.success || !result.actionUrl || !result.signed || !result.order) {
        setError(result.error || "No se pudo preparar el pago")
        setStep("idle")
        return
      }

      setRedirectActionUrl(result.actionUrl)
      setRedirectSigned(result.signed)
      setStep("redirecting")
    } catch (submitError) {
      console.error("[event-detail] Error preparing event payment", submitError)
      setError("No se pudo preparar el pago")
      setStep("idle")
    }
  }

  if (viewerAccess === "member" || ticketStatus?.confirmed) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-900">
            {viewerAccess === "member"
              ? "Tu suscripción está activa. Puedes reservar directamente tu plaza por WhatsApp."
              : "Tu entrada está confirmada. Ya puedes completar la reserva del evento por WhatsApp."}
          </AlertDescription>
        </Alert>
        <Button asChild size="lg" className="w-full">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            Reservar plaza por WhatsApp
          </a>
        </Button>
      </div>
    )
  }

  if (ticketStatus && !ticketStatus.confirmed) {
    return (
      <div className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-900">
            Tu pago está autorizado. Completa tus datos para desbloquear la reserva por WhatsApp.
          </AlertDescription>
        </Alert>
        <Button asChild size="lg" className="w-full">
          <Link href={`${eventPath}/redsys/ok?order=${encodeURIComponent(ticketStatus.order)}`}>
            Completar datos de asistencia
          </Link>
        </Button>
      </div>
    )
  }

  if (step === "redirecting" && redirectActionUrl && redirectSigned) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-gray-50 p-4 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-gray-600">
            Redirigiendo al TPV seguro de Redsys. No cierres esta página.
          </p>
        </div>
        <RedsysRedirectAutoSubmitForm actionUrl={redirectActionUrl} signed={redirectSigned} />
      </div>
    )
  }

  if (ticketPriceCents === null || ticketPriceCents <= 0) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Este evento no tiene una entrada puntual configurada. Si quieres asistir, contacta con la peña.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Entrada puntual</p>
            <p className="text-2xl font-bold text-primary">{formatShopPrice(ticketPriceCents)}</p>
          </div>
          <Ticket className="h-8 w-8 text-primary" />
        </div>
        <p className="mt-3 text-sm text-gray-600">
          {viewerAccess === "anonymous"
            ? "Inicia sesión para comprar tu entrada. Los visitantes pueden consultar los detalles, pero la compra requiere una cuenta."
            : "Puedes comprar una entrada puntual para este evento. Tras el pago se desbloqueará la reserva por WhatsApp."}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {viewerAccess === "anonymous" ? (
        <div className="space-y-3">
          <Button disabled size="lg" className="w-full">
            <Lock className="mr-2 h-4 w-4" />
            Inicia sesión para comprar tu entrada
          </Button>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" asChild>
              <Link href={`/login?redirect=${encodeURIComponent(eventPath)}`}>Iniciar sesión</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/register?redirect=${encodeURIComponent(eventPath)}`}>Crear cuenta</Link>
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={handlePurchase} disabled={step === "processing"} size="lg" className="w-full">
          {step === "processing" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparando pago
            </>
          ) : (
            "Comprar entrada"
          )}
        </Button>
      )}
    </div>
  )
}
