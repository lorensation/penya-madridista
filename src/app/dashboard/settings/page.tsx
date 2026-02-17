"use client"

import type React from "react"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { 
  Avatar,
  AvatarImage,
  AvatarFallback
} from "@/components/ui/avatar" 
import { Badge } from "@/components/ui/badge"
import type { UserProfile, MemberData } from "@/types/common"
import Link from "next/link"
import { 
  AlertCircle,
  UserPlus, 
  LockKeyhole, 
  Save, 
  User, 
  Settings,
  Shield,
  Bell,
  LogOut,
  Loader2,
  Check,
  RefreshCw
} from "lucide-react"

interface FormData {
  name: string
  apellido1: string
  apellido2: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  province: string
  country: string
  emailNotifications: boolean
  marketingEmails: boolean
}

// Define a proper interface for user data
interface UserData {
  id: string
  email: string
  name?: string | null
  is_member?: boolean
  created_at?: string
  updated_at?: string | null
  [key: string]: unknown // For any other properties that might exist
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [memberData, setMemberData] = useState<MemberData | null>(null)
  const [isUser, setIsUser] = useState<boolean>(false)
  const [isMiembro, setIsMiembro] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("perfil")
  const [editTable, setEditTable] = useState<string>("users") // Can be "users" or "miembros"
  const [passwordResetSent, setPasswordResetSent] = useState(false)
  const [sessionClosed, setSessionClosed] = useState(false)

  const supabase = createBrowserSupabaseClient()

  const [formData, setFormData] = useState<FormData>({
    name: "",
    apellido1: "",
    apellido2: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    province: "",
    country: "",
    emailNotifications: true,
    marketingEmails: true,
  })

  // Update form with user data from users table - wrapped in useCallback
  const updateFormWithUserData = useCallback((userRecord: UserData) => {
    setFormData(prevData => ({
      ...prevData,
      name: userRecord.name || "",
      email: userRecord.email || "",
    }))
  }, []);

  // Update form with member data - wrapped in useCallback
  const updateFormWithMemberData = useCallback((memberRecord: MemberData) => {
    setFormData(prevData => ({
      ...prevData,
      name: memberRecord.name || prevData.name || "",
      apellido1: memberRecord.apellido1 || "",
      apellido2: memberRecord.apellido2 || "",
      phone: memberRecord.telefono?.toString() || "",
      address: memberRecord.direccion || "",
      city: memberRecord.poblacion || "",
      postalCode: memberRecord.cp?.toString() || "",
      province: memberRecord.provincia || "",
      country: memberRecord.pais || "",
      emailNotifications: memberRecord.email_notifications !== false,
      marketingEmails: memberRecord.marketing_emails !== false,
    }))
  }, []);

  // Load member data from miembros table - wrapped in useCallback
  const loadMemberDataFromTable = useCallback(async (userId: string) => {
    try {
      // Try to get member data using user_uuid
      const { data: memberRecord, error: memberError } = await supabase
        .from("miembros")
        .select("*")
        .eq("user_uuid", userId)
        .single()

      if (memberError) {
        // Try with auth_id instead
        const { data: memberDataById } = await supabase
          .from("miembros")
          .select("*")
          .eq("id", userId)
          .single()
        
          if (memberDataById !== null) {
            setMemberData(memberDataById)
            updateFormWithMemberData(memberDataById)
            return true
          } else {
            console.log("both fetches didnt work")
          }
        
      } else {
        setMemberData(memberRecord)
        updateFormWithMemberData(memberRecord)
        return true
      }
    } catch (error) {
      console.error("Error loading member data:", error)
      return false
    }
  }, [supabase, updateFormWithMemberData]);
  
