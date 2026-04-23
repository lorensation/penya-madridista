"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
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
import { supabase } from "@/lib/supabase"
import {
  getIncompleteOnboardingReviews,
  getRefundRequests,
  type IncompleteOnboardingReviewRow,
  type RefundRequestRow,
} from "@/app/actions/refunds"
import { RefundReviewDialog } from "@/components/admin/refund-review-dialog"
import { IncompleteOnboardingReviewDialog } from "@/components/admin/incomplete-onboarding-review-dialog"

export const dynamic = "force-dynamic"

const REASON_LABELS: Record<string, string> = {
  economic: "Economicos",
  not_satisfied: "No satisfecho",
  personal: "Personales",
  other: "Otro",
}

const ONBOARDING_STATUS_LABELS: Record<string, string> = {
  pending_review: "Pendiente",
  resolved_completed: "Resuelto",
  refunded_manually: "Reembolsado manualmente",
  dismissed: "Descartado",
}

export default function AdminRefundsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [queue, setQueue] = useState<"refunds" | "onboarding">("refunds")

  const [refundRequests, setRefundRequests] = useState<RefundRequestRow[]>([])
  const [refundStatusFilter, setRefundStatusFilter] = useState("pending")
  const [selectedRefundRequest, setSelectedRefundRequest] = useState<RefundRequestRow | null>(null)

  const [onboardingReviews, setOnboardingReviews] = useState<IncompleteOnboardingReviewRow[]>([])
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState("pending_review")
  const [selectedOnboardingReview, setSelectedOnboardingReview] =
    useState<IncompleteOnboardingReviewRow | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)

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

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [refundsResult, onboardingResult] = await Promise.all([
      getRefundRequests(refundStatusFilter),
      getIncompleteOnboardingReviews(onboardingStatusFilter),
    ])

    if (refundsResult.success && refundsResult.data) {
      setRefundRequests(refundsResult.data)
    } else {
      setError(refundsResult.error || "Error al cargar las solicitudes de reembolso")
    }

    if (onboardingResult.success && onboardingResult.data) {
      setOnboardingReviews(onboardingResult.data)
    } else {
      setError((previous) => previous || onboardingResult.error || "Error al cargar la cola de onboarding")
    }

    setLoading(false)
  }, [onboardingStatusFilter, refundStatusFilter])

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin, loadData])

  if (authChecking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const pendingRefundCount = refundRequests.filter((request) => request.status === "pending").length
  const pendingOnboardingCount = onboardingReviews.filter(
    (review) => review.refund_review_status === "pending_review",
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Reembolsos y onboarding</h1>
          <p className="mt-1 text-gray-500">
            Gestiona solicitudes de reembolso y pagos confirmados con perfil incompleto.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={queue} onValueChange={(value) => setQueue(value as "refunds" | "onboarding")}>
        <TabsList>
          <TabsTrigger value="refunds" className="relative">
            Reembolsos
            {pendingRefundCount > 0 && (
              <Badge className="ml-2 min-w-[20px] bg-red-500 px-1.5 py-0.5 text-xs text-white">
                {pendingRefundCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="relative">
            Onboarding incompleto
            {pendingOnboardingCount > 0 && (
              <Badge className="ml-2 min-w-[20px] bg-amber-500 px-1.5 py-0.5 text-xs text-white">
                {pendingOnboardingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {queue === "refunds" && (
        <>
          <Tabs value={refundStatusFilter} onValueChange={setRefundStatusFilter}>
            <TabsList>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="approved">Aprobadas</TabsTrigger>
              <TabsTrigger value="declined">Rechazadas</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : refundRequests.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="text-lg">No hay solicitudes de reembolso</p>
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
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refundRequests.map((request) => {
                    const date = new Date(request.created_at).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })

                    return (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setSelectedRefundRequest(request)
                          setDialogOpen(true)
                        }}
                      >
                        <TableCell className="text-sm">{date}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{request.member_name || "—"}</p>
                            <p className="text-xs text-gray-500">{request.member_email || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {request.plan_type || "—"}
                          {request.payment_type && (
                            <span className="ml-1 text-gray-400">({request.payment_type})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {(request.amount_cents / 100).toFixed(2)} €
                        </TableCell>
                        <TableCell className="text-sm">
                          {REASON_LABELS[request.reason] || request.reason}
                        </TableCell>
                        <TableCell>
                          {request.status === "pending" && <Badge className="bg-amber-500">Pendiente</Badge>}
                          {request.status === "approved" && <Badge className="bg-green-500">Aprobada</Badge>}
                          {request.status === "declined" && (
                            <Badge variant="outline" className="border-red-300 text-red-500">
                              Rechazada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedRefundRequest(request)
                              setDialogOpen(true)
                            }}
                          >
                            {request.status === "pending" ? "Revisar" : "Ver"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {queue === "onboarding" && (
        <>
          <Tabs value={onboardingStatusFilter} onValueChange={setOnboardingStatusFilter}>
            <TabsList>
              <TabsTrigger value="pending_review">Pendientes</TabsTrigger>
              <TabsTrigger value="resolved_completed">Completados</TabsTrigger>
              <TabsTrigger value="refunded_manually">Reembolsados</TabsTrigger>
              <TabsTrigger value="dismissed">Descartados</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : onboardingReviews.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p className="text-lg">No hay casos de onboarding incompleto</p>
            </div>
          ) : (
            <div className="rounded-md border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Autorizado</TableHead>
                    <TableHead>Socio</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead className="text-right">Accion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onboardingReviews.map((review) => (
                    <TableRow
                      key={review.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => {
                        setSelectedOnboardingReview(review)
                        setDialogOpen(true)
                      }}
                    >
                      <TableCell className="text-sm">
                        {review.authorized_at
                          ? new Date(review.authorized_at).toLocaleDateString("es-ES")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{review.member_name || "—"}</p>
                          <p className="text-xs text-gray-500">{review.member_email || ""}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {review.plan_type || "—"}
                        {review.payment_type && (
                          <span className="ml-1 text-gray-400">({review.payment_type})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {(review.amount_cents / 100).toFixed(2)} €
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            review.refund_review_status === "pending_review"
                              ? "bg-amber-500"
                              : review.refund_review_status === "resolved_completed"
                                ? "bg-green-600"
                                : "bg-slate-700"
                          }
                        >
                          {ONBOARDING_STATUS_LABELS[review.refund_review_status] ||
                            review.refund_review_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {review.grace_expires_at
                          ? new Date(review.grace_expires_at).toLocaleDateString("es-ES")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedOnboardingReview(review)
                            setDialogOpen(true)
                          }}
                        >
                          {review.refund_review_status === "pending_review" ? "Revisar" : "Ver"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {selectedRefundRequest && queue === "refunds" && (
        <RefundReviewDialog
          request={selectedRefundRequest}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onActionComplete={loadData}
        />
      )}

      {selectedOnboardingReview && queue === "onboarding" && (
        <IncompleteOnboardingReviewDialog
          review={selectedOnboardingReview}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onActionComplete={loadData}
        />
      )}
    </div>
  )
}
