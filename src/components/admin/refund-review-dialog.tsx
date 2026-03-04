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
import { approveRefund, declineRefund } from "@/app/actions/refunds"
import type { RefundRequestRow } from "@/app/actions/refunds"

const REASON_LABELS: Record<string, string> = {
  economic: "Motivos económicos",
  not_satisfied: "No satisfecho con el servicio",
  personal: "Motivos personales",
  other: "Otro",
}

interface RefundReviewDialogProps {
  request: RefundRequestRow
  open: boolean
  onOpenChange: (open: boolean) => void
  onActionComplete: () => void
}

export function RefundReviewDialog({
  request,
  open,
  onOpenChange,
  onActionComplete,
}: RefundReviewDialogProps) {
  const [action, setAction] = useState<"approve" | "decline" | null>(null)
  const [responseMessage, setResponseMessage] = useState("")
  const [adminNotes, setAdminNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountFormatted = (request.amount_cents / 100).toFixed(2)

  async function handleApprove() {
    setIsProcessing(true)
    setError(null)

    const result = await approveRefund({
      requestId: request.id,
      adminNotes: adminNotes || undefined,
    })

    if (result.success) {
      onActionComplete()
      onOpenChange(false)
      resetState()
    } else {
      setError(result.error || "Error al aprobar el reembolso")
    }

    setIsProcessing(false)
  }

  async function handleDecline() {
    if (responseMessage.trim().length < 10) {
      setError("La respuesta al socio debe tener al menos 10 caracteres")
      return
    }

    setIsProcessing(true)
    setError(null)

    const result = await declineRefund({
      requestId: request.id,
      responseMessage,
    })

    if (result.success) {
      onActionComplete()
      onOpenChange(false)
      resetState()
    } else {
      setError(result.error || "Error al rechazar la solicitud")
    }

    setIsProcessing(false)
  }

  function resetState() {
    setAction(null)
    setResponseMessage("")
    setAdminNotes("")
    setError(null)
  }

  const requestDate = new Date(request.created_at).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  const isPending = request.status === "pending"

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen)
        if (!isOpen) resetState()
      }}
    >
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitud de reembolso</DialogTitle>
          <DialogDescription>
            Solicitud de {request.member_name || request.member_email || "Socio desconocido"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Request info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Socio</span>
              <p className="font-medium">{request.member_name || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Email</span>
              <p className="font-medium">{request.member_email || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Plan</span>
              <p className="font-medium">{request.plan_type || "—"} ({request.payment_type || "—"})</p>
            </div>
            <div>
              <span className="text-gray-500">Importe</span>
              <p className="font-medium">{amountFormatted} €</p>
            </div>
            <div>
              <span className="text-gray-500">Tarjeta</span>
              <p className="font-medium">{request.last_four ? `···· ${request.last_four}` : "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Pedido Redsys</span>
              <p className="font-medium font-mono text-xs">{request.redsys_order || "—"}</p>
            </div>
            <div>
              <span className="text-gray-500">Fecha solicitud</span>
              <p className="font-medium">{requestDate}</p>
            </div>
            <div>
              <span className="text-gray-500">Estado</span>
              <p>
                {request.status === "pending" && <Badge className="bg-amber-500">Pendiente</Badge>}
                {request.status === "approved" && <Badge className="bg-green-500">Aprobada</Badge>}
                {request.status === "declined" && <Badge variant="outline" className="text-red-500 border-red-300">Rechazada</Badge>}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="rounded-md bg-gray-50 border p-3">
            <p className="text-sm text-gray-500 mb-1">Motivo</p>
            <p className="font-medium text-sm">{REASON_LABELS[request.reason] || request.reason}</p>
          </div>

          {/* Details */}
          <div className="rounded-md bg-gray-50 border p-3">
            <p className="text-sm text-gray-500 mb-1">Detalles del socio</p>
            <p className="text-sm whitespace-pre-wrap">{request.details}</p>
          </div>

          {/* Previous admin response (if already reviewed) */}
          {request.admin_response && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
              <p className="text-sm text-blue-600 mb-1">Respuesta al socio</p>
              <p className="text-sm">{request.admin_response}</p>
            </div>
          )}

          {request.admin_notes && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-700 mb-1">Notas internas</p>
              <p className="text-sm">{request.admin_notes}</p>
            </div>
          )}

          {/* Action section — only for pending requests */}
          {isPending && !action && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setAction("approve")}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Aprobar reembolso
              </Button>
              <Button
                onClick={() => setAction("decline")}
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              >
                Rechazar solicitud
              </Button>
            </div>
          )}

          {/* Approve confirmation */}
          {action === "approve" && (
            <div className="space-y-3 rounded-md border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">
                ¿Confirmas el reembolso de {amountFormatted} € a través de Redsys?
              </p>
              <p className="text-xs text-green-700">
                Se procesará la devolución, se cancelará la suscripción y se revocará el acceso de socio.
              </p>
              <div className="space-y-2">
                <Label htmlFor="admin-notes" className="text-sm text-green-800">Notas internas (opcional)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Notas internas sobre esta aprobación..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Decline form */}
          {action === "decline" && (
            <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                Escribe la respuesta que se enviará al socio por email:
              </p>
              <div className="space-y-2">
                <Label htmlFor="decline-response" className="text-sm text-red-800">Respuesta al socio</Label>
                <Textarea
                  id="decline-response"
                  placeholder="Explica el motivo del rechazo (mínimo 10 caracteres)..."
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  rows={3}
                />
                {responseMessage.length > 0 && responseMessage.trim().length < 10 && (
                  <p className="text-xs text-red-500">Mínimo 10 caracteres ({responseMessage.trim().length}/10)</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
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
              {action === "approve" && (
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                    </>
                  ) : (
                    "Confirmar reembolso"
                  )}
                </Button>
              )}
              {action === "decline" && (
                <Button
                  onClick={handleDecline}
                  disabled={isProcessing || responseMessage.trim().length < 10}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...
                    </>
                  ) : (
                    "Enviar rechazo"
                  )}
                </Button>
              )}
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