  const loadUserData = useCallback(async () => {
    try {
      // Get the current user from auth
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!userData?.user) {
        router.push("/login")
        return
      }

      // Convert Supabase User to UserProfile
      const userProfile: UserProfile = {
        ...userData.user,
        // Add any additional properties needed
      }

      setUser(userProfile)

      // Step 2: Check if user exists in "users" table
      const { data: publicUserData, error: publicUserError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userData.user.id)
        .single()

      if (publicUserError) {
        // If the user doesn't exist in the users table, create a basic record
        if (publicUserError.code === "PGRST116") {
          const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert({
              id: userData.user.id,
              email: userData.user.email!,
              name: userData.user.user_metadata?.name || "",
              is_member: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
          
          if (insertError) {
            console.error("Error creating user record:", insertError)
            setIsUser(false)
          } else {
            setUserData(newUser?.[0] || null)
            setIsUser(true)
          }
        } else {
          console.error("Error fetching user data:", publicUserError)
          setIsUser(false)
        }
      } else {
        // User exists in the users table
        setUserData(publicUserData)
        setIsUser(true)
        
        // Set basic form data from users table
        updateFormWithUserData(publicUserData)

        // Step 3: Check if the user is a member
        setIsMiembro(publicUserData.is_member === true)

        // If user is marked as member, try to get member data
        if (publicUserData.is_member) {
          const memberDataFound = await loadMemberDataFromTable(userData.user.id)
          
          // If user is marked as member but no member data found in miembros table,
          // create a basic member record
          if (!memberDataFound) {
            console.log("User marked as member but no member data found, creating basic member record")
            const newMemberData = {
              user_uuid: userData.user.id,
              email: userData.user.email || "",
              name: publicUserData.name || userData.user.user_metadata?.name || "",
              email_notifications: true,
              marketing_emails: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              es_socio_realmadrid: false,
              fecha_nacimiento: "1990-01-01",
              socio_carnet_madridista: false,
              telefono: 0,
            }
            
            try {
              const { data: newMember, error: createError } = await supabase
                .from("miembros")
                .insert(newMemberData)
                .select()
                
              if (createError) {
                console.error("Error creating missing member record:", createError)
              } else if (newMember?.[0]) {
                setMemberData(newMember[0])
                updateFormWithMemberData(newMember[0])
              }
            } catch (error) {
              console.error("Error creating missing member record:", error)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error in loadUserData:", error)
      setError("No se pudo cargar la información del usuario. Por favor, inténtalo de nuevo más tarde.")
    } finally {
      setLoading(false)
    }
  }, [router, supabase, updateFormWithUserData, loadMemberDataFromTable, updateFormWithMemberData])
  
  // Check authentication status and redirect if not logged in
  useEffect(() => {
    async function checkAuthentication() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          console.error("Not authenticated", sessionError)
          // Redirect to fallback UI for login with return URL
          router.push(`/login?redirect=${encodeURIComponent('/dashboard/settings')}`)
          return false
        }
        
        return true
      } catch (error) {
        console.error("Error checking authentication:", error)
        router.push(`/login?redirect=${encodeURIComponent('/dashboard/settings')}`)
        return false
      }
    }
    
    checkAuthentication().then((isAuthenticated) => {
      if (isAuthenticated) {
        loadUserData()
      }
    })
  }, [router, supabase, loadUserData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  // Handle basic user profile updates (users table)
  const updateUserProfile = async () => {
    if (!user) {
      throw new Error("Usuario no encontrado")
    }

    // Update user metadata in Auth
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        name: formData.name,
      },
    })

    if (updateError) throw updateError

    // Update user in the users table
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        name: formData.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (userUpdateError) {
      throw userUpdateError
    }
    
    // Refresh user data after update
    const { data: refreshedUserData, error: refreshError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single()
      
    if (refreshError) {
      console.error("Error refreshing user data:", refreshError)
    } else if (refreshedUserData) {
      setUserData(refreshedUserData)
      
      // Update the form data to reflect the changes
      updateFormWithUserData(refreshedUserData)
      
      // Also update the Auth session to ensure it's consistent
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // Force refresh the user session data
        await supabase.auth.refreshSession()
        
        // Get the updated user to ensure we have the latest metadata
        const { data: { user: refreshedUser } } = await supabase.auth.getUser()
        if (refreshedUser) {
          setUser({
            ...user,
            user_metadata: {
              ...user.user_metadata,
              name: formData.name
            }
          })
        }
      }
    }
    
    return "Información básica actualizada correctamente"
  }

  // Handle member profile updates (miembros table)
  const updateMemberProfile = async () => {
    if (!user || !isMiembro) {
      throw new Error("Usuario no encontrado o no es miembro")
    }

    // Update miembros table with all fields
    const updateData = {
      name: formData.name,
      apellido1: formData.apellido1,
      apellido2: formData.apellido2,
      telefono: formData.phone ? Number.parseInt(formData.phone, 10) : undefined,
      direccion: formData.address,
      poblacion: formData.city,
      cp: formData.postalCode ? Number.parseInt(formData.postalCode, 10) : null,
      provincia: formData.province,
      pais: formData.country,
    }

    // Try user_uuid first
    let updated = false;
    if (memberData?.user_uuid) {
      const { error: updateError } = await supabase
        .from("miembros")
        .update(updateData)
        .eq("user_uuid", memberData.user_uuid)

      if (!updateError) updated = true;
    }

    // If not updated yet, try auth_id
    if (!updated && memberData?.auth_id) {
      const { error: updateError } = await supabase
        .from("miembros")
        .update(updateData)
        .eq("auth_id", memberData.auth_id)

      if (!updateError) updated = true;
    }

    // If still not updated, try id as last resort
    if (!updated && memberData?.id) {
      const { error: updateError } = await supabase
        .from("miembros")
        .update(updateData)
        .eq("id", memberData.id)

      if (updateError) throw updateError;
    }
    
    // Refresh member data after update
    const refreshedMember = await loadMemberDataFromTable(user.id)
    
    // If member profile was updated, also update basic user info for consistency
    if (refreshedMember) {
      // Update basic user data to keep it in sync
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          name: formData.name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
      
      if (!userUpdateError) {
        // Refresh user data in the state
        const { data: refreshedUserData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()
          
        if (refreshedUserData) {
          setUserData(refreshedUserData)
          updateFormWithUserData(refreshedUserData)
        }
      }
      
      // Update Auth user metadata
      await supabase.auth.updateUser({
        data: {
          name: formData.name,
        },
      })
      
      // Update Auth session
      await supabase.auth.refreshSession()
      
      // Update local user state
      const { data: { user: refreshedUser } } = await supabase.auth.getUser()
      if (refreshedUser) {
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            name: formData.name
          }
        })
      }
    }
    
