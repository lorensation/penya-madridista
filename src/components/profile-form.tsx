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

// Override Zod's default English messages with Spanish equivalents
z.setErrorMap((issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type && issue.received === "undefined") {
    return { message: "Campo obligatorio" }
  }
  if (issue.code === z.ZodIssueCode.too_small && issue.type === "string" && issue.minimum === 1) {
    return { message: "Campo obligatorio" }
  }
  return { message: ctx.defaultError }
})

const ONLY_TEXT_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]+$/
const DNI_PASSPORT_REGEX = /^[A-Za-z0-9]+$/
const ADDRESS_REGEX = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s.,ºª#\/-]+$/
const DIGITS_REGEX = /^\d+$/
const PHONE_INPUT_REGEX = /^[+\d\s().-]+$/

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function normalizeOptionalText(value: string): string | undefined {
  const normalized = normalizeText(value)
  return normalized.length > 0 ? normalized : undefined
}

const requiredOnlyText = (field: string, minLength = 2) =>
  z
    .string()
    .transform(normalizeText)
    .refine((value) => value.length >= minLength, {
      message: `${field} es obligatorio`,
    })
    .refine((value) => ONLY_TEXT_REGEX.test(value), {
      message: `${field} solo puede contener letras`,
    })

const requiredDigits = (field: string, minLength = 1, maxLength?: number) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z
      .string()
      .min(1, { message: `${field} es obligatorio` })
      .refine((value) => DIGITS_REGEX.test(value), {
        message: `${field} solo puede contener numeros`,
      })
      .refine((value) => value.length >= minLength, {
        message: `${field} debe tener al menos ${minLength} digitos`,
      })
      .refine((value) => (maxLength ? value.length <= maxLength : true), {
        message: maxLength ? `${field} no puede superar ${maxLength} digitos` : `${field} invalido`,
      }),
  )

const optionalDigits = (field: string, minLength = 1, maxLength?: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value
      }

      const trimmed = value.trim()
      return trimmed.length > 0 ? trimmed : undefined
    },
    z
      .string()
      .refine((value) => DIGITS_REGEX.test(value), {
        message: `${field} solo puede contener numeros`,
      })
      .refine((value) => value.length >= minLength, {
        message: `${field} debe tener al menos ${minLength} digitos`,
      })
      .refine((value) => (!maxLength ? true : value.length <= maxLength), {
        message: maxLength ? `${field} no puede superar ${maxLength} digitos` : `${field} invalido`,
      })
      .optional(),
  )

