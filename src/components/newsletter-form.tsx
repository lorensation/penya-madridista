"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { subscribeToNewsletter } from "@/app/actions/newsletter"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast-hook"

const formSchema = z.object({
  email: z.string().email({
    message: "Por favor, introduce una dirección de correo electrónico válida.",
  }),
  name: z.string().optional(),
})

type NewsletterFormProps = {
  includeNameField?: boolean
  buttonText?: string
  className?: string
}

export default function NewsletterForm({
  includeNameField = false,
  buttonText = "Suscribirse",
  className = "",
}: NewsletterFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("email", values.email)
      if (values.name) {
        formData.append("name", values.name)
      }

      const result = await subscribeToNewsletter(formData)

      if (result.success) {
        toast({
          title: result.alreadySubscribed ? "Email ya suscrito" : "¡Suscripción exitosa!",
          description: result.message || "Gracias por suscribirte a nuestra newsletter.",
          variant: result.alreadySubscribed ? "default" : "default",
        })
        form.reset()
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Hubo un problema al procesar tu suscripción. Inténtalo de nuevo.",
        })
      }
    } catch (error) {
      console.error("Error subscribing to newsletter:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No pudimos procesar tu suscripción. Por favor, inténtalo más tarde.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={`space-y-4 ${className}`}>
        <div className="flex flex-col gap-3 sm:flex-row">
          {includeNameField && (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input placeholder="Tu nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input type="email" placeholder="Tu correo electrónico" {...field} required />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button type="submit" disabled={isLoading} className="mt-0 hover:scale-105 transition-transform duration-300 hover:bg-white hover:text-black hover:border hover:border-black">
            {isLoading ? "Enviando..." : buttonText}
          </Button>
        </div>
      </form>
    </Form>
  )
}