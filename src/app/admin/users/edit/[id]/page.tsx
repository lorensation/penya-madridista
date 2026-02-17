"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  User,
  Mail,
  Calendar,
  CreditCard,
  Shield,
  AlertTriangle,
  ArrowLeft,
  Save,
  Trash2,
  Clock,
  Infinity,
  CheckCircle,
  XCircle,
  FileText,
  Edit,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Database } from "@/types/supabase"

type MiembroUser = Database['public']['Tables']['miembros']['Row']

export default function UserDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  
  const [miembro, setMiembro] = useState<MiembroUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [infiniteSubscriptionDialogOpen, setInfiniteSubscriptionDialogOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const originalMiembro = useRef<MiembroUser | null>(null)

  // Check if user is admin on client side
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error("Authentication error:", userError)
          router.push("/login?redirect=/admin/users/edit/" + userId)
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
  }, [router, userId])

  // Fetch user data
  useEffect(() => {
    async function fetchUserData() {
        if (!isAdmin || authChecking) return;
        
        try {
        setLoading(true)
        
        // Fetch miembro data
        const { data: miembroData, error: miembroError } = await supabase
            .from('miembros')
            .select('*')
            .eq('user_uuid', userId)
            .single()
        
        if (miembroError) {
            if (miembroError.code === 'PGRST116') {
            // Try fetching by id instead of user_uuid
            const { data: miembroByIdData, error: miembroByIdError } = await supabase
                .from('miembros')
                .select('*')
                .eq('id', userId)
                .single()
            
            if (miembroByIdError) {
                throw new Error("No se encontró el miembro: " + miembroByIdError.message)
            }
            
            setMiembro(miembroByIdData)
            originalMiembro.current = miembroByIdData
            } else {
            throw new Error("Error al cargar datos del miembro: " + miembroError.message)
            }
        } else {
            setMiembro(miembroData)
            originalMiembro.current = miembroData
        }
        
        setError(null)
        } catch (error) {
        console.error("Error fetching user data:", error)
        setError(error instanceof Error ? error.message : "Error al cargar los datos del usuario")
        } finally {
        setLoading(false)
        }
    }
    
    fetchUserData()
  }, [userId, isAdmin, authChecking])

  // Handle form submission
  const handleSave = async () => {
    if (!miembro) return;
    
    try {
      setSaving(true)
      
      // Update miembro data with proper field names to match table structure
      const { error } = await supabase
        .from('miembros')
        .update({
          name: miembro.name,
          apellido1: miembro.apellido1,
          apellido2: miembro.apellido2,
          email: miembro.email,
          telefono: miembro.telefono ? Number(miembro.telefono) : undefined,
          dni_pasaporte: miembro.dni_pasaporte,
          es_socio_realmadrid: miembro.es_socio_realmadrid,
          num_socio: miembro.num_socio ? Number(miembro.num_socio) : null,
          socio_carnet_madridista: miembro.socio_carnet_madridista,
          num_carnet: miembro.num_carnet ? Number(miembro.num_carnet) : null,
          direccion: miembro.direccion,
          direccion_extra: miembro.direccion_extra,
          poblacion: miembro.poblacion, // Use only the existing field
          cp: miembro.cp ? Number(miembro.cp) : null,
          provincia: miembro.provincia,
          pais: miembro.pais,
          fecha_nacimiento: miembro.fecha_nacimiento,
          role: miembro.role, // This handles the admin role change
        })
        .eq('user_uuid', miembro.user_uuid!)
      
      if (error) {
        setTimeout(() => {
          setError(error instanceof Error ? error.message : "Error al guardar los cambios")
        }, 3000)
      }
      
      // If the role was changed to admin, log it
      const wasRoleChanged = originalMiembro.current && originalMiembro.current.role !== miembro.role;
      if (wasRoleChanged && miembro.role === 'admin') {
        console.log(`User ${miembro.name} (${miembro.user_uuid}) was promoted to admin role`);
      }
      
      setSuccess("Los cambios se han guardado correctamente")
      setIsEditing(false)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error) {
      console.error("Error saving user data:", error)
      setError(error instanceof Error ? error.message : "Error al guardar los cambios")
    } finally {
      setSaving(false)
    }
  }

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!miembro) return;
    
    try {
      setSaving(true)
      
      // Delete miembro data
      const { error } = await supabase
        .from('miembros')
        .delete()
        .eq('user_uuid', miembro.user_uuid!)
      
      if (error) {
        throw new Error("Error al eliminar el miembro: " + error.message)
      }
      
      setSuccess("El miembro ha sido eliminado correctamente")
      
      // Redirect to users list after 2 seconds
      setTimeout(() => {
        router.push("/admin/users")
      }, 2000)
    } catch (error) {
      console.error("Error deleting user:", error)
      setError(error instanceof Error ? error.message : "Error al eliminar el miembro")
      setSaving(false)
    }
  }

  // Handle setting infinite subscription
  const handleSetInfiniteSubscription = async () => {
    if (!miembro) return;
    
    try {
      setSaving(true)
      
      // Set subscription to active with a special plan indicating it's infinite
      const { error } = await supabase
        .from('miembros')
        .update({
          subscription_status: 'active',
          subscription_plan: 'infinite', // Special plan type that indicates permanent subscription
          subscription_updated_at: new Date().toISOString()
        })
        .eq('user_uuid', miembro.user_uuid!)
      
      if (error) {
        throw new Error("Error al establecer la suscripción infinita: " + error.message)
      }
      
      // Update local state
      setMiembro({
        ...miembro,
        subscription_status: 'active',
        subscription_plan: 'infinite',
        subscription_updated_at: new Date().toISOString()
      })
      
      setSuccess("La suscripción infinita se ha establecido correctamente")
      setInfiniteSubscriptionDialogOpen(false)
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error) {
      console.error("Error setting infinite subscription:", error)
      setError(error instanceof Error ? error.message : "Error al establecer la suscripción infinita")
    } finally {
      setSaving(false)
    }
  }

  // Handle making user an admin
  const handleMakeAdmin = async () => {
    if (!miembro) return;
    
    try {
      setSaving(true)
      
      // Update the role to admin
      const { error } = await supabase
        .from('miembros')
        .update({
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('user_uuid', miembro.user_uuid!)
      
      if (error) {
        throw new Error("Error al establecer el rol de administrador: " + error.message)
      }
      
      // Update local state
      setMiembro({
        ...miembro,
        role: 'admin'
      })
      
      setSuccess("El usuario ahora es administrador")
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error) {
      console.error("Error making user admin:", error)
      setError(error instanceof Error ? error.message : "Error al establecer el rol de administrador")
    } finally {
      setSaving(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "d 'de' MMMM 'de' yyyy", { locale: es });
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

  // Show loading state while fetching user data
  if (loading) {
    return (
      <div className="container mx-auto py-10 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos del usuario...</p>
        </div>
      </div>
    )
  }

  // Show error state if user not found
  if (!miembro) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "No se encontró el miembro solicitado"}
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => router.push("/admin/users")}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista de usuarios
        </Button>
      </div>
    )
  }

  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <Button 
            variant="outline" 
            onClick={() => router.push("/admin/users")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la lista de usuarios
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            {miembro.name} {miembro.apellido1} {miembro.apellido2 || ''}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant={miembro.role === 'admin' ? "default" : "outline"}>
              {miembro.role === 'admin' ? 'Administrador' : 'Usuario'}
            </Badge>
            <Badge 
              variant={miembro.subscription_status === 'active' ? "default" : "outline"}
              className={miembro.subscription_status === 'active' ? "bg-green-600" : ""}
            >
              {miembro.subscription_status === 'active' ? 'Suscripción Activa' : 'Sin Suscripción'}
            </Badge>
            {miembro.subscription_plan === 'infinite' && miembro.subscription_status === 'active' && (
              <Badge className="bg-blue-600">
                <Infinity className="h-3 w-3 mr-1" />
                Suscripción Permanente
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setIsEditing(true)}
              disabled={saving}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar Perfil
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Datos Personales</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Suscripción</span>
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Cuenta</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Personal Data Tab */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Datos personales del miembro de la Peña Lorenzo Sanz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input 
                    id="name" 
                    value={miembro.name || ''} 
                    onChange={(e) => setMiembro({...miembro, name: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido1">Primer Apellido</Label>
                  <Input 
                    id="apellido1" 
                    value={miembro.apellido1 || ''} 
                    onChange={(e) => setMiembro({...miembro, apellido1: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido2">Segundo Apellido</Label>
                  <Input 
                    id="apellido2" 
                    value={miembro.apellido2 || ''} 
                    onChange={(e) => setMiembro({...miembro, apellido2: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={miembro.email || ''} 
                    onChange={(e) => setMiembro({...miembro, email: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input 
                    id="telefono" 
                    value={miembro.telefono || ''} 
                    onChange={(e) => setMiembro({...miembro, telefono: e.target.value ? Number(e.target.value) : 0})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI/Pasaporte</Label>
                  <Input 
                    id="dni" 
                    value={miembro.dni_pasaporte || ''} 
                    onChange={(e) => setMiembro({...miembro, dni_pasaporte: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                  <Input 
                    id="fecha_nacimiento" 
                    type="date"
                    value={miembro.fecha_nacimiento ? miembro.fecha_nacimiento.substring(0, 10) : ''} 
                    onChange={(e) => setMiembro({...miembro, fecha_nacimiento: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Dirección</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="direccion">Dirección</Label>
                    <Input 
                      id="direccion" 
                      value={miembro.direccion || ''} 
                      onChange={(e) => setMiembro({...miembro, direccion: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="direccion_extra">Dirección Extra</Label>
                    <Input 
                      id="direccion_extra" 
                      value={miembro.direccion_extra || ''} 
                      onChange={(e) => setMiembro({...miembro, direccion_extra: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cp">Código Postal</Label>
                    <Input 
                        id="cp" 
                        value={miembro.cp || ''} 
                        onChange={(e) => setMiembro({...miembro, cp: e.target.value ? Number(e.target.value) : 0})}
                        disabled={!isEditing}
                      />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ciudad">Ciudad</Label>
                    <Input 
                      id="ciudad" 
                      value={miembro.poblacion || ''} 
                      onChange={(e) => setMiembro({...miembro, poblacion: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provincia">Provincia</Label>
                    <Input 
                      id="provincia" 
                      value={miembro.provincia || ''} 
                      onChange={(e) => setMiembro({...miembro, provincia: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pais">País</Label>
                    <Input 
                      id="pais" 
                      value={miembro.pais || ''} 
                      onChange={(e) => setMiembro({...miembro, pais: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Información del Real Madrid</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="es_socio_realmadrid" 
                    checked={miembro.es_socio_realmadrid || false}
                    onCheckedChange={(checked) => 
                      setMiembro({...miembro, es_socio_realmadrid: checked as boolean})
                    }
                    disabled={!isEditing}
                  />
                  <Label htmlFor="es_socio_realmadrid">Es socio del Real Madrid</Label>
                </div>
                {(miembro.es_socio_realmadrid && isEditing) && (
                  <div className="space-y-2">
                    <Label htmlFor="num_socio">Número de Socio</Label>
                    <Input 
                      id="num_socio" 
                      value={miembro.num_socio || ''} 
                      onChange={(e) => setMiembro({...miembro, num_socio: e.target.value ? Number(e.target.value) : null})}
                      disabled={!isEditing}
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="socio_carnet_madridista" 
                    checked={miembro.socio_carnet_madridista || false}
                    onCheckedChange={(checked) => 
                      setMiembro({...miembro, socio_carnet_madridista: checked as boolean})
                    }
                    disabled={!isEditing}
                  />
                  <Label htmlFor="socio_carnet_madridista">Tiene Carnet Madridista</Label>
                </div>
                {(miembro.socio_carnet_madridista && isEditing) && (
                  <div className="space-y-2">
                    <Label htmlFor="num_socio">Número de Carnet Madridista</Label>
                    <Input 
                      id="num_socio" 
                      value={miembro.num_carnet || ''} 
                      onChange={(e) => setMiembro({...miembro, num_carnet: e.target.value ? Number(e.target.value) : null})}
                      disabled={!isEditing}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Información de Suscripción</CardTitle>
              <CardDescription>
                Detalles de la suscripción del miembro
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Estado de Suscripción</Label>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      className={miembro.subscription_status === 'active' 
                        ? "bg-green-600" 
                        : "bg-yellow-600"
                      }
                    >
                      {miembro.subscription_status === 'active' ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </div>
                
                {miembro.subscription_status === 'active' && (
                  <div className="space-y-2">
                    <Label>Tipo de Suscripción</Label>
                    <div>
                      {miembro.subscription_plan === 'infinite' ? (
                        <div className="flex items-center">
                          <Infinity className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="text-blue-600 font-medium">Suscripción Permanente</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span>{miembro.subscription_plan || 'Estándar'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {miembro.redsys_token && (
                  <div className="space-y-2">
                    <Label>Token de pago (RedSys)</Label>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {miembro.redsys_token}
                      </code>
                    </div>
                  </div>
                )}
                
                {miembro.last_four && (
                  <div className="space-y-2">
                    <Label>Últimos 4 dígitos de tarjeta</Label>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">**** **** **** {miembro.last_four}</span>
                    </div>
                  </div>
                )}
                
                {miembro.subscription_updated_at && (
                  <div className="space-y-2">
                    <Label>Última Actualización de Suscripción</Label>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{formatDate(miembro.subscription_updated_at)}</span>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Acciones de Suscripción</h3>
                <div className="flex flex-wrap gap-4">
                  <Dialog open={infiniteSubscriptionDialogOpen} onOpenChange={setInfiniteSubscriptionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Infinity className="mr-2 h-4 w-4" />
                        Establecer Suscripción Permanente
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Establecer Suscripción Permanente</DialogTitle>
                        <DialogDescription>
                          Esta acción establecerá una suscripción que nunca expira para este miembro.
                          Normalmente se usa para miembros de la junta directiva o miembros honorarios.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-sm text-gray-500">
                          Miembro: <span className="font-medium text-gray-900">
                            {miembro.name} {miembro.apellido1} {miembro.apellido2 || ''}
                          </span>
                        </p>
                        {miembro.subscription_plan === 'infinite' && miembro.subscription_status === 'active' && (
                          <Alert className="mt-4 bg-blue-50 border-blue-200">
                            <Infinity className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                              Este miembro ya tiene una suscripción permanente.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setInfiniteSubscriptionDialogOpen(false)}
                          disabled={saving}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleSetInfiniteSubscription}
                          disabled={saving || (miembro.subscription_plan === 'infinite' && miembro.subscription_status === 'active')}
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <Infinity className="mr-2 h-4 w-4" />
                              Confirmar
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" onClick={() => window.alert('Funcionalidad en desarrollo')}>
                    <Clock className="mr-2 h-4 w-4" />
                    Extender Suscripción
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => window.alert('Funcionalidad en desarrollo')}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar Suscripción
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Información de Cuenta</CardTitle>
              <CardDescription>
                Detalles de la cuenta y permisos del usuario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>ID de Usuario</Label>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {miembro.user_uuid}
                    </code>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{miembro.email || 'No disponible'}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Fecha de Registro</Label>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{formatDate(miembro.created_at)}</span>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Permisos</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <Label htmlFor="admin-role" className="font-medium">Administrador</Label>
                      <p className="text-sm text-gray-500">
                        Los administradores pueden gestionar todos los aspectos de la web, incluyendo usuarios, contenido y configuración.
                      </p>
                    </div>
                    <Switch 
                      id="admin-role" 
                      checked={miembro.role === 'admin'}
                      onCheckedChange={(checked) => 
                        setMiembro({...miembro, role: checked ? 'admin' : 'user'})
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              <Separator className="my-6" />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Acciones de Cuenta</h3>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    variant="outline"
                    onClick={() => window.alert('Funcionalidad en desarrollo')}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Email
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => window.alert('Funcionalidad en desarrollo')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Generar Informe
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleMakeAdmin}
                    disabled={miembro.role === 'admin'}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Hacer Administrador
                  </Button>
                  
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar Miembro
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Eliminar Miembro</DialogTitle>
                        <DialogDescription>
                          Esta acción eliminará permanentemente al miembro de la base de datos.
                          Esta acción no se puede deshacer.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Advertencia</AlertTitle>
                          <AlertDescription>
                            Estás a punto de eliminar a {miembro.name} {miembro.apellido1} {miembro.apellido2 || ''}.
                            Todos sus datos serán eliminados permanentemente.
                          </AlertDescription>
                        </Alert>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setDeleteDialogOpen(false)}
                          disabled={saving}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={handleDeleteUser}
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                              Eliminando...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar Permanentemente
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
