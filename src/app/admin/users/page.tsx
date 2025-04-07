"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Users, Search, UserCheck, UserX, MoreHorizontal, ChevronLeft, ChevronRight, 
  AlertCircle, UserCog, Mail, User, Shield
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"

// Add route segment config to mark this route as dynamic
export const dynamic = 'force-dynamic'

// Define types for both tables
interface MiembroUser {
  id: string;
  user_uuid?: string;
  email?: string;
  created_at?: string;
  role?: string;
  subscription_status?: string;
  name?: string;
  apellido1?: string;
  apellido2?: string | null;
  telefono?: number;
  dni_pasaporte?: string;
  es_socio_realmadrid?: boolean;
  num_socio?: number | null;
  user_metadata?: {
    name?: string;
  };
}

interface AuthUser {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  confirmed_at?: string | null;
  role?: string | null;
  banned?: boolean;
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [miembros, setMiembros] = useState<MiembroUser[]>([])
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAuthUsers, setLoadingAuthUsers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [authSearchQuery, setAuthSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [authCurrentPage, setAuthCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [authTotalPages, setAuthTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [authTotalCount, setAuthTotalCount] = useState(0)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState("miembros")
  const usersPerPage = 10

  // Check if user is admin on client side
  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          console.error("Authentication error:", userError)
          router.push("/login?redirect=/admin/users")
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

  // Fetch miembros directly from Supabase
  const fetchMiembros = useCallback(async () => {
    if (!isAdmin || authChecking) return;
    
    try {
      setLoading(true)

      // Build query for miembros
      let query = supabase
        .from('miembros')
        .select('*, user:user_uuid(id, email, created_at)', { count: 'exact' });
      
      // Apply search filter if query exists
      if (searchQuery.trim()) {
        query = query.or(
          `name.ilike.%${searchQuery.trim()}%,` +
          `apellido1.ilike.%${searchQuery.trim()}%,` +
          `email.ilike.%${searchQuery.trim()}%,` +
          `dni_pasaporte.ilike.%${searchQuery.trim()}%`
        );
      }
      
      // Apply pagination
      const from = (currentPage - 1) * usersPerPage;
      const to = from + usersPerPage - 1;
      
      // Execute query
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) {
        throw new Error("Failed to fetch miembros: " + error.message)
      }

      // Transform the data to match MiembroUser structure
      const transformedUsers: MiembroUser[] = data?.map(miembro => ({
        id: miembro.user?.id || miembro.user_uuid,
        user_uuid: miembro.user_uuid,
        email: miembro.email || miembro.user?.email || '',
        created_at: miembro.user?.created_at || miembro.created_at,
        role: miembro.role || 'user',
        subscription_status: miembro.subscription_status || 'inactive',
        user_metadata: {
          name: miembro.name || 'Sin nombre'
        },
        name: miembro.name,
        apellido1: miembro.apellido1,
        apellido2: miembro.apellido2,
        telefono: miembro.telefono,
        dni_pasaporte: miembro.dni_pasaporte,
        es_socio_realmadrid: miembro.es_socio_realmadrid,
        num_socio: miembro.num_socio
      })) || [];

      setMiembros(transformedUsers)
      setTotalCount(count || 0)
      setTotalPages(Math.ceil((count || 0) / usersPerPage))
      setError(null)
    } catch (error) {
      console.error("Error fetching miembros:", error)
      setError(error instanceof Error ? error.message : "Failed to load miembros")
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, usersPerPage, isAdmin, authChecking])

  // Fetch auth users directly from Supabase
  const fetchAuthUsers = useCallback(async () => {
    if (!isAdmin || authChecking) return;
    
    try {
      setLoadingAuthUsers(true)

      // Use the rpc function to access auth users
      // First, get count of all users for pagination
      const { data: countData, error: countError } = await supabase
        .rpc('get_auth_users_count');
      
      if (countError) {
        throw new Error("Failed to count auth users: " + countError.message);
      }
      
      // Now get the actual users with pagination
      const { data, error } = await supabase
        .rpc('get_auth_users', {
          search_query: authSearchQuery.trim(),
          page_number: authCurrentPage,
          page_size: usersPerPage
        });
      
      if (error) {
        throw new Error("Failed to fetch auth users: " + error.message);
      }

      interface AuthUserRaw {
        id: string;
        email: string | null;
        created_at: string;
        last_sign_in_at?: string | null;
        email_confirmed_at?: string | null;
        confirmed_at?: string | null;
        role?: string | null;
      }

      // Transform the data to match AuthUser structure with proper typing
      const transformedUsers: AuthUser[] = data?.map((user: AuthUserRaw) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        confirmed_at: user.email_confirmed_at || user.confirmed_at,
        role: user.role,
        banned: false // Default to false since the column doesn't exist
      })) || [];

      setAuthUsers(transformedUsers)
      setAuthTotalCount(countData || 0)
      setAuthTotalPages(Math.ceil((countData || 0) / usersPerPage))
      setAuthError(null)
    } catch (error) {
      console.error("Error fetching auth users:", error)
      setAuthError(error instanceof Error ? error.message : "Failed to load auth users")
    } finally {
      setLoadingAuthUsers(false)
    }
  }, [authCurrentPage, authSearchQuery, usersPerPage, isAdmin, authChecking])

  // Fetch users when dependencies change
  useEffect(() => {
    if (isAdmin && !authChecking) {
      if (activeTab === "miembros") {
        fetchMiembros()
      } else {
        fetchAuthUsers()
      }
    }
  }, [fetchMiembros, fetchAuthUsers, isAdmin, authChecking, activeTab])

  // Add debounced search to improve performance for miembros
  useEffect(() => {
    if (!isAdmin || authChecking || activeTab !== "miembros") return;
    
    const timer = setTimeout(() => {
      fetchMiembros()
    }, 300) // 300ms debounce delay
    
    return () => clearTimeout(timer)
  }, [searchQuery, fetchMiembros, isAdmin, authChecking, activeTab])

  // Add debounced search to improve performance for auth users
  useEffect(() => {
    if (!isAdmin || authChecking || activeTab !== "auth") return;
    
    const timer = setTimeout(() => {
      fetchAuthUsers()
    }, 300) // 300ms debounce delay
    
    return () => clearTimeout(timer)
  }, [authSearchQuery, fetchAuthUsers, isAdmin, authChecking, activeTab])

  // Update user role directly with Supabase
  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      // Update the role in the miembros table
      const { error } = await supabase
        .from('miembros')
        .update({ role })
        .eq('user_uuid', userId)

      if (error) {
        throw new Error("Failed to update user role: " + error.message)
      }

      // Refresh the users list
      fetchMiembros()
    } catch (error) {
      console.error("Error updating user role:", error)
      setError(error instanceof Error ? error.message : "Failed to update user role")
    }
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
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
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No tienes permisos para acceder a esta página</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra los usuarios de la Peña Lorenzo Sanz</p>
        </div>
      </div>

