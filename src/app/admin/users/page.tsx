"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Search, UserCheck, UserX, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { UserProfile } from "@/types/common"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const usersPerPage = 10

  // Use useCallback to memoize the fetchUsers function
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)

      // Get users from auth.users
      const {
        data: { users: authUsers },
        error: authError,
      } = await supabase.auth.admin.listUsers({
        page: currentPage,
        perPage: usersPerPage,
      })

      if (authError) throw authError

      // Get profiles from profiles table
      const { data: profiles, error: profilesError } = await supabase.from("miembros").select("*")

      if (profilesError) throw profilesError

      // Merge auth users with profiles
      const mergedUsers = authUsers.map((authUser) => {
        const profile = profiles.find((p) => p.id === authUser.id) || {}
        return {
          ...authUser,
          ...profile,
        }
      })

      // Apply search filter if query exists
      let filteredUsers = mergedUsers
      if (searchQuery) {
        filteredUsers = mergedUsers.filter(
          (user) =>
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.user_metadata?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      }

      setUsers(filteredUsers)
      setTotalPages(Math.ceil(filteredUsers.length / usersPerPage))
      setLoading(false)
    } catch (error) {
      console.error("Error fetching users:", error)
      setError(error instanceof Error ? error.message : "Failed to load users")
      setLoading(false)
    }
  }, [currentPage, searchQuery, usersPerPage])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase.from("miembros").update({ role }).eq("id", userId)

      if (error) throw error

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

