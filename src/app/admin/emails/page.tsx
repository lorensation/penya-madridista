"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, AlertTriangle, Mail, Send, CheckCircle, Clock, XCircle } from "lucide-react"
import {
  createMarketingCampaign,
  createAcquisitionCampaignDraft,
  sendCampaign,
  sendTestCampaign,
  getCampaigns,
} from "@/app/actions/admin-email-campaigns"

export const dynamic = "force-dynamic"

interface Campaign {
  id: string
  kind: string
  status: string
  subject: string
  preview_text: string | null
  html_body: string
  text_body: string | null
  segment: string
  recipient_count: number
  sent_count: number
  failed_count: number
  created_at: string
  sent_at: string | null
}

const SEGMENT_LABELS: Record<string, string> = {
  all_opted_in: "Todos los suscritos",
  members_opted_in: "Solo miembros suscritos",
  newsletter_only: "Solo newsletter",
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "draft":
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Borrador</Badge>
    case "sending":
      return <Badge variant="secondary"><Mail className="h-3 w-3 mr-1" />Enviando</Badge>
    case "sent":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />Enviada</Badge>
    case "failed":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Fallida</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function AdminEmailsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Create campaign dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [previewText, setPreviewText] = useState("")
  const [htmlBody, setHtmlBody] = useState("")
  const [textBody, setTextBody] = useState("")
  const [segment, setSegment] = useState("all_opted_in")
  const [creating, setCreating] = useState(false)
  const [creatingPreset, setCreatingPreset] = useState(false)

  // Send dialog
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [testEmail, setTestEmail] = useState("")
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null)

  // Check admin
  useEffect(() => {
    async function check() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) { router.push("/login?redirect=/admin/emails"); return }

        const { data: profile } = await supabase
          .from("miembros")
          .select("role")
          .eq("user_uuid", user.id)
          .single()

        if (profile?.role !== "admin") { router.push("/dashboard"); return }
        setIsAdmin(true)
        setAuthChecking(false)
      } catch {
        router.push("/dashboard")
      }
    }
    check()
  }, [router])

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!isAdmin || authChecking) return
    try {
      setLoading(true)
      const data = await getCampaigns("marketing")
      setCampaigns(data as Campaign[])
      setError(null)
    } catch {
      setError("Error al cargar las campañas")
    } finally {
      setLoading(false)
    }
  }, [isAdmin, authChecking])

  useEffect(() => {
    if (isAdmin && !authChecking) fetchCampaigns()
  }, [fetchCampaigns, isAdmin, authChecking])

  const handleCreate = async () => {
    if (!subject || !htmlBody) return
    setCreating(true)
    setError(null)
    setNotice(null)

    try {
      const result = await createMarketingCampaign({
        subject,
        previewText: previewText || undefined,
        htmlBody,
        textBody: textBody || undefined,
        segment,
      })

      if (result.success) {
        setCreateOpen(false)
        setSubject("")
        setPreviewText("")
        setHtmlBody("")
        setTextBody("")
        setSegment("all_opted_in")
        fetchCampaigns()
      } else {
        setError(result.error || "Error al crear la campaña")
      }
    } catch {
      setError("Error al crear la campaña")
    } finally {
      setCreating(false)
    }
  }

  const handleCreateAcquisitionDraft = async () => {
    setCreatingPreset(true)
    setError(null)
    setNotice(null)

    try {
      const result = await createAcquisitionCampaignDraft()

      if (result.success) {
        setNotice("Se ha creado un borrador de campaña de captación listo para revisar y enviar.")
        fetchCampaigns()
      } else {
        setError(result.error || "Error al crear la campaña predefinida")
      }
    } catch {
      setError("Error al crear la campaña predefinida")
    } finally {
      setCreatingPreset(false)
    }
  }

  const handleOpenSendDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setTestEmail("")
    setSendResult(null)
    setSendDialogOpen(true)
  }

  const handleTestSend = async () => {
    if (!selectedCampaign || !testEmail) return
    setSending(true)
    try {
      const result = await sendTestCampaign(selectedCampaign.id, testEmail)
      if (result.success) {
        setSendResult({ sent: 1, failed: 0, skipped: 0 })
      } else {
        setError(result.error || "Error al enviar la prueba")
      }
    } catch {
      setError("Error al enviar la prueba")
    } finally {
      setSending(false)
    }
  }

  const handleFullSend = async () => {
    if (!selectedCampaign) return
    setSending(true)
    setSendResult(null)
    try {
      const result = await sendCampaign(selectedCampaign.id)
      if (result.success) {
        setSendResult({ sent: result.sent, failed: result.failed, skipped: result.skipped })
        fetchCampaigns()
      } else {
        setError(result.error || "Error al enviar la campaña")
      }
    } catch {
      setError("Error al enviar la campaña")
    } finally {
      setSending(false)
    }
  }

  const formatDate = (d: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (authChecking) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-gray-600">Verificando permisos de administrador...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Campañas de Email Marketing</h1>
          <p className="text-gray-600">Crea y envía campañas de marketing a tus suscriptores</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleCreateAcquisitionDraft}
            disabled={creatingPreset}
            className="flex items-center gap-2"
          >
            {creatingPreset ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Campaña de Captación
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Campaña
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {notice && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-700" />
          <AlertDescription className="text-green-700">{notice}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-gray-600">Cargando campañas...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No hay campañas</h3>
          <p className="text-gray-600 mb-8">Crea tu primera campaña de email marketing.</p>
          <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Campaña
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Historial de campañas</CardTitle>
            <CardDescription>{campaigns.length} campaña(s) en total</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Enviados</TableHead>
                  <TableHead className="text-right">Fallidos</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead>Enviada</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{c.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {SEGMENT_LABELS[c.segment] || c.segment}
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right">{c.sent_count}</TableCell>
                    <TableCell className="text-right">{c.failed_count}</TableCell>
                    <TableCell className="text-sm">{formatDate(c.created_at)}</TableCell>
                    <TableCell className="text-sm">{formatDate(c.sent_at)}</TableCell>
                    <TableCell>
                      {c.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => handleOpenSendDialog(c)}>
                          <Send className="h-3 w-3 mr-1" />
                          Enviar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Campaña de Marketing</DialogTitle>
            <DialogDescription>Crea una nueva campaña de email para enviar a tus suscriptores.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto *</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Asunto del email" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previewText">Texto de vista previa</Label>
              <Input id="previewText" value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Se muestra en la bandeja antes de abrir" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="segment">Segmento de destinatarios</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_opted_in">Todos los suscritos (usuarios + newsletter)</SelectItem>
                  <SelectItem value="members_opted_in">Solo miembros suscritos</SelectItem>
                  <SelectItem value="newsletter_only">Solo suscriptores de newsletter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="htmlBody">Contenido HTML *</Label>
              <Textarea
                id="htmlBody"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                placeholder="<h2>Tu contenido aquí</h2><p>Escribe el contenido del email en HTML...</p>"
                rows={8}
                className="font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground">
                El contenido se insertará dentro de la plantilla con cabecera, pie legal y enlaces de gestión de suscripción.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="textBody">Contenido en texto plano (opcional)</Label>
              <Textarea
                id="textBody"
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
                placeholder="Versión en texto plano del email..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating || !subject || !htmlBody} className="ml-2">
              {creating ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Creando...
                </>
              ) : (
                "Crear Campaña"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Campaign Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={(open) => { setSendDialogOpen(open); if (!open) setSendResult(null) }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Campaña
            </DialogTitle>
            <DialogDescription>
              {selectedCampaign && (
                <>Campaña: &quot;{selectedCampaign.subject}&quot; — Segmento: {SEGMENT_LABELS[selectedCampaign.segment] || selectedCampaign.segment}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {sendResult && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Enviados: {sendResult.sent} | Fallidos: {sendResult.failed} | Omitidos: {sendResult.skipped}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="testEmailAddr">Enviar prueba a:</Label>
              <div className="flex gap-2">
                <Input
                  id="testEmailAddr"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1"
                />
                <Button variant="outline" onClick={handleTestSend} disabled={sending || !testEmail} size="sm">
                  {sending ? <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" /> : "Probar"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={handleFullSend} disabled={sending} className="ml-2">
              {sending ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar campaña completa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
