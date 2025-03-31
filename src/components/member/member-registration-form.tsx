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

// Define a type for potential errors
interface ErrorWithMessage {
  message: string;
}

// Type guard to check if an error has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Function to extract error message from unknown error
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  return String(error);
}

export default function MemberRegistrationForm() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  const [formData, setFormData] = useState({
    dni_pasaporte: "",
    name: "",
    apellido1: "",
    apellido2: "",
    telefono: "",
    email: user?.email || "",
    fecha_nacimiento: "",
    es_socio_realmadrid: false,
    num_socio: "",
    socio_carnet_madrid: false, // Changed to boolean
    num_carnet_madridista: "", // New field for Carnet Madridista number
    direccion: "",
    direccion_extra: "",
    poblacion: "",
    cp: "",
    provincia: "",
    pais: "España",
    nacionalidad: "Española",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Redirect if no user or session ID
  if (!user || !sessionId) {
    if (typeof window !== "undefined") {
      router.push("/membership")
    }
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Create member record in Supabase
      const { error } = await createMember({
        ...formData,
        user_id: user.id,
      })

      if (error) {
        throw new Error(error.message)
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
              <Input id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} required />
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
                value={formData.fecha_nacimiento}
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
                      id="socio_carnet_madrid"
                      name="socio_carnet_madrid"
                      checked={formData.socio_carnet_madrid}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          socio_carnet_madrid: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="socio_carnet_madrid">¿Tienes Carnet Madridista?</Label>
                  </div>
                </div>

                {formData.es_socio_realmadrid && (
                  <div className="space-y-2">
                    <Label htmlFor="num_socio">Número de Socio Real Madrid *</Label>
                    <Input 
                      id="num_socio" 
                      name="num_socio" 
                      value={formData.num_socio} 
                      onChange={handleChange}
                      required={formData.es_socio_realmadrid}
                      placeholder="Introduce tu número de socio"
                    />
                  </div>
                )}

                {formData.socio_carnet_madrid && (
                  <div className="space-y-2">
                    <Label htmlFor="num_carnet_madridista">Número de Carnet Madridista *</Label>
                    <Input 
                      id="num_carnet_madridista" 
                      name="num_carnet_madridista" 
                      value={formData.num_carnet_madridista} 
                      onChange={handleChange}
                      required={formData.socio_carnet_madrid}
                      placeholder="Introduce tu número de Carnet Madridista"
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
                  <Input id="cp" name="cp" value={formData.cp} onChange={handleChange} required />
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
