"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"

// Define the form schema with validation
const profileFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  apellido1: z.string().min(2, { message: "El primer apellido es obligatorio" }),
  apellido2: z.string().optional(),
  dni_pasaporte: z.string().min(5, { message: "El DNI/Pasaporte es obligatorio" }),
  telefono: z.string().min(9, { message: "El teléfono debe tener al menos 9 dígitos" }),
  fecha_nacimiento: z.string().min(1, { message: "La fecha de nacimiento es obligatoria" }),
  direccion: z.string().min(5, { message: "La dirección es obligatoria" }),
  direccion_extra: z.string().optional(),
  poblacion: z.string().min(2, { message: "La población es obligatoria" }),
  cp: z.string().min(4, { message: "El código postal es obligatorio" }),
  provincia: z.string().min(2, { message: "La provincia es obligatoria" }),
  pais: z.string().min(2, { message: "El país es obligatorio" }),
  nacionalidad: z.string().min(2, { message: "La nacionalidad es obligatoria" }),
  es_socio_realmadrid: z.boolean().default(false),
  num_socio: z.string().optional(),
  socio_carnet_madridista: z.boolean().default(false),
  num_carnet: z.string().optional(),
  email_notifications: z.boolean().default(true),
  marketing_emails: z.boolean().default(true),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileFormProps {
  onSubmit: (data: ProfileFormValues) => void
  initialData?: Partial<ProfileFormValues>
}

export function ProfileForm({ onSubmit, initialData }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize the form with default values
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: initialData || {
      name: "",
      apellido1: "",
      apellido2: "",
      dni_pasaporte: "",
      telefono: "",
      fecha_nacimiento: "",
      direccion: "",
      direccion_extra: "",
      poblacion: "",
      cp: "",
      provincia: "",
      pais: "España",
      nacionalidad: "Española",
      es_socio_realmadrid: false,
      num_socio: "",
      socio_carnet_madridista: false,
      num_carnet: "",
      email_notifications: true,
      marketing_emails: true,
    },
  })

  // Handle form submission
  const handleSubmit = async (values: ProfileFormValues) => {
    setIsSubmitting(true)
    try {
      // Pass the values directly without type conversion
      // The parent component will handle any necessary conversions
      await onSubmit(values)
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Datos Personales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="apellido1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primer Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Primer apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="apellido2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Segundo Apellido (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Segundo apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dni_pasaporte"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>DNI/Pasaporte</FormLabel>
                  <FormControl>
                    <Input placeholder="DNI o Pasaporte" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Teléfono de contacto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fecha_nacimiento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Nacimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nacionalidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nacionalidad</FormLabel>
                  <FormControl>
                    <Input placeholder="Nacionalidad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Dirección</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Calle, número, piso..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="direccion_extra"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Información adicional (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Urbanización, bloque, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="poblacion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Población</FormLabel>
                  <FormControl>
                    <Input placeholder="Población" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código Postal</FormLabel>
                  <FormControl>
                    <Input placeholder="Código postal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="provincia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <FormControl>
                    <Input placeholder="Provincia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="pais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>País</FormLabel>
                  <FormControl>
                    <Input placeholder="País" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Información del Real Madrid</h2>
          
          <FormField
            control={form.control}
            name="es_socio_realmadrid"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Soy socio del Real Madrid</FormLabel>
                </div>
              </FormItem>
            )}
          />
          
          {form.watch("es_socio_realmadrid") && (
            <FormField
              control={form.control}
              name="num_socio"
              render={({ field }) => (
                <FormItem className="ml-7 mb-4">
                  <FormLabel>Número de Socio</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de socio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="socio_carnet_madridista"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Tengo Carnet Madridista</FormLabel>
                </div>
              </FormItem>
            )}
          />
          
          {form.watch("socio_carnet_madridista") && (
            <FormField
              control={form.control}
              name="num_carnet"
              render={({ field }) => (
                <FormItem className="ml-7">
                  <FormLabel>Número de Carnet Madridista</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de carnet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Preferencias de comunicación</h2>
          
          <FormField
            control={form.control}
            name="email_notifications"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Recibir notificaciones por email sobre mi cuenta y eventos</FormLabel>
                  <FormDescription>
                    Te enviaremos información importante sobre tu membresía y eventos exclusivos.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="marketing_emails"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Recibir comunicaciones de marketing</FormLabel>
                  <FormDescription>
                    Recibe noticias, ofertas y promociones de la Peña Lorenzo Sanz.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Perfil"
          )}
        </Button>
      </form>
    </Form>
  )
}