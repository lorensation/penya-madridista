"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { requestRefund } from "@/app/actions/refunds"

interface RefundRequestDialogProps {
  /** Controls whether the trigger button is disabled */
  disabled?: boolean
  /** Callback after successful submission */
  onSuccess?: () => void
}

const REASON_OPTIONS = [
  { value: "economic", label: "Motivos económicos" },
  { value: "not_satisfied", label: "No estoy satisfecho con el servicio" },
  { value: "personal", label: "Motivos personales" },
  { value: "other", label: "Otro" },
]

export function RefundRequestDialog({ disabled, onSuccess }: RefundRequestDialogProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [details, setDetails] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const canSubmit = reason && details.trim().length >= 20 && confirmed && !isSubmitting

  async function handleSubmit() {
    if (!canSubmit) return

    setIsSubmitting(true)
    setError(null)

    const result = await requestRefund({ reason, details })

    if (result.success) {
      setSuccess(true)
      onSuccess?.()
      // Auto-close after showing success
      setTimeout(() => {
        setOpen(false)
        resetForm()
      }, 3000)
    } else {
      setError(result.error || "Error al enviar la solicitud")
    }

    setIsSubmitting(false)
  }

  function resetForm() {
    setReason("")
    setDetails("")
    setConfirmed(false)
    setError(null)
    setSuccess(false)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700" disabled={disabled}>
          Solicitar reembolso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Solicitud enviada</DialogTitle>
            </DialogHeader>
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6 text-green-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Tu solicitud de reembolso ha sido enviada correctamente. Revisaremos tu caso y te notificaremos por email.
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Solicitar reembolso</DialogTitle>
              <DialogDescription>
                Puedes solicitar el reembolso de tu última cuota hasta el día 10 del mes en curso.
                Si se aprueba, tu suscripción será cancelada.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Motivo</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="refund-reason">
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="refund-details">Detalles</Label>
                <Textarea
                  id="refund-details"
                  placeholder="Explica con detalle el motivo de tu solicitud (mínimo 20 caracteres)..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                />
                {details.length > 0 && details.trim().length < 20 && (
                  <p className="text-xs text-red-500">
                    Mínimo 20 caracteres ({details.trim().length}/20)
                  </p>
                )}
              </div>

              <div className="flex items-start space-x-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <Checkbox
                  id="refund-confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                />
                <Label htmlFor="refund-confirm" className="text-sm text-amber-800 leading-tight cursor-pointer">
                  Entiendo que si mi solicitud es aprobada, mi suscripción será cancelada y perderé el acceso a los beneficios de socio.
                </Label>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar solicitud"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
