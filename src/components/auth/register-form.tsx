"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { useToast } from "@/components/ui/use-toast-hook"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  email: z.string().email({
    message: "Por favor, introduce una dirección de correo electrónico válida.",
  }),
  password: z.string().min(8, {
    message: "La contraseña debe tener al menos 8 caracteres.",
  }),
})

type FormValues = z.infer<typeof formSchema>

export function RegisterForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)

    try {
      const supabase = createBrowserSupabaseClient()
      
      // Register the user
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
          },
        },
      })

      if (error) {
        throw error
      }

      // Create a record in the users table
      try {
        await supabase.from("users").insert({
          id: (await supabase.auth.getUser()).data.user?.id,
          email: values.email,
          name: values.name,
          is_member: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (userError) {
        console.error("Error creating user record:", userError);
        // Continue even if this fails, as the auth user was created successfully
      }

      toast({
        title: "¡Registro exitoso!",
        description: "Por favor, revisa tu correo electrónico para confirmar tu cuenta.",
      })

      router.push("/login")
    } catch (error) {
      console.error("Error de registro:", error)
      toast({
        variant: "destructive",
        title: "Error en el registro",
        description: error instanceof Error ? error.message : "Algo salió mal. Por favor, inténtalo de nuevo.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Juan Pérez" {...field} />
              </FormControl>
              <FormDescription>
                Este es tu nombre público.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input type="email" placeholder="juan.perez@ejemplo.com" {...field} />
              </FormControl>
              <FormDescription>
                Enviaremos un correo de confirmación a esta dirección.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormDescription>
                Usa al menos 8 caracteres con una combinación de letras, números y símbolos.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full transition-all hover:bg-white hover:text-primary hover:border hover:border-black" disabled={isLoading}>
          {isLoading ? "Registrando..." : "Registrarse"}
        </Button>
      </form>
    </Form>
  )
}