"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Plus, Search, Edit, Trash2, Eye, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Database } from "@/types/supabase"

// Define the BlogPost type based on your Database type
type BlogPost = Database['public']['Tables']['posts']['Row']

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const postsPerPage = 10

  // Fetch posts directly from Supabase
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate pagination
      const from = (currentPage - 1) * postsPerPage;
      const to = from + postsPerPage - 1;
      
      // Build query
      let query = supabase
        .from('posts')
        .select('*');
      
      // Add search filter if provided
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery.trim()}%,content.ilike.%${searchQuery.trim()}%`);
      }
      
      // Execute query with pagination and ordering
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (error) {
        throw error;
      }
      
      console.log('Fetch results:', {
        postsCount: data?.length || 0,
        totalCount: count || 0,
        page: currentPage,
        limit: postsPerPage
      });
      
      // Update state with the results
      setPosts(data || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / postsPerPage));
      setError(null);
      
    } catch (error) {
      console.error("Error fetching posts:", error);
      setError(error instanceof Error ? error.message : "Failed to load posts");
      setPosts([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, postsPerPage]);

  // Fetch posts on initial load and when page changes
  useEffect(() => {
    fetchPosts();
  }, [currentPage, fetchPosts]);

  // Add debounced search to improve performance
  useEffect(() => {
    if (searchQuery.trim() === '') {
      fetchPosts();
      return;
    }
    
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      fetchPosts();
    }, 300); // 300ms debounce delay
    
    return () => clearTimeout(timer);
  }, [searchQuery, fetchPosts]);

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este artículo? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error
      
      // Update UI after successful deletion
      setPosts((currentPosts) => currentPosts.filter(post => post.id !== postId));
      setTotalCount((prevCount) => Math.max(0, prevCount - 1));
      
      // Recalculate total pages
      const newTotalPages = Math.ceil((totalCount - 1) / postsPerPage);
      setTotalPages(newTotalPages);
      
      // If current page is now empty and not the first page, go to previous page
      if (currentPage > 1 && currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      } else {
        // Otherwise refresh the data to ensure consistency
        await fetchPosts();
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      setError(error instanceof Error ? error.message : "Failed to delete post");
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Sin fecha";
    
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">Gestión de Blog</h1>
          <p className="text-gray-600">Administra los artículos del blog de la Peña Lorenzo Sanz</p>
        </div>
        <Link href="/admin/blog/new">
          <Button className="mt-4 md:mt-0 w-full transition-all hover:bg-white hover:text-primary hover:border hover:border-black">
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
              onChange={handleSearchChange}
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
              <Button className="transition-all hover:bg-white hover:text-primary hover:border hover:border-black">Crear Primer Artículo</Button>
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
                    <th className="text-left py-3 px-4 hidden md:table-cell">Estado</th>
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
                      <td className="py-3 px-4 hidden md:table-cell">
                        <span className={`px-2 py-1 text-xs rounded-full ${post.published ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {post.published ? "Publicado" : "Borrador"}
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
                  {Math.min(currentPage * postsPerPage, totalCount)} de {totalCount}{" "}
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