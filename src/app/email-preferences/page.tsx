"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react"

interface Preferences {
  marketing_emails: boolean
  event_notifications: boolean
}

function EmailPreferencesContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<Preferences>({
    marketing_emails: true,
    event_notifications: true,
  })

  useEffect(() => {
    if (!token) {
      setError("Enlace no válido. Usa el enlace proporcionado en tu email.")
      setLoading(false)
      return
    }

    // Fetch current preferences
    async function fetchPreferences() {
      try {
        const res = await fetch(`/api/email-preferences?token=${encodeURIComponent(token!)}`)
        const data = await res.json()

        if (!res.ok || !data.success) {
          setError(data.error || "Enlace no válido o expirado.")
          setLoading(false)
          return
        }

        setEmail(data.email)
        setPreferences({
          marketing_emails: data.preferences.marketing_emails ?? true,
          event_notifications: data.preferences.event_notifications ?? true,
        })
      } catch {
        setError("Error al cargar las preferencias.")
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [token])

  async function handleSave() {
    if (!token) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch("/api/email-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          marketing_emails: preferences.marketing_emails,
          event_notifications: preferences.event_notifications,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || "Error al guardar las preferencias.")
        return
      }

      setSuccess("Tus preferencias han sido actualizadas correctamente.")
    } catch {
      setError("Error al guardar las preferencias.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-gray-600">Cargando preferencias...</p>
        </div>
      </div>
    )
  }

  if (error && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Enlace no válido</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="mt-4 text-sm text-gray-600">
              Si crees que esto es un error, contacta con nosotros en{" "}
              <a href="mailto:info@lorenzosanz.com" className="text-primary underline">
                info@lorenzosanz.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Preferencias de Email</CardTitle>
          <CardDescription>
            Gestiona las comunicaciones que recibes de la Peña Lorenzo Sanz.
            {email && (
              <span className="block mt-1 font-medium text-foreground">{email}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="marketing" className="text-base font-medium">
                  Emails de marketing
                </Label>
                <p className="text-sm text-muted-foreground">
                  Promociones, novedades y contenido exclusivo de la peña.
                </p>
              </div>
              <Switch
                id="marketing"
                checked={preferences.marketing_emails}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, marketing_emails: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="events" className="text-base font-medium">
                  Notificaciones de eventos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Avisos sobre eventos organizados por la peña.
                </p>
              </div>
              <Switch
                id="events"
                checked={preferences.event_notifications}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, event_notifications: checked }))
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Los emails transaccionales y relacionados con tu cuenta seguirán llegando independientemente de estas preferencias.
          </p>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar preferencias"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-gray-600">Cargando preferencias...</p>
      </div>
    </div>
  )
}

export default function EmailPreferencesPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EmailPreferencesContent />
    </Suspense>
  )
}