    return "Información de miembro actualizada correctamente"
  }

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!user) {
        throw new Error("Usuario no encontrado")
      }
      
      let successMessage = "";
      
      // Call the appropriate update function based on selected edit table
      if (editTable === "users") {
        successMessage = await updateUserProfile();
      } else if (editTable === "miembros" && isMiembro) {
        successMessage = await updateMemberProfile();
      }
      
      setSuccess(successMessage);
    } catch (error: unknown) {
      console.error("Error updating profile:", error)
      setError(error instanceof Error ? error.message : "No se pudo actualizar la información")
    } finally {
      setSaving(false)
    }
  }

  const handleSubmitPreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!user) {
        throw new Error("Usuario no encontrado")
      }

      // If user is not a member yet, ask if they want to become one
      if (!isMiembro) {
        // Update users table to mark as member
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({
            is_member: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)

        if (userUpdateError) {
          throw userUpdateError
        }

        // Create a new member record
        const newMemberData = {
          user_uuid: user.id,
          email: user?.email || userData?.email || "",
          name: formData.name || user?.user_metadata?.name || "",
          email_notifications: formData.emailNotifications,
          marketing_emails: formData.marketingEmails,
          es_socio_realmadrid: false,
          fecha_nacimiento: "1990-01-01",
          socio_carnet_madridista: false,
          telefono: 0,
        }

        const { error: createMemberError } = await supabase
          .from("miembros")
          .insert(newMemberData)

        if (createMemberError) {
          throw createMemberError
        }

        // Update state
        setIsMiembro(true)
        
        // Refresh data
        await loadMemberDataFromTable(user.id)
        
        // Refresh user data
        const { data: refreshedUserData } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()
          
        if (refreshedUserData) {
          setUserData(refreshedUserData)
        }

        setSuccess("Te has convertido en miembro y tus preferencias han sido actualizadas correctamente")
        return
      }

      // If already a member, just update preferences
      // Try all possible ID fields for compatibility
      let updated = false;
      
      // Try user_uuid first
      if (memberData?.user_uuid) {
        const { error: updateError } = await supabase
          .from("miembros")
          .update({
            email_notifications: formData.emailNotifications,
            marketing_emails: formData.marketingEmails,
          })
          .eq("user_uuid", memberData.user_uuid)
          
        if (!updateError) updated = true;
      }
      
      // Try auth_id if not updated yet
      if (!updated && memberData?.auth_id) {
        const { error: updateError } = await supabase
          .from("miembros")
          .update({
            email_notifications: formData.emailNotifications,
            marketing_emails: formData.marketingEmails,
          })
          .eq("id", memberData.auth_id)
          
        if (!updateError) updated = true;
      }

      setSuccess("Preferencias de comunicación actualizadas correctamente")
      
      // Refresh member data
      await loadMemberDataFromTable(user.id)
    } catch (error: unknown) {
      console.error("Error updating preferences:", error)
      setError(error instanceof Error ? error.message : "No se pudieron actualizar las preferencias")
    } finally {
      setSaving(false)
    }
  }

  const handleSendPasswordReset = async () => {
    try {
      if (!user?.email) {
        throw new Error("No se pudo encontrar el correo electrónico asociado a tu cuenta")
      }

      setPasswordResetSent(false);
      // Clear any previous messages
      setError(null)
      setSuccess(null)
      setSaving(true);
      
      // Make sure we use the correct redirect URL for password reset
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setPasswordResetSent(true);
      setSuccess("Se ha enviado un correo electrónico con instrucciones para cambiar tu contraseña")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "No se pudo enviar el correo de recuperación")
    } finally {
      setSaving(false);
    }
  }

  const handleCloseOtherSessions = async () => {
    try {
      // Clear any previous messages
      setError(null)
      setSuccess(null)
      setSaving(true);
      
      const { error } = await supabase.auth.signOut({ scope: "others" })

      if (error) throw error
      
      setSessionClosed(true);
      setSuccess("Se han cerrado todas las demás sesiones activas en otros dispositivos")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "No se pudieron cerrar las otras sesiones")
    } finally {
      setSaving(false);
    }
  }

  // Reset success and error messages after a timeout
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [success, error])

  // UI for unauthenticated users
  if (!user && !loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Iniciar sesión es necesario</CardTitle>
            <CardDescription>
              Debes iniciar sesión o registrarte para acceder a la configuración de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-2 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500" />
              <p className="text-sm text-gray-500">
                Para gestionar tu perfil y preferencias, necesitas tener una cuenta y estar conectado.
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button 
                className="w-full transition-colors hover:bg-white hover:text-primary hover:border hover:border-black" 
                onClick={() => router.push("/login")}
              >
                <LockKeyhole className="mr-2 h-4 w-4" />
                Iniciar sesión
              </Button>
              <Button 
                variant="outline" 
                className="w-full transition-colors bg-white text-black border-black hover:bg-black hover:text-white hover:border hover:border-white"
                onClick={() => router.push("/register")}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Registrarse
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading UI
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tus datos...</p>
        </div>
      </div>
    )
  }

  // Main settings page UI for authenticated users
  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Configuración</h1>
          <p className="text-gray-500">Gestiona tu perfil, preferencias y seguridad</p>
        </div>
        {/* User avatar section */}
        <div className="flex items-center mt-4 md:mt-0">
          <Avatar className="h-14 w-14">
            <AvatarImage src={String(user?.user_metadata?.avatar_url || "")} />
            <AvatarFallback className="bg-gray-200 text-black border border-black rounded-full">
              {userData?.name ? userData.name.substring(0, 2).toUpperCase() : user?.email?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="ml-4">
            <p className="font-medium">{userData?.name || user?.user_metadata?.name || "Usuario"}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600 mt-0.5" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      
      {/* Status Cards */}
      <div className="flex flex-col md:flex-row gap-4">
        <Card className={`flex-1 ${isUser ? "border-green-200" : "border-red-200"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cuenta de Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isUser ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-sm">{isUser ? "Registrado" : "No registrado"}</span>
              {userData?.created_at && (
                <span className="text-xs text-gray-500 ml-2">
                  desde {new Date(userData.created_at).toLocaleDateString('es-ES')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className={`flex-1 ${isMiembro ? "border-green-200" : "border-yellow-200"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estado de Membresía</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isMiembro ? "bg-green-500" : "bg-yellow-500"}`}></div>
              <span className="text-sm">
                {isMiembro ? (
                  <>
                    <Badge className="mr-2" variant="outline">
                      {memberData?.subscription_status === "active" ? "Activa" : "Pendiente"}
                    </Badge>
                    {memberData?.subscription_plan && (
                      <Badge className="bg-primary/20 text-primary border-primary">
                        {memberData.subscription_plan}
                      </Badge>
                    )}
                  </>
                ) : "No es miembro"}
              </span>
            </div>
            {!isMiembro && (
              <div className="mt-2">
                <Link href="/membership" className="text-xs text-primary hover:underline">
                  Ver opciones de membresía →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!isMiembro && activeTab === "perfil" && editTable === "miembros" && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800">
            Algunas opciones de configuración requieren ser miembro. 
            <Link href="/membership" className="ml-2 font-medium underline">
              Hazte miembro ahora
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Table selection if user is in both tables */}
      {activeTab === "perfil" && (
        <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4 mb-4">
          <p className="text-sm text-gray-500">Editar datos de:</p>
          <div className="flex space-x-2">
            <Button 
              variant={editTable === "users" ? "default" : "outline"} 
              size="sm"
              onClick={() => setEditTable("users")}
              className="border-black"
            >
              <User className="h-4 w-4 mr-2" />
              Cuenta Básica
            </Button>
            <Button 
              variant={editTable === "miembros" ? "default" : "outline"} 
              size="sm"
              onClick={() => setEditTable("miembros")}
              disabled={!isMiembro}
              className="border-black"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Perfil Completo de Miembro
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="perfil" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="perfil" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            <span>Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="preferencias" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            <span>Comunicaciones</span>
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            <span>Seguridad</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab Content */}
        <TabsContent value="perfil" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isMiembro && editTable === "miembros" ? "Información de Miembro" : "Información Personal"}
              </CardTitle>
              <CardDescription>
                {isMiembro && editTable === "miembros" 
                  ? "Actualiza tu información de miembro y datos de contacto" 
                  : "Actualiza tu información personal básica"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {editTable === "miembros" ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apellido1">Primer Apellido</Label>
                        <Input id="apellido1" name="apellido1" value={formData.apellido1} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apellido2">Segundo Apellido (opcional)</Label>
                        <Input id="apellido2" name="apellido2" value={formData.apellido2} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Teléfono</Label>
                        <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Ciudad</Label>
                        <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Código Postal</Label>
                        <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="province">Provincia</Label>
                        <Input id="province" name="province" value={formData.province} onChange={handleChange} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">País</Label>
                        <Input id="country" name="country" value={formData.country} onChange={handleChange} />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre completo</Label>
                      <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico</Label>
                    <Input id="email" name="email" type="email" value={formData.email} disabled className="bg-gray-100" />
                    <p className="text-xs text-gray-500">
                      Para cambiar tu correo electrónico, contacta con el administrador
                    </p>
                  </div>
                  
                  {editTable === "miembros" ? null : null}
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="transition-colors hover:bg-white hover:text-primary hover:border hover:border-black" 
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar cambios
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          {/* Additional information if editing member profile */}
          {editTable === "miembros" && isMiembro && memberData?.subscription_status === "active" && (
            <Card>
              <CardHeader>
                <CardTitle>Información de Suscripción</CardTitle>
                <CardDescription>Estado de tu membresía y suscripción</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Estado de suscripción</p>
                    <Badge className="mt-1" variant={memberData.subscription_status === "active" ? "default" : "outline"}>
                      {memberData.subscription_status === "active" ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Plan</p>
                    <p className="text-sm mt-1">{memberData.subscription_plan || "Estándar"}</p>
                  </div>
                  
                  {memberData.subscription_updated_at && (
                    <div>
                      <p className="text-sm font-medium">Última actualización</p>
                      <p className="text-sm mt-1">
                        {new Date(memberData.subscription_updated_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  )}
                  
                  {memberData.subscription_id && (
                    <div>
                      <p className="text-sm font-medium">ID de suscripción</p>
                      <p className="text-sm mt-1 font-mono">{memberData.subscription_id.substring(0, 12)}...</p>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/membership")} className="transition-all border-black text-black bg-white hover:bg-black hover:text-white">
                    <Settings className="mr-2 h-4 w-4" />
                    Gestionar membresía
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preferences Tab Content */}
        <TabsContent value="preferencias">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de Comunicación</CardTitle>
              <CardDescription>
                {isMiembro 
                  ? "Gestiona cómo quieres recibir comunicaciones de la Peña Lorenzo Sanz" 
                  : "Configura tus preferencias de comunicación"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitPreferences} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Notificaciones por correo</Label>
                      <p className="text-sm text-gray-500">
                        Recibe notificaciones sobre eventos, actualizaciones de membresía y más
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={formData.emailNotifications}
                      onCheckedChange={(checked) => handleSwitchChange("emailNotifications", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="marketingEmails">Correos promocionales</Label>
                      <p className="text-sm text-gray-500">Recibe ofertas especiales, promociones y novedades</p>
                    </div>
                    <Switch
                      id="marketingEmails"
                      checked={formData.marketingEmails}
                      onCheckedChange={(checked) => handleSwitchChange("marketingEmails", checked)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className={`transition-all hover:bg-white hover:text-primary hover:border hover:border-black ${!isMiembro ? "bg-primary" : ""}`} 
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : !isMiembro ? (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Convertirme en miembro
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar preferencias
                      </>
                    )}
                  </Button>
                </div>
                
                {!isMiembro && (
                  <p className="text-sm text-gray-500 mt-2">
                    Al convertirte en miembro, se creará un registro en la base de datos con estas preferencias.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab Content */}
        <TabsContent value="seguridad">
          <Card>
            <CardHeader>
              <CardTitle>Seguridad de la Cuenta</CardTitle>
              <CardDescription>Administra la seguridad y el acceso a tu cuenta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Cambiar Contraseña</h3>
                  <p className="text-sm text-gray-500">
                    Para cambiar tu contraseña, te enviaremos un correo electrónico con instrucciones.
                    Haz clic en el enlace del correo para establecer una nueva contraseña.
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="password-reset">Solicitar cambio de contraseña</Label>
                    <p className="text-sm text-gray-500">
                      Se enviará un email de recuperación a: {user?.email}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    id="password-reset"
                    className="transition-all bg-black text-white hover:bg-white hover:text-primary hover:border hover:border-black"
                    onClick={handleSendPasswordReset}
                    disabled={saving || passwordResetSent}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : passwordResetSent ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Enviado
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Cambiar contraseña
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Gestión de Sesiones</h3>
                  <p className="text-sm text-gray-500">
                    Cierra todas tus sesiones activas en otros dispositivos para mayor seguridad.
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="close-sessions">Cerrar otras sesiones</Label>
                    <p className="text-sm text-gray-500">
                      Mantiene activa solo esta sesión
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    id="close-sessions"
                    className="transition-all border-red-600 bg-red-500 text-white hover:text-red-600 hover:bg-white"
                    onClick={handleCloseOtherSessions}
                    disabled={saving || sessionClosed}
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : sessionClosed ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Sesiones cerradas
                      </>
                    ) : (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar otras sesiones
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Cerrar Sesión</h3>
                  <p className="text-sm text-gray-500">
                    Cierra tu sesión actual en este dispositivo
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  className="transition-all border-red-600 bg-red-500 text-white hover:text-red-600 hover:bg-white"
                  onClick={async () => {
                    const { error } = await supabase.auth.signOut();
                    if (!error) {
                      router.push("/");
                    }
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </Button>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Datos Personales</h3>
                  <p className="text-sm text-gray-500">
                    Si deseas eliminar tus datos personales, por favor contacta con el administrador.
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  className="transition-all border-purple-600 text-black hover:bg-purple-500 hover:text-white"
                  onClick={() => {
                    window.location.href = `mailto:${"info@lorenzosanz.com"}?subject=Solicitud de eliminación de cuenta&body=Hola, me gustaría solicitar la eliminación de mi cuenta con el correo: ${user?.email}`
                  }}
                >
                  Contactar Administrador
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}