"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar as CalendarIcon, Trash2, Pencil, Plus, AlertTriangle, MoreHorizontal, ImagePlus, Users, Clock, MapPin } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

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
  image_url: null
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
      image_url: event.image_url
    })
    setSelectedDate(new Date(event.date))
    setCurrentEventId(event.id)
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

  // Submit the form to create or update an event
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
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
      setIsOpen(false)
    } catch (error) {
      console.error("Error in handleSubmit:", error)
      setError("Se produjo un error al guardar el evento.")
    } finally {
      setSubmitLoading(false)
    }
  }

  // Format date for display
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
            No hay eventos creados actualmente. Haz clic en "Crear Evento" para añadir uno nuevo.
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
                  <CardTitle className="text-xl">{event.title}</CardTitle>
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
              </CardContent>
              <CardFooter className="pt-0 mt-auto">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleEditEvent(event)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar Evento
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
                disabled={submitLoading || !formData.title || !formData.date}
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
    </div>
  )
}