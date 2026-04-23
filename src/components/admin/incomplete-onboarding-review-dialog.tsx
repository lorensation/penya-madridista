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
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  resolveIncompleteOnboardingReview,
  type IncompleteOnboardingReviewRow,
} from "@/app/actions/refunds"

interface IncompleteOnboardingReviewDialogProps {
  review: IncompleteOnboardingReviewRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—"
  }

  return new Date(value).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function IncompleteOnboardingReviewDialog({
  review,
  open,
  onOpenChange,
  onActionComplete,
}: IncompleteOnboardingReviewDialogProps) {
  const [action, setAction] = useState<"resolved_completed" | "refunded_manually" | "dismissed" | null>(null)
  const [adminNotes, setAdminNotes] = useState(review.admin_notes || "")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetState() {
    setAction(null)
    setAdminNotes(review.admin_notes || "")
    setError(null)
  }

  async function submit() {
    if (!action) {
      return
    }

    setIsProcessing(true)
    setError(null)

    const result = await resolveIncompleteOnboardingReview({
      transactionId: review.id,
      action,
      adminNotes: adminNotes || undefined,
    })

    if (result.success) {
      onActionComplete()
      onOpenChange(false)
      resetState()
    } else {
      setError(result.error || "No se pudo completar la accion")
    }

    setIsProcessing(false)
  }

  const amountFormatted = (review.amount_cents / 100).toFixed(2)
  const isPending = review.refund_review_status === "pending_review"

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen)
        if (!isOpen) {
          resetState()
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Pago completado con onboarding incompleto</DialogTitle>
          <DialogDescription>
            Seguimiento de {review.member_name || review.member_email || "usuario desconocido"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Socio</span>
              <p className="font-medium">{review.member_name || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="font-medium">{review.member_email || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Plan</span>
              <p className="font-medium">
                {review.plan_type || "—"}
                {review.payment_type ? ` (${review.payment_type})` : ""}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Importe</span>
              <p className="font-medium">{amountFormatted} €</p>
            </div>
            <div>
              <span className="text-gray-500">Pedido Redsys</span>
              <p className="font-mono text-xs font-medium">{review.redsys_order}</p>
            </div>
            <div>
              <span className="text-gray-500">Estado actual</span>
              <p>
                <Badge className={isPending ? "bg-amber-500" : "bg-slate-700"}>
                  {review.refund_review_status}
                </Badge>
              </p>
            </div>
            <div>
              <span className="text-gray-500">Pago autorizado</span>
              <p className="font-medium">{formatDateTime(review.authorized_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Limite de gracia</span>
              <p className="font-medium">{formatDateTime(review.grace_expires_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Primer recordatorio</span>
              <p className="font-medium">{formatDateTime(review.first_reminder_sent_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Ultimo recordatorio</span>
              <p className="font-medium">{formatDateTime(review.final_reminder_sent_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Perfil completado</span>
              <p className="font-medium">{formatDateTime(review.profile_completed_at)}</p>
            </div>
            <div>
              <span className="text-gray-500">Suscripcion</span>
              <p className="font-medium">{review.subscription_status || "—"}</p>
            </div>
          </div>

          {review.admin_notes && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="mb-1 text-sm text-blue-700">Notas internas previas</p>
              <p className="text-sm">{review.admin_notes}</p>
            </div>
          )}

          {isPending && !action && (
            <div className="flex flex-col gap-3 pt-2 md:flex-row">
              <Button
                onClick={() => setAction("resolved_completed")}
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
              >
                Marcar como completado
              </Button>
              <Button
                onClick={() => setAction("refunded_manually")}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                Registrar reembolso manual
              </Button>
              <Button
                onClick={() => setAction("dismissed")}
                variant="outline"
                className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Descartar
              </Button>
            </div>
          )}

          {action && (
            <div className="space-y-3 rounded-md border p-4">
              <p className="text-sm font-medium">
                {action === "resolved_completed" &&
                  "Se intentara finalizar la membresia y cerrar esta revision como resuelta."}
                {action === "refunded_manually" &&
                  "Usa esta opcion solo si el reembolso ya se ha gestionado manualmente fuera del sistema."}
                {action === "dismissed" &&
                  "La alerta se cerrara sin marcar reembolso ni reactivar recordatorios."}
              </p>
              <div className="space-y-2">
                <Label htmlFor="admin-notes">Notas internas</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Contexto interno para esta decision..."
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {action ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setAction(null)
                  setError(null)
                }}
                disabled={isProcessing}
              >
                Volver
              </Button>
              <Button onClick={submit} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
