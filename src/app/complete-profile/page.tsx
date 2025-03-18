"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function CompleteProfile() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<Date>()

  const [formData, setFormData] = useState({
    dni_pasaporte: "",
    name: "",
    apellido1: "",
    apellido2: "",
    telefono: "",
    email: "",
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
    pais: "",
    nacionalidad: "",
  })

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser()

        if (!userData.user) {
          router.push("/login")
          return
        }

        setUser(userData.user)

        // Check if profile is already complete
        const { data: profileData, error: profileError } = await supabase
          .from("miembros")
          .select("*")
          .eq("auth_id", userData.user.id)
          .single()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
          setLoading(false)
          return
        }

        // If profile is already complete, redirect to dashboard
        if (profileData && profileData.dni_pasaporte && profileData.name && profileData.apellido1) {
          router.push("/dashboard")
          return
        }

        // Pre-fill email from auth
        setFormData((prev) => ({
          ...prev,
          email: userData.user.email || "",
        }))

        setLoading(false)
      } catch (error: any) {
        console.error("Error checking user:", error)
        setLoading(false)
      }
    }

    checkUser()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target

    if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? "" : value,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleDateChange = (date: Date | undefined) => {
    setDate(date)
    if (date) {
      setFormData((prev) => ({
        ...prev,
        fecha_nacimiento: format(date, "yyyy-MM-dd"),
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      // Validate required fields
      const requiredFields = [
        "dni_pasaporte",
        "name",
        "apellido1",
        "telefono",
        "email",
        "fecha_nacimiento",
        "direccion",
        "nacionalidad",
      ]

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData]) {
          throw new Error(`El campo ${field} es obligatorio`)
        }
      }

      // Validate conditional fields
      if (formData.es_socio_realmadrid && !formData.num_socio) {
        throw new Error("El número de socio es obligatorio si eres socio del Real Madrid")
      }

      if (formData.socio_carnet_madridista && !formData.num_carnet) {
        throw new Error("El número de carnet madridista es obligatorio si tienes carnet madridista")
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from("miembros")
        .update({
          dni_pasaporte: formData.dni_pasaporte,
          name: formData.name,
          apellido1: formData.apellido1,
          apellido2: formData.apellido2 || null,
          telefono: formData.telefono ? Number.parseInt(formData.telefono) : null,
          fecha_nacimiento: formData.fecha_nacimiento,
          es_socio_realmadrid: formData.es_socio_realmadrid,
          num_socio: formData.num_socio ? Number.parseInt(formData.num_socio) : null,
          socio_carnet_madridista: formData.socio_carnet_madridista,
          num_carnet: formData.num_carnet ? Number.parseInt(formData.num_carnet) : null,
          direccion: formData.direccion,
          direccion_extra: formData.direccion_extra || null,
          poblacion: formData.poblacion || null,
          cp: formData.cp ? Number.parseInt(formData.cp) : null,
          provincia: formData.provincia || null,
          pais: formData.pais || null,
          nacionalidad: formData.nacionalidad,
        })
        .eq("auth_id", user.id)

      if (updateError) throw updateError

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setError(error.message || "Error al actualizar el perfil")
      setSubmitting(false)
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Completa tu Perfil</h1>
            <p className="text-gray-600 mb-6">
              Para finalizar tu registro como socio de la Peña Lorenzo Sanz, necesitamos algunos datos adicionales.
            </p>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-primary">Información Personal</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dni_pasaporte">
                      DNI/Pasaporte <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dni_pasaporte"
                      name="dni_pasaporte"
                      value={formData.dni_pasaporte}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nacionalidad">
                      Nacionalidad <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nacionalidad"
                      name="nacionalidad"
                      value={formData.nacionalidad}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apellido1">
                      Primer Apellido <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="apellido1"
                      name="apellido1"
                      value={formData.apellido1}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apellido2">Segundo Apellido</Label>
                    <Input id="apellido2" name="apellido2" value={formData.apellido2} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">
                      Teléfono <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="telefono"
                      name="telefono"
                      type="number"
                      value={formData.telefono}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_nacimiento">
                    Fecha de Nacimiento <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleDateChange}
                        initialFocus
                        locale={es}
                        captionLayout="dropdown"
                        fromYear={1920}
                        toYear={2023}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-primary">Información de Socio</h2>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="es_socio_realmadrid"
                    checked={formData.es_socio_realmadrid}
                    onCheckedChange={(checked) => handleCheckboxChange("es_socio_realmadrid", checked as boolean)}
                  />
                  <Label htmlFor="es_socio_realmadrid">Soy socio del Real Madrid</Label>
                </div>

                {formData.es_socio_realmadrid && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="num_socio">
                      Número de Socio <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="num_socio"
                      name="num_socio"
                      type="number"
                      value={formData.num_socio}
                      onChange={handleChange}
                      required={formData.es_socio_realmadrid}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="socio_carnet_madridista"
                    checked={formData.socio_carnet_madridista}
                    onCheckedChange={(checked) => handleCheckboxChange("socio_carnet_madridista", checked as boolean)}
                  />
                  <Label htmlFor="socio_carnet_madridista">Tengo Carnet Madridista</Label>
                </div>

                {formData.socio_carnet_madridista && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="num_carnet">
                      Número de Carnet <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="num_carnet"
                      name="num_carnet"
                      type="number"
                      value={formData.num_carnet}
                      onChange={handleChange}
                      required={formData.socio_carnet_madridista}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-primary">Dirección</h2>

                <div className="space-y-2">
                  <Label htmlFor="direccion">
                    Dirección <span className="text-red-500">*</span>
                  </Label>
                  <Input id="direccion" name="direccion" value={formData.direccion} onChange={handleChange} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion_extra">Información adicional (piso, puerta, etc.)</Label>
                  <Input
                    id="direccion_extra"
                    name="direccion_extra"
                    value={formData.direccion_extra}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="poblacion">Población</Label>
                    <Input id="poblacion" name="poblacion" value={formData.poblacion} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cp">Código Postal</Label>
                    <Input id="cp" name="cp" type="number" value={formData.cp} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provincia">Provincia</Label>
                    <Input id="provincia" name="provincia" value={formData.provincia} onChange={handleChange} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pais">País</Label>
                    <Input id="pais" name="pais" value={formData.pais} onChange={handleChange} />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full bg-primary hover:bg-secondary" disabled={submitting}>
                  {submitting ? "Guardando..." : "Completar Registro"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

