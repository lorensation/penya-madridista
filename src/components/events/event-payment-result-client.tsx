"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, PhoneOutgoing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { saveEventExternalAssist } from "@/app/actions/payment"

interface EventPaymentResultClientProps {
  eventId: string
  order: string
  status: "authorized" | "pending" | "denied" | "error" | "not_found"
  whatsappLink: string
  initialAssist: {
    name: string
    email: string
    phone: string
  } | null
}

export function EventPaymentResultClient({
  eventId,
  order,
  status,
  whatsappLink,
  initialAssist,
}: EventPaymentResultClientProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assist, setAssist] = useState(initialAssist)
  const [formState, setFormState] = useState({
    name: initialAssist?.name ?? "",
    email: initialAssist?.email ?? "",
    phone: initialAssist?.phone ?? "",
  })

  useEffect(() => {
    if (status !== "pending") {
      return
    }

    const intervalId = window.setInterval(() => {
      router.refresh()
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [router, status])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormState((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSaving(true)

    try {
      const result = await saveEventExternalAssist({
        eventId,
        order,
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
      })

      if (!result.success) {
        setError(result.error || "No se pudieron guardar tus datos")
        return
      }

      setAssist({
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
      })
      router.refresh()
    } finally {
      setIsSaving(false)
    }
  }

  if (status === "pending") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-gray-50 p-6 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h2 className="mt-4 text-xl font-semibold text-primary">Estamos verificando tu pago</h2>
          <p className="mt-2 text-sm text-gray-600">
            La pasarela aún no ha confirmado el resultado final. Esta página se actualizará automáticamente.
          </p>
        </div>
      </div>
    )
  }

  if (status !== "authorized") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No encontramos un pago autorizado para este evento. Si ya te han realizado el cargo, vuelve a intentarlo en unos segundos.
        </AlertDescription>
      </Alert>
    )
  }

  if (assist) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-700" />
          <AlertDescription className="text-green-900">
            Tus datos ya están guardados. Ya puedes completar la reserva del evento por WhatsApp.
          </AlertDescription>
        </Alert>
        <Button asChild size="lg" className="w-full">
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
            <PhoneOutgoing className="mr-2 h-4 w-4" />
            Reservar por WhatsApp
          </a>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50">
        <AlertDescription className="text-amber-900">
          Tu pago ya está autorizado. Completa este formulario para desbloquear el botón de reserva por WhatsApp.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-5">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" name="name" value={formState.name} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formState.email} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" type="tel" value={formState.phone} onChange={handleChange} required />
        </div>
        <Button type="submit" disabled={isSaving} size="lg" className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando datos
            </>
          ) : (
            "Guardar datos y desbloquear WhatsApp"
          )}
        </Button>
      </form>
    </div>
  )
}
