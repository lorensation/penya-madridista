"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Search, UserCheck, UserX, MoreHorizontal, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { supabase } from "@/lib/supabase-client"
import type { UserProfile } from "@/types/common"

// Add route segment config to mark this route as dynamic
export const dynamic = 'force-dynamic'

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [authChecking, setAuthChecking] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
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
          .eq('id', user.id)
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

  // Use useCallback to memoize the fetchUsers function
  const fetchUsers = useCallback(async () => {
    if (!isAdmin || authChecking) return;
    
    try {
      setLoading(true)

      // Make a server request to fetch users instead of directly using admin API
      const response = await fetch("/api/admin/users?page=" + currentPage + "&perPage=" + usersPerPage)

      if (!response.ok) {
        throw new Error("Failed to fetch users: " + response.statusText)
      }

      const data = await response.json()

      // Apply search filter if query exists
      let filteredUsers = data.users || []
      if (searchQuery) {
        filteredUsers = filteredUsers.filter(
          (user: UserProfile) =>
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.user_metadata?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      }

      setUsers(filteredUsers)
      setTotalPages(Math.ceil(data.total / usersPerPage))
      setLoading(false)
    } catch (error) {
      console.error("Error fetching users:", error)
      setError(error instanceof Error ? error.message : "Failed to load users")
      setLoading(false)
    }
  }, [currentPage, searchQuery, usersPerPage, isAdmin, authChecking])

  useEffect(() => {
    if (isAdmin && !authChecking) {
      fetchUsers()
    }
  }, [fetchUsers, isAdmin, authChecking])

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      const response = await fetch("/api/admin/users/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, role }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user role")
      }

      // Refresh the users list
      fetchUsers()
    } catch (error) {
      console.error("Error updating user role:", error)
      setError(error instanceof Error ? error.message : "Failed to update user role")
    }
  }

  const formatDate = (dateString: string) => {
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
              placeholder="Buscar usuarios..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando usuarios...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? `No se encontraron usuarios que coincidan con "${searchQuery}"`
                : "No hay usuarios registrados aún"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Usuario</th>
                    <th className="text-left py-3 px-4 hidden md:table-cell">Email</th>
                    <th className="text-left py-3 px-4 hidden md:table-cell">Rol</th>
                    <th className="text-left py-3 px-4 hidden md:table-cell">Suscripción</th>
                    <th className="text-left py-3 px-4 hidden md:table-cell">Registro</th>
                    <th className="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{user.user_metadata?.name || "Sin nombre"}</div>
                        <div className="text-sm text-gray-500 md:hidden">{user.email}</div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">{user.email}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.role === "admin" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.role || "usuario"}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.subscription_status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {user.subscription_status === "active" ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {user.created_at ? formatDate(user.created_at) : "N/A"}
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
                              {user.role !== "admin" ? (
                                <DropdownMenuItem onClick={() => handleUpdateUserRole(user.id, "admin")}>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Hacer Administrador
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleUpdateUserRole(user.id, "user")}>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  Mostrando {(currentPage - 1) * usersPerPage + 1} a{" "}
                  {Math.min(currentPage * usersPerPage, users.length)} de {users.length} usuarios
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
    </div>
  )
}