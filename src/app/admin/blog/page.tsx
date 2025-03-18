"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Plus, Search, Edit, Trash2, Eye, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function AdminBlogPage() {
  // Remove this line
  // const router = useRouter();
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const postsPerPage = 10

  useEffect(() => {
    fetchPosts()
  }, [currentPage, searchQuery])

  const fetchPosts = async () => {
    try {
      setLoading(true)

      let query = supabase.from("posts").select("*", { count: "exact" })

      // Apply search filter if query exists
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
      }

      // Apply pagination
      const from = (currentPage - 1) * postsPerPage
      const to = from + postsPerPage - 1

      const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to)

      if (error) throw error

      setPosts(data || [])
      setTotalPages(Math.ceil((count || 0) / postsPerPage))
      setLoading(false)
    } catch (error: any) {
      console.error("Error fetching posts:", error)
      setError(error.message || "Failed to load posts")
      setLoading(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este artículo? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId)

      if (error) throw error

      // Refresh the posts list
      fetchPosts()
    } catch (error: any) {
      console.error("Error deleting post:", error)
      setError(error.message || "Failed to delete post")
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
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Gestión de Blog</h1>
          <p className="text-gray-600">Administra los artículos del blog de la Peña Lorenzo Sanz</p>
        </div>
        <Link href="/admin/blog/new">
          <Button className="mt-4 md:mt-0 bg-primary hover:bg-secondary">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Artículo
          </Button>
        </Link>
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
              placeholder="Buscar artículos..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando artículos...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              {searchQuery
                ? `No se encontraron artículos que coincidan con "${searchQuery}"`
                : "No hay artículos publicados aún"}
            </p>
            <Link href="/admin/blog/new">
              <Button className="bg-primary hover:bg-secondary">Crear Primer Artículo</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Título</th>
                    <th className="text-left py-3 px-4 hidden md:table-cell">Autor</th>
                    <th className="text-left py-3 px-4 hidden md:table-cell">Categoría</th>
                    <th className="text-left py-3 px-4 hidden md:table-cell">Fecha</th>
                    <th className="text-right py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{post.title}</div>
                        <div className="text-sm text-gray-500 md:hidden">
                          {post.author} • {formatDate(post.created_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">{post.author}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                          {post.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">{formatDate(post.created_at)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver</span>
                            </Button>
                          </Link>
                          <Link href={`/admin/blog/edit/${post.id}`}>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                          <div className="md:hidden">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Más acciones</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/blog/${post.slug}`} target="_blank">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/blog/edit/${post.id}`}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-500 focus:text-red-500"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
                  Mostrando {(currentPage - 1) * postsPerPage + 1} a{" "}
                  {Math.min(currentPage * postsPerPage, totalPages * postsPerPage)} de {totalPages * postsPerPage}{" "}
                  artículos
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

