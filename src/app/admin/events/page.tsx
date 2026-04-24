"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar as CalendarIcon, Trash2, Pencil, Plus, AlertTriangle, MoreHorizontal, ImagePlus, Users, Clock, MapPin, Mail, Send, CheckCircle, Eye, EyeOff } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatShopPrice, cn } from "@/lib/utils"
import { formatCentsToEuroInput, parseEuroPriceInputToCents } from "@/lib/events"
import { createEventCampaign, sendCampaign, sendTestCampaign, getEventCampaignStatus } from "@/app/actions/admin-email-campaigns"

// Add route segment config to mark this route as dynamic
export const dynamic = 'force-dynamic'

// Define Event type
interface Event {
  id: string
  title: string
  description: string | null
  date: string
  time: string | null
  location: string | null
  capacity: number | null
  available: number | null
  image_url: string | null
  is_hidden: boolean
  one_time_price_cents: number | null
  created_at: string | null
  updated_at: string | null
}

// Empty event for new creation
const emptyEvent: Omit<Event, "id" | "created_at" | "updated_at"> = {
  title: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  time: "",
  location: "",
  capacity: 0,
  available: 0,
  image_url: null,
  is_hidden: false,
  one_time_price_cents: null,
}

export default function AdminEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  
  // Form state
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Omit<Event, "id" | "created_at" | "updated_at">>({...emptyEvent})
  const [currentEventId, setCurrentEventId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [submitLoading, setSubmitLoading] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState("")
  const [priceInputError, setPriceInputError] = useState<string | null>(null)

  // Email notification state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [emailEventId, setEmailEventId] = useState<string | null>(null)
  const [emailEventTitle, setEmailEventTitle] = useState("")
  const [emailPreviewText, setEmailPreviewText] = useState("")
  const [emailTestAddress, setEmailTestAddress] = useState("")
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number; skipped: number } | null>(null)
  const [emailAlreadySent, setEmailAlreadySent] = useState(false)
  const [emailConfirmResend, setEmailConfirmResend] = useState(false)

  // Check if user is admin on client side
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error("Authentication error:", userError)
          router.push("/login?redirect=/admin/events")
          return
        }
        
        // Check if user has admin role
        const { data: profile, error: profileError } = await supabase
          .from('miembros')
          .select('role')
          .eq('user_uuid', user.id)
          .single()
        
        if (profileError) {
          console.error("Error fetching profile:", profileError)
          router.push("/dashboard")
          return
        }
        
        if (profile?.role !== 'admin') {
          console.log("Non-admin user attempting to access admin page")
          router.push("/dashboard")
          return
        }
        
        setIsAdmin(true)
        setAuthChecking(false)
      } catch (err) {
        console.error("Error checking admin status:", err)
        router.push("/dashboard")
      }
    }
    
    checkAdminStatus()
  }, [router])

  // Fetch events
  const fetchEvents = useCallback(async () => {
    if (!isAdmin || authChecking) return;
    
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true })
      
      if (error) {
        console.error("Error fetching events:", error)
        setError("No se pudieron cargar los eventos. Por favor, inténtalo de nuevo más tarde.")
      } else {
        setEvents(data || [])
        setError(null)
      }
    } catch (error) {
      console.error("Error in fetchEvents:", error)
      setError("Se produjo un error al cargar los eventos.")
    } finally {
      setLoading(false)
    }
  }, [isAdmin, authChecking])

  useEffect(() => {
    if (isAdmin && !authChecking) {
      fetchEvents()
    }
  }, [fetchEvents, isAdmin, authChecking])

  // Handle input change for form fields
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle number input change with validation
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // Only allow positive numbers or empty string
    if (value === "" || /^\d+$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? null : parseInt(value, 10)
      }))
    }
  }

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setFormData((prev) => ({
        ...prev,
        date: format(date, 'yyyy-MM-dd')
      }))
    }
  }

  // Open the form dialog for creating a new event
  const handleCreateEvent = () => {
    setIsEditing(false)
    setFormData({...emptyEvent})
    setSelectedDate(new Date())
    setCurrentEventId(null)
    setPriceInput("")
    setPriceInputError(null)
    setIsOpen(true)
  }

  // Open the form dialog for editing an existing event
  const handleEditEvent = (event: Event) => {
    setIsEditing(true)
    setFormData({
      title: event.title,
      description: event.description || "",
      date: event.date,
      time: event.time || "",
      location: event.location || "",
      capacity: event.capacity || 0,
      available: event.available || 0,
      image_url: event.image_url,
      is_hidden: event.is_hidden,
      one_time_price_cents: event.one_time_price_cents,
    })
    setSelectedDate(new Date(event.date))
    setCurrentEventId(event.id)
    setPriceInput(formatCentsToEuroInput(event.one_time_price_cents))
    setPriceInputError(null)
    setIsOpen(true)
  }

  // Confirm dialog for deleting an event
  const handleDeletePrompt = (eventId: string) => {
    setDeleteEventId(eventId)
    setDeleteConfirmOpen(true)
  }

  // Delete an event
  const handleDeleteEvent = async () => {
    if (!deleteEventId) return
    
    try {
      setSubmitLoading(true)
      
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", deleteEventId)
      
      if (error) {
        console.error("Error deleting event:", error)
        setError("No se pudo eliminar el evento. Por favor, inténtalo de nuevo.")
      } else {
        fetchEvents()
      }
    } catch (error) {
      console.error("Error in handleDeleteEvent:", error)
      setError("Se produjo un error al eliminar el evento.")
    } finally {
      setSubmitLoading(false)
      setDeleteConfirmOpen(false)
      setDeleteEventId(null)
    }
  }

  const handleToggleVisibility = async (event: Event) => {
    try {
      setVisibilityUpdatingId(event.id)

      const { error } = await supabase
        .from("events")
        .update({
          is_hidden: !event.is_hidden,
          updated_at: new Date().toISOString(),
        })
        .eq("id", event.id)

      if (error) {
        console.error("Error toggling event visibility:", error)
        setError("No se pudo actualizar la visibilidad del evento. Por favor, inténtalo de nuevo.")
        return
      }

      await fetchEvents()
    } catch (error) {
      console.error("Error in handleToggleVisibility:", error)
      setError("Se produjo un error al actualizar la visibilidad del evento.")
    } finally {
      setVisibilityUpdatingId(null)
    }
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      setImageUploading(true)
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`
      const filePath = `events/${fileName}`
      
      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })
      
      if (uploadError) {
        throw new Error(`Error uploading image: ${uploadError.message}`)
      }
      
      // Get the public URL
      const { data } = supabase
        .storage
        .from('images')
        .getPublicUrl(filePath)
      
      setFormData((prev) => ({
        ...prev,
        image_url: data.publicUrl
      }))
    } catch (error) {
      console.error("Error uploading image:", error)
      setError("Se produjo un error al subir la imagen.")
    } finally {
      setImageUploading(false)
    }
  }

  const handlePriceInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setPriceInput(value)

    const parsed = parseEuroPriceInputToCents(value)
    setPriceInputError(parsed.error)

    if (!parsed.error) {
      setFormData((prev) => ({
        ...prev,
        one_time_price_cents: parsed.cents,
      }))
    }
  }

  // Submit the form to create or update an event
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (priceInputError) {
        setError(priceInputError)
        return
      }

      setSubmitLoading(true)
      
      if (isEditing && currentEventId) {
        // Update existing event
        const { error } = await supabase
          .from("events")
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq("id", currentEventId)
        
        if (error) {
          console.error("Error updating event:", error)
          setError("No se pudo actualizar el evento. Por favor, inténtalo de nuevo.")
          return
        }
      } else {
        // Create new event
        const { error } = await supabase
          .from("events")
          .insert({
            ...formData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.error("Error creating event:", error)
          setError("No se pudo crear el evento. Por favor, inténtalo de nuevo.")
          return
        }
      }
      
      // Refresh the events list
      fetchEvents()
      
      // Reset and close the form
      setFormData({...emptyEvent})
      setPriceInput("")
      setPriceInputError(null)
      setIsOpen(false)
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      setError("Se produjo un error al guardar el evento.")
    } finally {
      setSubmitLoading(false)
    }
  }

  // Format date for display
  // ─── Email notification handlers ────────────────────────────────────────────
  const handleOpenEmailDialog = async (event: Event) => {
    setEmailEventId(event.id)
    setEmailEventTitle(event.title)
    setEmailPreviewText("")
    setEmailTestAddress("")
    setEmailResult(null)
    setEmailConfirmResend(false)

    // Check if a campaign was already sent for this event
    const status = await getEventCampaignStatus(event.id)
    setEmailAlreadySent(status.hasSentCampaign)
    setEmailDialogOpen(true)
  }

  const handleSendTestEmail = async () => {
    if (!emailEventId || !emailTestAddress) return
    setEmailSending(true)
    try {
      const campaignResult = await createEventCampaign(emailEventId, undefined, emailPreviewText || undefined)
      if (!campaignResult.success || !campaignResult.campaignId) {
        setError(campaignResult.error || "Error al crear la campaña de prueba")
        return
      }
      const result = await sendTestCampaign(campaignResult.campaignId, emailTestAddress)
      if (result.success) {
        setEmailResult({ sent: 1, failed: 0, skipped: 0 })
      } else {
        setError(result.error || "Error al enviar el email de prueba")
      }
    } catch (err) {
      console.error("Error sending test email:", err)
      setError("Error al enviar el email de prueba")
    } finally {
      setEmailSending(false)
    }
  }

  const handleSendEventEmail = async () => {
    if (!emailEventId) return
    if (emailAlreadySent && !emailConfirmResend) {
      setEmailConfirmResend(true)
      return
    }

    setEmailSending(true)
    setEmailResult(null)
    try {
      const campaignResult = await createEventCampaign(emailEventId, undefined, emailPreviewText || undefined)
      if (!campaignResult.success || !campaignResult.campaignId) {
        setError(campaignResult.error || "Error al crear la campaña")
        return
      }

      const result = await sendCampaign(campaignResult.campaignId)
      if (result.success) {
        setEmailResult({ sent: result.sent, failed: result.failed, skipped: result.skipped })
        setEmailAlreadySent(true)
        setEmailConfirmResend(false)
      } else {
        setError(result.error || "Error al enviar la campaña")
      }
    } catch (err) {
      console.error("Error sending event email:", err)
      setError("Error al enviar la notificación por email")
    } finally {
      setEmailSending(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  }

  // Show loading state while checking authentication
  if (authChecking) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos de administrador...</p>
        </div>
      </div>
    )
  }

  // If not admin, this will redirect (handled in useEffect)
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Gestión de Eventos</h1>
          <p className="text-gray-600">Administra los eventos de la Peña Lorenzo Sanz</p>
        </div>
        <Button 
          onClick={handleCreateEvent}
          className="mt-4 md:mt-0 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Crear Evento
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando eventos...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg">
          <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">No hay eventos</h3>
          <p className="text-gray-600 mb-8">
            No hay eventos creados actualmente. Haz clic en Crear Evento para añadir uno nuevo.
          </p>
          <Button onClick={handleCreateEvent} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Crear Primer Evento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden flex flex-col h-full">
              <div className="relative h-48">
                <Image 
                  src={event.image_url || "/placeholder.svg"} 
                  alt={event.title} 
                  fill 
                  className="object-cover" 
                />
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <Badge
                      variant="secondary"
                      className={event.is_hidden ? "bg-gray-200 text-gray-700" : "bg-green-100 text-green-800"}
                    >
                      {event.is_hidden ? "Oculto" : "Visible"}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEmailDialog(event)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Notificar evento
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleVisibility(event)}
                        disabled={visibilityUpdatingId === event.id}
                      >
                        {event.is_hidden ? (
                          <Eye className="mr-2 h-4 w-4" />
                        ) : (
                          <EyeOff className="mr-2 h-4 w-4" />
                        )}
                        {event.is_hidden ? "Mostrar evento" : "Ocultar evento"}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeletePrompt(event.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="line-clamp-2">
                  {event.description || "Sin descripción"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 text-primary mr-2" />
                  <span className="text-sm">{formatDate(event.date)}</span>
                </div>
                {event.time && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-primary mr-2" />
                    <span className="text-sm">{event.time} h</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-primary mr-2" />
                    <span className="text-sm">{event.location}</span>
                  </div>
                )}
                {event.capacity && event.available !== null && (
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-primary mr-2" />
                    <span className="text-sm">
                      {event.available} plazas disponibles de {event.capacity}
                    </span>
                  </div>
                )}
                {typeof event.one_time_price_cents === "number" && event.one_time_price_cents >= 0 && (
                  <div className="flex items-center">
                    <span className="mr-2 text-primary">€</span>
                    <span className="text-sm">
                      Entrada puntual: {formatShopPrice(event.one_time_price_cents)}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 mt-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleEditEvent(event)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Evento
                </Button>
                <Button className="w-full" onClick={() => handleOpenEmailDialog(event)}>
                  <Mail className="mr-2 h-4 w-4" />
                  Notificar Evento
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Event Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Evento" : "Crear Nuevo Evento"}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Modifica los detalles del evento y guarda los cambios." 
                : "Completa el formulario para crear un nuevo evento."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título del Evento *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Ej: Presentación Temporada 2025/2026"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleInputChange}
                placeholder="Describe el evento..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, "PPP", { locale: es })
                      ) : (
                        <span>Selecciona una fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                      locale={es}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Hora (formato 24h)</Label>
                <Input
                  id="time"
                  name="time"
                  value={formData.time || ""}
                  onChange={handleInputChange}
                  placeholder="Ej: 19:30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                name="location"
                value={formData.location || ""}
                onChange={handleInputChange}
                placeholder="Ej: Sede de la Peña Lorenzo Sanz"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidad Total</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="text"
                  value={formData.capacity || ""}
                  onChange={handleNumberChange}
                  placeholder="Ej: 50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="available">Plazas Disponibles</Label>
                <Input
                  id="available"
                  name="available"
                  type="text"
                  value={formData.available || ""}
                  onChange={handleNumberChange}
                  placeholder="Ej: 50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="one_time_price_cents">Precio entrada puntual (EUR)</Label>
              <Input
                id="one_time_price_cents"
                name="one_time_price_cents"
                type="text"
                inputMode="decimal"
                value={priceInput}
                onChange={handlePriceInputChange}
                placeholder="Ej: 12,50"
              />
              <p className="text-sm text-gray-500">
                Déjalo vacío para que el evento siga siendo solo visible y no comprable por no socios.
              </p>
              {priceInputError && <p className="text-sm text-red-600">{priceInputError}</p>}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="event-visibility">Mostrar en la web y dashboard</Label>
                <p className="text-sm text-gray-500">
                  Si lo desactivas, el evento seguirá guardado en Supabase pero dejará de aparecer en las vistas públicas y de socios.
                </p>
              </div>
              <Switch
                id="event-visibility"
                checked={!formData.is_hidden}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_hidden: !checked,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Imagen del Evento</Label>
              <div className="flex items-center space-x-4">
                <div className="border rounded-md overflow-hidden h-24 w-24 flex-shrink-0 bg-gray-50 relative">
                  {formData.image_url ? (
                    <Image
                      src={formData.image_url}
                      alt="Vista previa de la imagen"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-gray-400">
                      <ImagePlus size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="image" className="cursor-pointer">
                    <div className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-md h-10 px-3 py-2 hover:bg-gray-50 transition-colors">
                      {imageUploading ? (
                        <span className="text-sm text-gray-500">Subiendo...</span>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {formData.image_url ? "Cambiar imagen" : "Subir imagen"}
                        </span>
                      )}
                    </div>
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={imageUploading}
                    />
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Recomendado: 1200 x 630 píxeles
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={submitLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={submitLoading || !formData.title || !formData.date || Boolean(priceInputError)}
                className="ml-2"
              >
                {submitLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                    Guardando...
                  </>
                ) : (
                  isEditing ? "Actualizar Evento" : "Crear Evento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirmar eliminación</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar este evento?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={submitLoading}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={submitLoading}
              className="ml-2"
            >
              {submitLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  Eliminando...
                </>
              ) : (
                "Eliminar Evento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Notification Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={(open) => { setEmailDialogOpen(open); if (!open) { setEmailResult(null); setEmailConfirmResend(false); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar campaña del evento
            </DialogTitle>
            <DialogDescription>
              Envía una campaña del evento &quot;{emailEventTitle}&quot; a los suscriptores activos del boletín de la peña.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {emailAlreadySent && !emailResult && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ya se ha enviado una campaña de este evento anteriormente.
                </AlertDescription>
              </Alert>
            )}

            {emailResult && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Enviados: {emailResult.sent} | Fallidos: {emailResult.failed} | Omitidos: {emailResult.skipped}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="previewText">Texto de vista previa (opcional)</Label>
              <Input
                id="previewText"
                value={emailPreviewText}
                onChange={(e) => setEmailPreviewText(e.target.value)}
                placeholder="Se muestra en la bandeja de entrada antes de abrir el email"
              />
            </div>

            <p className="text-sm text-gray-500">
              Solo se enviará a contactos activos de <code>newsletter_subscribers</code>.
            </p>

            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="testEmail">Enviar prueba a:</Label>
              <div className="flex gap-2">
                <Input
                  id="testEmail"
                  type="email"
                  value={emailTestAddress}
                  onChange={(e) => setEmailTestAddress(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={emailSending || !emailTestAddress}
                  size="sm"
                >
                  {emailSending ? (
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  ) : (
                    "Probar"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmailDialogOpen(false)}
              disabled={emailSending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSendEventEmail}
              disabled={emailSending}
              className="ml-2"
            >
              {emailSending ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Enviando...
                </>
              ) : emailConfirmResend ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Confirmar reenvío
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar a newsletter
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
