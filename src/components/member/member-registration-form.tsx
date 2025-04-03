"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { createMember } from "@/lib/supabase"
import type { MemberData } from "@/types/common"
import { supabase } from "@/lib/supabase"

// Define a type for potential errors
interface ErrorWithMessage {
  message: string
}

// Type guard to check if an error has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  )
}

// Function to extract error message from unknown error
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message
  }
  return String(error)
}

export default function MemberRegistrationForm() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  const [formData, setFormData] = useState<MemberData>({
    dni_pasaporte: "",
    name: "",
    apellido1: "",
    apellido2: "",
    telefono: "",
    email: user?.email || "",
    fecha_nacimiento: "",
    es_socio_realmadrid: false,
    num_socio: "",
    socio_carnet_madridista: false,
    num_carnet: "",
    direccion: "",
    direccion_extra: "",
    poblacion: "",
    cp: "",
    provincia: "",
    pais: "España",
    nacionalidad: "Española",
    // Set the ID fields correctly
    id: user?.id, // This links to auth.users(id)
    user_uuid: user?.id, // This links to users(id)
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Redirect if no user or session ID
  if (!user || !sessionId) {
    if (typeof window !== "undefined") {
      router.push("/hazte-socio")
    }
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    // For numeric fields, ensure we're only accepting numbers
    if (["telefono", "cp", "num_socio", "num_carnet"].includes(name) && value !== "") {
      // Only allow numeric input for these fields
      if (!/^\d*$/.test(value)) {
        return // Ignore non-numeric input
      }
    }

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  // Update the handleSubmit function to include retrieving and using Stripe data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Get the session_id from the URL
      const sessionId = searchParams.get("session_id")

      // Create member record in Supabase
      const memberDataToSave: MemberData = {
        ...formData,
        id: user.id, // This links to auth.users(id)
        user_uuid: user.id, // This links to users(id)
      }

      // If we have a session_id, get the checkout session data and update subscription info
      if (sessionId) {
        try {
          // Get checkout session data
          const { data: checkoutData, error: checkoutError } = await supabase
            .from("checkout_sessions")
            .select("*")
            .eq("session_id", sessionId)
            .single()

          if (!checkoutError && checkoutData) {
            console.log("Found checkout session data:", checkoutData)

            // Add subscription data to the member record
            memberDataToSave.subscription_status = "active"
            memberDataToSave.subscription_plan = checkoutData.plan_type
            memberDataToSave.subscription_updated_at = new Date().toISOString()

            // If we have a Stripe subscription ID in the checkout data
            if (checkoutData.subscription_id) {
              memberDataToSave.subscription_id = checkoutData.subscription_id
            }

            // If we have a Stripe customer ID in the checkout data
            if (checkoutData.customer_id) {
              memberDataToSave.stripe_customer_id = checkoutData.customer_id
            }
          } else {
            console.log("No checkout data found for session ID:", sessionId)
          }
        } catch (checkoutErr) {
          console.error("Error fetching checkout data:", checkoutErr)
          // Continue with member creation even if checkout data fetch fails
        }
      }

      const { error } = await createMember(memberDataToSave)

      if (error) {
        throw new Error(error.message)
      }

      // If we have a session_id, try to update the subscription status via the admin API
      if (sessionId && user.id) {
        try {
          // Call the admin API to update subscription status
          const response = await fetch("/api/admin/update-subscription", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              // We don't need to pass subscriptionId as the API will find it
            }),
          })

          if (!response.ok) {
            console.error("Failed to update subscription via admin API:", await response.text())
          } else {
            console.log("Successfully updated subscription via admin API")
          }
        } catch (subscriptionErr) {
          console.error("Error calling subscription update API:", subscriptionErr)
          // Continue with success flow even if this fails
        }
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/dashboard")
      }, 3000)
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Ocurrió un error al registrar tus datos")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>¡Registro completado!</CardTitle>
          <CardDescription>
            Tus datos han sido registrados correctamente. Ya eres miembro oficial de la Peña Madridista.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <a href="/dashboard">Ir al panel de control</a>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Registro de Socio</CardTitle>
        <CardDescription>
          Completa tus datos para finalizar el registro como miembro de la Peña Madridista
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dni_pasaporte">DNI/Pasaporte *</Label>
              <Input
                id="dni_pasaporte"
                name="dni_pasaporte"
                value={formData.dni_pasaporte}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellido1">Primer Apellido *</Label>
              <Input id="apellido1" name="apellido1" value={formData.apellido1} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellido2">Segundo Apellido</Label>
              <Input id="apellido2" name="apellido2" value={formData.apellido2} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                name="telefono"
                value={formData.telefono?.toString() || ""}
                onChange={handleChange}
                required
                type="tel"
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="Solo números"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
              <Input
                id="fecha_nacimiento"
                name="fecha_nacimiento"
                type="date"
                value={formData.fecha_nacimiento as string}
                onChange={handleChange}
                required
              />
            </div>

            {/* Membership section */}
            <div className="md:col-span-2 pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">Información de membresía</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 flex items-center">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="es_socio_realmadrid"
                      name="es_socio_realmadrid"
                      checked={formData.es_socio_realmadrid}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          es_socio_realmadrid: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="es_socio_realmadrid">¿Eres socio del Real Madrid?</Label>
                  </div>
                </div>

                <div className="space-y-2 flex items-center">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="socio_carnet_madridista"
                      name="socio_carnet_madridista"
                      checked={formData.socio_carnet_madridista}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          socio_carnet_madridista: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="socio_carnet_madridista">¿Tienes Carnet Madridista?</Label>
                  </div>
                </div>

                {formData.es_socio_realmadrid && (
                  <div className="space-y-2">
                    <Label htmlFor="num_socio">Número de Socio Real Madrid *</Label>
                    <Input
                      id="num_socio"
                      name="num_socio"
                      value={formData.num_socio?.toString() || ""}
                      onChange={handleChange}
                      required={formData.es_socio_realmadrid}
                      placeholder="Introduce tu número de socio"
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                    />
                  </div>
                )}

                {formData.socio_carnet_madridista && (
                  <div className="space-y-2">
                    <Label htmlFor="num_carnet">Número de Carnet Madridista *</Label>
                    <Input
                      id="num_carnet"
                      name="num_carnet"
                      value={formData.num_carnet?.toString() || ""}
                      onChange={handleChange}
                      required={formData.socio_carnet_madridista}
                      placeholder="Introduce tu número de Carnet Madridista"
                      type="text"
                      pattern="[0-9]*"
                      inputMode="numeric"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Address section */}
            <div className="md:col-span-2 pt-4 border-t">
              <h3 className="text-lg font-medium mb-4">Dirección</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direccion">Dirección *</Label>
                  <Input id="direccion" name="direccion" value={formData.direccion} onChange={handleChange} required />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="direccion_extra">Dirección (línea 2)</Label>
                  <Input
                    id="direccion_extra"
                    name="direccion_extra"
                    value={formData.direccion_extra}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poblacion">Población *</Label>
                  <Input id="poblacion" name="poblacion" value={formData.poblacion} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cp">Código Postal *</Label>
                  <Input
                    id="cp"
                    name="cp"
                    value={formData.cp?.toString() || ""}
                    onChange={handleChange}
                    required
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="Solo números"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provincia">Provincia *</Label>
                  <Input id="provincia" name="provincia" value={formData.provincia} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pais">País *</Label>
                  <Input id="pais" name="pais" value={formData.pais} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nacionalidad">Nacionalidad *</Label>
                  <Input
                    id="nacionalidad"
                    name="nacionalidad"
                    value={formData.nacionalidad}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Procesando..." : "Completar registro"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