// Define the form schema with strict normalization and validation
const profileFormSchema = z
  .object({
    name: requiredOnlyText("El nombre"),
    apellido1: requiredOnlyText("El primer apellido"),
    apellido2: z
      .string()
      .transform(normalizeOptionalText)
      .refine((value) => value === undefined || ONLY_TEXT_REGEX.test(value), {
        message: "El segundo apellido solo puede contener letras",
      })
      .optional(),
    dni_pasaporte: z
      .string()
      .transform((value) => value.trim().replace(/\s+/g, "").toUpperCase())
      .refine((value) => value.length > 0, { message: "El DNI/Pasaporte es obligatorio" })
      .refine((value) => DNI_PASSPORT_REGEX.test(value), {
        message: "El DNI/Pasaporte solo puede contener letras y numeros",
      }),
    telefono: z
      .string()
      .transform((value) => value.trim())
      .refine((value) => value.length > 0, { message: "El telefono es obligatorio" })
      .refine((value) => PHONE_INPUT_REGEX.test(value), {
        message: "El telefono contiene caracteres no permitidos",
      })
      .refine((value) => {
        const plusCount = (value.match(/\+/g) || []).length
        return plusCount === 0 || (plusCount === 1 && value.startsWith("+"))
      }, {
        message: "El telefono solo puede usar '+' al inicio",
      })
      .transform((value) => value.replace(/\D/g, ""))
      .refine((value) => value.length >= 9 && value.length <= 15, {
        message: "El telefono debe tener entre 9 y 15 digitos",
      }),
    fecha_nacimiento: z.string().min(1, { message: "La fecha de nacimiento es obligatoria" }),
    direccion: z
      .string()
      .transform(normalizeText)
      .refine((value) => value.length >= 5, { message: "La direccion es obligatoria" })
      .refine((value) => ADDRESS_REGEX.test(value), {
        message: "La direccion contiene caracteres no permitidos",
      }),
    direccion_extra: z
      .string()
      .transform((value) => normalizeOptionalText(value))
      .refine((value) => value === undefined || ADDRESS_REGEX.test(value), {
        message: "La direccion adicional contiene caracteres no permitidos",
      })
      .optional(),
    poblacion: requiredOnlyText("La poblacion"),
    cp: requiredDigits("El codigo postal", 4, 10),
    provincia: requiredOnlyText("La provincia"),
    pais: requiredOnlyText("El pais"),
    nacionalidad: requiredOnlyText("La nacionalidad"),
    es_socio_realmadrid: z.boolean().default(false),
    num_socio: optionalDigits("El numero de socio", 1, 20),
    socio_carnet_madridista: z.boolean().default(false),
    num_carnet: optionalDigits("El numero de carnet", 1, 20),
    ni_socio_ni_carnet: z.boolean().default(false),
    email_notifications: z.boolean().default(true),
    marketing_emails: z.boolean().default(true),
  })
  .superRefine((values, ctx) => {
    if (values.es_socio_realmadrid && !values.num_socio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["num_socio"],
        message: "El numero de socio es obligatorio",
      })
    }

    if (values.socio_carnet_madridista && !values.num_carnet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["num_carnet"],
        message: "El numero de carnet es obligatorio",
      })
    }
  })
type ProfileFormValues = z.infer<typeof profileFormSchema>

interface ProfileFormProps {
  onSubmit: (data: ProfileFormValues) => void
  initialData?: Partial<ProfileFormValues>
  /** Field names that should be displayed as read-only (pre-filled from user metadata) */
  lockedFields?: string[]
}

export function ProfileForm({ onSubmit, initialData, lockedFields = [] }: ProfileFormProps) {
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
      ni_socio_ni_carnet: false,
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
                  <FormLabel>Segundo Apellido</FormLabel>
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
                    <Input
                      type="date"
                      {...field}
                      readOnly={lockedFields.includes("fecha_nacimiento")}
                      className={lockedFields.includes("fecha_nacimiento") ? "bg-gray-100 cursor-not-allowed" : ""}
                    />
                  </FormControl>
                  {lockedFields.includes("fecha_nacimiento") && (
                    <p className="text-xs text-gray-500">Este dato proviene de tu registro y no puede modificarse.</p>
                  )}
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
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      if (checked) {
                        form.setValue("ni_socio_ni_carnet", false)
                      }
                    }}
                    disabled={form.watch("ni_socio_ni_carnet")}
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
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      if (checked) {
                        form.setValue("ni_socio_ni_carnet", false)
                      }
                    }}
                    disabled={form.watch("ni_socio_ni_carnet")}
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
                <FormItem className="ml-7 mb-4">
                  <FormLabel>Número de Carnet Madridista</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de carnet" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="ni_socio_ni_carnet"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                      if (checked) {
                        form.setValue("es_socio_realmadrid", false)
                        form.setValue("num_socio", "")
                        form.setValue("socio_carnet_madridista", false)
                        form.setValue("num_carnet", "")
                      }
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>No soy ni socio del Real Madrid ni tengo Carnet Madridista</FormLabel>
                </div>
              </FormItem>
            )}
          />
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
                    Te enviaremos información importante sobre tu suscripción y eventos exclusivos.
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
        
        <Button 
          type="submit" 
          className="w-full transition-all hover:bg-white hover:text-black hover:border hover:border-black" 
          disabled={isSubmitting}
          >
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