      <Tabs defaultValue="miembros" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="miembros" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            <span>Miembros</span>
          </TabsTrigger>
          <TabsTrigger value="auth" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Usuarios Auth</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Miembros Tab Content */}
        <TabsContent value="miembros">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, apellido, email o DNI..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando miembros...</p>
              </div>
            ) : miembros.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  {searchQuery
                    ? `No se encontraron miembros que coincidan con "${searchQuery}"`
                    : "No hay miembros registrados aún"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Nombre</th>
                        <th className="text-left py-3 px-4 hidden md:table-cell">Email</th>
                        <th className="text-left py-3 px-4 hidden md:table-cell">Rol</th>
                        <th className="text-left py-3 px-4 hidden md:table-cell">Suscripción</th>
                        <th className="text-left py-3 px-4 hidden md:table-cell">Registro</th>
                        <th className="text-right py-3 px-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {miembros.map((miembro) => (
                        <tr key={miembro.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium">
                              {miembro.name} {miembro.apellido1} {miembro.apellido2 || ''}
                            </div>
                            <div className="text-sm text-gray-500 md:hidden">{miembro.email}</div>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">{miembro.email}</td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                miembro.role === "admin" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {miembro.role || "usuario"}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                miembro.subscription_status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {miembro.subscription_status === "active" ? "Activa" : "Inactiva"}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            {formatDate(miembro.created_at || null)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Más acciones</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => router.push(`/admin/users/edit/${miembro.user_uuid || miembro.id}`)}>
                                    <User className="h-4 w-4 mr-2" />
                                    Ver Detalles
                                  </DropdownMenuItem>
                                  {miembro.role !== "admin" ? (
                                    <DropdownMenuItem onClick={() => handleUpdateUserRole(miembro.user_uuid || miembro.id, "admin")}>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Hacer Administrador
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleUpdateUserRole(miembro.user_uuid || miembro.id, "user")}>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Quitar Administrador
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Miembros */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-500">
                      Mostrando {(currentPage - 1) * usersPerPage + 1} a{" "}
                      {Math.min(currentPage * usersPerPage, totalCount)} de {totalCount} miembros
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Anterior</span>
                      </Button>
                      <div className="text-sm">
                        Página {currentPage} de {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Siguiente</span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
        
        {/* Auth Users Tab Content */}
        <TabsContent value="auth">
          {authError && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por email..."
                  className="pl-10"
                  value={authSearchQuery}
                  onChange={(e) => setAuthSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loadingAuthUsers ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-gray-600">Cargando usuarios...</p>
              </div>
            ) : authUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  {authSearchQuery
                    ? `No se encontraron usuarios que coincidan con "${authSearchQuery}"`
                    : "No hay usuarios registrados aún"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4 hidden md:table-cell">Estado</th>
                        <th className="text-left py-3 px-4 hidden md:table-cell">Último Acceso</th>
                        <th className="text-left py-3 px-4 hidden md:table-cell">Registro</th>
                        <th className="text-right py-3 px-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {authUsers.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="font-medium">{user.email}</div>
                            <div className="text-sm text-gray-500 md:hidden">
                              {user.confirmed_at ? "Confirmado" : "Pendiente"}
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                user.confirmed_at 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {user.confirmed_at ? "Confirmado" : "Pendiente"}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            {formatDate(user.last_sign_in_at || null)}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            {formatDate(user.created_at)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Más acciones</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => window.alert('Funcionalidad en desarrollo')}>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Enviar Email
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => window.alert('Funcionalidad en desarrollo')}>
                                    {user.banned ? (
                                      <>
                                        <UserCheck className="h-4 w-4 mr-2" />
                                        Desbloquear Usuario
                                      </>
                                    ) : (
                                      <>
                                        <UserX className="h-4 w-4 mr-2" />
                                        Bloquear Usuario
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination for Auth Users */}
                {authTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-500">
                      Mostrando {(authCurrentPage - 1) * usersPerPage + 1} a{" "}
                      {Math.min(authCurrentPage * usersPerPage, authTotalCount)} de {authTotalCount} usuarios
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuthCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={authCurrentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Anterior</span>
                      </Button>
                      <div className="text-sm">
                        Página {authCurrentPage} de {authTotalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuthCurrentPage((prev) => Math.min(prev + 1, authTotalPages))}
                        disabled={authCurrentPage === authTotalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                        <span className="sr-only">Siguiente</span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}