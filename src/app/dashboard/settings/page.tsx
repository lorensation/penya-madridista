"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import type { UserProfile } from "@/types/common"
import Link from "next/link"

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

// Define a proper interface for member data
interface MemberData {
  id?: string
  user_uuid?: string
  name?: string
  telefono?: number | null
  direccion?: string
  poblacion?: string
  cp?: number | null
  email_notifications?: boolean
  marketing_emails?: boolean
  updated_at?: string
  role?: string
  subscription_status?: string
  subscription_id?: string
  stripe_customer_id?: string
  [key: string]: unknown // For any other properties that might exist
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isMember, setIsMember] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createBrowserSupabaseClient()

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
    async function loadUserData() {
      try {
        // Get the current user from auth
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError) {
          throw userError
        }

        if (!userData?.user) {
          router.push("/login")
          return
        }

        // Convert Supabase User to UserProfile
        const userProfile: UserProfile = {
          ...userData.user,
          // Add any additional properties needed
        }

        setUser(userProfile)

        // Set basic form data from auth user
        setFormData(prevData => ({
          ...prevData,
          name: userData.user.user_metadata?.name || "",
          email: userData.user.email || "",
        }))

        // Try to get user data from the users table
        try {
          const { data: publicUserData, error: publicUserError } = await supabase
            .from("users")
            .select("*")
            .eq("id", userData.user.id)
            .single()

          if (publicUserError) {
            // If the user doesn't exist in the users table, create a basic record
            if (publicUserError.code === "PGRST116") {
              const { error: insertError } = await supabase
                .from("users")
                .insert({
                  id: userData.user.id,
                  email: userData.user.email,
                  name: userData.user.user_metadata?.name || "",
                  is_member: false
                })
              
              if (insertError) {
                console.error("Error creating user record:", insertError)
              }
              
              setIsMember(false)
            } else {
              console.error("Error fetching user data:", publicUserError)
            }
          } else {
            // Update form with user data
            setFormData(prevData => ({
              ...prevData,
              name: userData.user.user_metadata?.name || publicUserData.name || "",
            }))
            
            setIsMember(publicUserData.is_member || false)
            
            // If the user is a member, try to get member data
            if (publicUserData.is_member) {
              await loadMemberData(userData.user.id)
            }
          }
        } catch (userDataError) {
          console.error("Error in user data fetch:", userDataError)
          // Not throwing here, we'll just use the basic auth user data
        }
      } catch (error) {
        console.error("Error in loadUserData:", error)
        setError("No se pudo cargar la información del usuario. Por favor, inténtalo de nuevo más tarde.")
      } finally {
        setLoading(false)
      }
    }

    async function loadMemberData(userId: string) {
      try {
        // Try to get member data using user_uuid
        const { data: memberData, error: memberError } = await supabase
          .from("miembros")
          .select("*")
          .eq("user_uuid", userId)
          .single()

        if (memberError) {
          // Try with id instead
          const { data: memberDataById, error: memberErrorById } = await supabase
            .from("miembros")
            .select("*")
            .eq("id", userId)
            .single()
            
          if (memberErrorById) {
            console.error("Error fetching member data:", memberErrorById)
            // Not throwing here, we'll just use the basic user data
          } else if (memberDataById) {
            updateFormWithMemberData(memberDataById)
          }
        } else if (memberData) {
          updateFormWithMemberData(memberData)
        }
      } catch (memberError) {
        console.error("Error in member data fetch:", memberError)
        // Not throwing here, we'll just use the basic user data
      }
    }

    function updateFormWithMemberData(memberData: MemberData) {
      setFormData(prevData => ({
        ...prevData,
        name: prevData.name || memberData.name || "",
        phone: memberData.telefono?.toString() || "",
        address: memberData.direccion || "",
        city: memberData.poblacion || "",
        postalCode: memberData.cp?.toString() || "",
        emailNotifications: memberData.email_notifications !== false,
        marketingEmails: memberData.marketing_emails !== false,
      }))
    }

    loadUserData()
  }, [router, supabase])

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
        throw new Error("Usuario no encontrado")
      }

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          name: formData.name,
        },
      })

      if (updateError) throw updateError

      // Update user in the users table
      try {
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({
            name: formData.name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)

        if (userUpdateError) {
          console.error("Error updating user table:", userUpdateError)
        }
      } catch (userUpdateError) {
        console.error("Error in user update:", userUpdateError)
        // Continue even if this fails
      }

      // If the user is a member, update the miembros table too
      if (isMember) {
        try {
          // Try to update using user_uuid
          const { error: profileError } = await supabase
            .from("miembros")
            .update({
              name: formData.name,
              telefono: formData.phone ? Number.parseInt(formData.phone, 10) : null,
              direccion: formData.address,
              poblacion: formData.city,
              cp: formData.postalCode ? Number.parseInt(formData.postalCode, 10) : null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_uuid", user.id)

          if (profileError) {
            // Try with id instead
            const { error: profileErrorById } = await supabase
              .from("miembros")
              .update({
                name: formData.name,
                telefono: formData.phone ? Number.parseInt(formData.phone, 10) : null,
                direccion: formData.address,
                poblacion: formData.city,
                cp: formData.postalCode ? Number.parseInt(formData.postalCode, 10) : null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id)

            if (profileErrorById) {
              console.error("Error updating member profile by ID:", profileErrorById)
            }
          }
        } catch (memberError) {
          console.error("Error updating member profile:", memberError)
          // Not throwing here, we'll consider it a success if the auth user was updated
        }
      }

      setSuccess("Perfil actualizado correctamente")
    } catch (error: unknown) {
      console.error("Error updating profile:", error)
      setError(error instanceof Error ? error.message : "No se pudo actualizar el perfil")
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
        throw new Error("Usuario no encontrado")
      }

      if (!isMember) {
        throw new Error("Solo los miembros pueden actualizar preferencias de comunicación")
      }

      // Try to update using user_uuid
      const { error: preferencesError } = await supabase
        .from("miembros")
        .update({
          email_notifications: formData.emailNotifications,
          marketing_emails: formData.marketingEmails,
          updated_at: new Date().toISOString(),
        })
        .eq("user_uuid", user.id)

      if (preferencesError) {
        // Try with id instead
        const { error: preferencesErrorById } = await supabase
          .from("miembros")
          .update({
            email_notifications: formData.emailNotifications,
            marketing_emails: formData.marketingEmails,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)

        if (preferencesErrorById) throw preferencesErrorById
      }

      setSuccess("Preferencias actualizadas correctamente")
    } catch (error: unknown) {
      console.error("Error updating preferences:", error)
      setError(error instanceof Error ? error.message : "No se pudieron actualizar las preferencias")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-gray-500">Gestiona tu perfil y preferencias</p>
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

      {!isMember && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            Algunas opciones de configuración solo están disponibles para miembros. 
            <Link href="/membership" className="ml-2 font-medium underline">
              Hazte miembro ahora
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="preferencias" disabled={!isMember}>Preferencias</TabsTrigger>
          <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-4">
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
                    <Input id="email" name="email" type="email" value={formData.email} disabled className="bg-gray-100" />
                    <p className="text-xs text-gray-500">
                      Para cambiar tu correo electrónico, contacta con el administrador
                    </p>
                  </div>
                  
                  {isMember ? (
                    <>
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
                    </>
                  ) : (
                    <div className="col-span-2">
                      <Alert className="bg-gray-50">
                        <AlertDescription>
                          Los campos adicionales de perfil están disponibles para miembros.
                          <Link href="/membership" className="ml-2 font-medium underline">
                            Hazte miembro ahora
                          </Link>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
                <Button type="submit" className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferencias">
          {isMember ? (
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
                  <Button type="submit" className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black" disabled={saving}>
                    {saving ? "Guardando..." : "Guardar Preferencias"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Preferencias de Comunicación</CardTitle>
                <CardDescription>Esta sección está disponible solo para miembros</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="bg-gray-50">
                  <AlertDescription>
                    Para gestionar tus preferencias de comunicación, necesitas ser miembro.
                    <Link href="/membership" className="ml-2 font-medium underline">
                      Hazte miembro ahora
                    </Link>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="seguridad">
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
                    className="mt-2 transition-all bg-black text-white hover:bg-white hover:text-primary hover:border hover:border-black"
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
                        setError(error instanceof Error ? error.message : "No se pudo enviar el correo de recuperación")
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
                    className="mt-2 border-red-200 text-red-600 hover:bg-red-600 hover:text-white"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.signOut({ scope: "others" })

                        if (error) throw error

                        setSuccess("Se han cerrado todas las demás sesiones activas")
                      } catch (error: unknown) {
                        setError(error instanceof Error ? error.message : "No se pudieron cerrar las otras sesiones")
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