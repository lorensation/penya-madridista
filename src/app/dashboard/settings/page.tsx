"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { UserProfile } from "@/types/common"
import type { Database } from "@/types/supabase"

type Member = Database["public"]["Tables"]["miembros"]["Row"]

export default function SettingsPage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    phone: "",
  })

  useEffect(() => {
    async function loadUserData() {
      try {
        // Get the current user
        const { data: userData } = await supabase.auth.getUser()

        if (!userData?.user) {
          console.error("No user found")
          return
        }

        // Convert Supabase User to UserProfile
        const userProfile: UserProfile = {
          ...userData.user,
          // Add any additional properties needed
        }

        setUser(userProfile)

        // Get the member data using user_uuid instead of auth_id
        const { data: memberData, error } = await supabase
          .from("miembros")
          .select("*")
          .eq("user_uuid", userData.user.id)
          .single()

        if (error) {
          console.error("Error fetching member data:", error)
        } else if (memberData) {
          setMember(memberData)
          setFormData({
            name: memberData.nombre || "",
            email: userData.user.email || "",
            address: memberData.direccion || "",
            phone: memberData.telefono?.toString() || "",
          })
        }
      } catch (error) {
        console.error("Error in loadUserData:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      if (!user) return

      // Update member data
      if (member) {
        const { error } = await supabase
          .from("miembros")
          .update({
            nombre: formData.name,
            direccion: formData.address,
            telefono: formData.phone ? Number.parseInt(formData.phone, 10) : null,
          })
          .eq("user_uuid", user.id)

        if (error) throw error
      }

      // Show success message
      alert("Perfil actualizado correctamente")
    } catch (error) {
      console.error("Error updating profile:", error)
      alert("Error al actualizar el perfil")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-gray-500">Gestiona tu perfil y preferencias</p>
      </div>

      <Tabs defaultValue="perfil">
        <TabsList>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
          <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>Actualiza tu información personal y datos de contacto</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" name="email" value={formData.email} disabled className="bg-gray-100" />
                    <p className="text-xs text-gray-500">
                      Para cambiar tu correo electrónico, contacta con el administrador
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferencias">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias</CardTitle>
              <CardDescription>Configura tus preferencias de notificaciones y comunicación</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Sección en desarrollo</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguridad">
          <Card>
            <CardHeader>
              <CardTitle>Seguridad</CardTitle>
              <CardDescription>Gestiona tu contraseña y opciones de seguridad</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Sección en desarrollo</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}