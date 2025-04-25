"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Phone, MapPin } from "lucide-react"
import { submitContactForm } from "../actions/contact"
import { CityManagers } from "@/components/city-managers"

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Submit the form using our server action
      const result = await submitContactForm(formData)
      
      if (result.success) {
        setSuccess(true)
        // Reset form on success
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        })
        
        // Auto-hide the success message after 5 seconds
        setTimeout(() => {
          setSuccess(false)
        }, 5000)
      } else {
        setError(result.error || "Error al enviar el mensaje. Por favor, inténtalo de nuevo.")
        
        // Auto-hide the error message after 5 seconds
        setTimeout(() => {
          setError(null)
        }, 5000)
      }
    } catch (err) {
      console.error("Error submitting contact form:", err)
      setError("Hubo un error al enviar el mensaje. Por favor, inténtalo de nuevo.")
      
      // Auto-hide the error message after 5 seconds
      setTimeout(() => {
        setError(null)
      }, 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">Contacto</h1>
          <p className="text-lg text-gray-600">
            ¿Tienes alguna pregunta o comentario? Estamos aquí para ayudarte. Ponte en contacto con nosotros.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Información de Contacto</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-gray-600">info@lorenzosanz.com</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <a href="https://wa.me/34665652251"><p className="font-medium hover:underline">WhatsApp</p></a>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-primary mr-3 mt-0.5" />
                    <div>
                      <p className="font-medium">Dirección</p>
                      <p className="text-gray-600">
                        Madrid, España
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Horario de Atención</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Lunes - Viernes:</span>
                    <span className="text-gray-600">10:00 - 19:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sábado:</span>
                    <span className="text-gray-600">10:00 - 14:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Domingo:</span>
                    <span className="text-gray-600">Cerrado</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
                <h2 className="text-xl font-bold text-primary mb-6">Envíanos un Mensaje</h2>

                {success ? (
                  <Alert className="bg-green-50 border-green-200 text-green-800 mb-6">
                    <AlertDescription>
                      ¡Mensaje enviado con éxito! Nos pondremos en contacto contigo lo antes posible.
                    </AlertDescription>
                  </Alert>
                ) : error ? (
                  <Alert variant="destructive" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Nombre completo</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="subject">Asunto</Label>
                    <Input
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Mensaje</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      className="mt-1 min-h-[150px]"
                    />
                  </div>
                  <Button type="submit" className="w-full transition-all bg-primary hover:bg-white hover:text-black hover:border hover:border-black" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar Mensaje"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
          
          {/* City Managers Section */}
          <div className="mt-16">
            <CityManagers />
          </div>
        </div>
      </div>
    </div>
  )
}