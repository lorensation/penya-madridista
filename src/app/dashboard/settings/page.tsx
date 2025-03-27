"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

// Define interfaces for our data types
interface User {
  id: string
  email: string
  user_metadata?: {
    name?: string
  }
}

/*interface ProfileData {
  id: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  email_notifications?: boolean
  marketing_emails?: boolean
}*/

interface FormData {
  name: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  emailNotifications: boolean
  marketingEmails: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    emailNotifications: true,
    marketingEmails: true,
  })

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()

        if (!userData.user) {
          router.push("/login")
          return
        }

        setUser(userData.user as User)

        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("miembros")
          .select("*")
          .eq("id", userData.user.id)
          .single()

        if (profileError) throw profileError

        // Initialize form data
        setFormData({
          name: userData.user.user_metadata?.name || "",
          email: userData.user.email || "",
          phone: profileData?.phone || "",
          address: profileData?.address || "",
          city: profileData?.city || "",
          postalCode: profileData?.postal_code || "",
          emailNotifications: profileData?.email_notifications !== false,
          marketingEmails: profileData?.marketing_emails !== false,
        })

        setLoading(false)
      } catch (error: unknown) {
        console.error("Error fetching user data:", error)
        setError(error instanceof Error ? error.message : "Failed to load user data")
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!user) {
        throw new Error("User not found")
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
        },
      })

      if (updateError) throw updateError

      // Update profile
      const { error: profileError } = await supabase
        .from("miembros")
        .update({
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (profileError) throw profileError

      setSuccess("Perfil actualizado correctamente")
    } catch (error: unknown) {
      console.error("Error updating profile:", error)
      setError(error instanceof Error ? error.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitPreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!user) {
        throw new Error("User not found")
      }

      // Update preferences
      const { error: preferencesError } = await supabase
        .from("miembros")
        .update({
          email_notifications: formData.emailNotifications,
          marketing_emails: formData.marketingEmails,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (preferencesError) throw preferencesError

      setSuccess("Preferencias actualizadas correctamente")
    } catch (error: unknown) {
      console.error("Error updating preferences:", error)
      setError(error instanceof Error ? error.message : "Failed to update preferences")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Configuración</h1>
        <p className="text-gray-600">Gestiona tu perfil y preferencias</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Actualiza tu información personal y datos de contacto</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" name="email" type="email" value={formData.email} disabled />
                    <p className="text-xs text-gray-500">
                      Para cambiar tu correo electrónico, contacta con el administrador
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Código Postal</Label>
                    <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} />
                  </div>
                </div>
                <Button type="submit" className="bg-primary hover:bg-secondary" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Comunicación</CardTitle>
              <CardDescription>Gestiona cómo quieres recibir comunicaciones de la Peña Lorenzo Sanz</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPreferences} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Notificaciones por correo</Label>
                      <p className="text-sm text-gray-500">
                        Recibe notificaciones sobre eventos, actualizaciones de membresía y más
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={formData.emailNotifications}
                      onCheckedChange={(checked) => handleSwitchChange("emailNotifications", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketingEmails">Correos promocionales</Label>
                      <p className="text-sm text-gray-500">Recibe ofertas especiales, promociones y novedades</p>
                    </div>
                    <Switch
                      id="marketingEmails"
                      checked={formData.marketingEmails}
                      onCheckedChange={(checked) => handleSwitchChange("marketingEmails", checked)}
                    />
                  </div>
                </div>
                <Button type="submit" className="bg-primary hover:bg-secondary" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Preferencias"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Seguridad de la Cuenta</CardTitle>
              <CardDescription>Gestiona la seguridad de tu cuenta y cambia tu contraseña</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Cambiar Contraseña</h3>
                  <p className="text-sm text-gray-500">
                    Para cambiar tu contraseña, haz clic en el botón de abajo y te enviaremos un correo electrónico con
                    instrucciones.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={async () => {
                      try {
                        if (!user?.email) {
                          throw new Error("Email not found")
                        }
                        
                        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        })

                        if (error) throw error

                        setSuccess("Se ha enviado un correo electrónico con instrucciones para cambiar tu contraseña")
                      } catch (error: unknown) {
                        setError(error instanceof Error ? error.message : "Failed to send password reset email")
                      }
                    }}
                  >
                    Enviar Correo de Recuperación
                  </Button>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <h3 className="text-lg font-medium">Sesiones Activas</h3>
                  <p className="text-sm text-gray-500">Cierra todas las sesiones activas en otros dispositivos.</p>
                  <Button
                    variant="outline"
                    className="mt-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.signOut({ scope: "others" })

                        if (error) throw error

                        setSuccess("Se han cerrado todas las demás sesiones activas")
                      } catch (error: unknown) {
                        setError(error instanceof Error ? error.message : "Failed to sign out other sessions")
                      }
                    }}
                  >
                    Cerrar Otras Sesiones
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}