"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getRefundRequests } from "@/app/actions/refunds"
import type { RefundRequestRow } from "@/app/actions/refunds"
import { RefundReviewDialog } from "@/components/admin/refund-review-dialog"

export const dynamic = "force-dynamic"

const REASON_LABELS: Record<string, string> = {
  economic: "Económicos",
  not_satisfied: "No satisfecho",
  personal: "Personales",
  other: "Otro",
}

export default function AdminRefundsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requests, setRequests] = useState<RefundRequestRow[]>([])
  const [statusFilter, setStatusFilter] = useState("pending")
  const [selectedRequest, setSelectedRequest] = useState<RefundRequestRow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Auth check
  useEffect(() => {
    async function checkAdmin() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push("/login?redirect=/admin/refunds")
          return
        }

        const { data: member } = await supabase
          .from("miembros")
          .select("role")
          .eq("user_uuid", user.id)
          .single()

        if (member?.role !== "admin") {
          router.push("/dashboard")
          return
        }

        setIsAdmin(true)
      } catch {
        router.push("/dashboard")
      } finally {
        setAuthChecking(false)
      }
    }

    checkAdmin()
  }, [router])

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await getRefundRequests(statusFilter)

    if (result.success && result.data) {
      setRequests(result.data)
    } else {
      setError(result.error || "Error al cargar las solicitudes")
    }

    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    if (isAdmin) {
      loadRequests()
    }
  }, [isAdmin, loadRequests])

  if (authChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) return null

  const pendingCount = requests.filter((r) => r.status === "pending").length

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reembolsos</h1>
          <p className="text-gray-500 mt-1">
            Gestiona las solicitudes de reembolso de los socios
          </p>
        </div>
        <Button variant="outline" onClick={loadRequests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pendientes
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Aprobadas</TabsTrigger>
          <TabsTrigger value="declined">Rechazadas</TabsTrigger>
          <TabsTrigger value="all">Todas</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No hay solicitudes de reembolso</p>
          <p className="text-sm mt-1">
            {statusFilter === "pending"
              ? "No hay solicitudes pendientes de revisión"
              : "No se encontraron solicitudes con este filtro"}
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Socio</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const date = new Date(req.created_at).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
                const amount = (req.amount_cents / 100).toFixed(2)

                return (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      setSelectedRequest(req)
                      setDialogOpen(true)
                    }}
                  >
                    <TableCell className="text-sm">{date}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{req.member_name || "—"}</p>
                        <p className="text-xs text-gray-500">{req.member_email || ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {req.plan_type || "—"}
                      {req.payment_type && (
                        <span className="text-gray-400 ml-1">({req.payment_type})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {amount} €
                    </TableCell>
                    <TableCell className="text-sm">
                      {REASON_LABELS[req.reason] || req.reason}
                    </TableCell>
                    <TableCell>
                      {req.status === "pending" && (
                        <Badge className="bg-amber-500">Pendiente</Badge>
                      )}
                      {req.status === "approved" && (
                        <Badge className="bg-green-500">Aprobada</Badge>
                      )}
                      {req.status === "declined" && (
                        <Badge variant="outline" className="text-red-500 border-red-300">
                          Rechazada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedRequest(req)
                          setDialogOpen(true)
                        }}
                      >
                        {req.status === "pending" ? "Revisar" : "Ver"}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review dialog */}
      {selectedRequest && (
        <RefundReviewDialog
          request={selectedRequest}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onActionComplete={loadRequests}
        />
      )}
    </div>
  )
}
