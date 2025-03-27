"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save } from "lucide-react"
import type { BlogPost, FormResult } from "@/types/common"

export default function EditBlogPostPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    author: "",
    category: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<FormResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase.from("posts").select("*").eq("id", params.id).single()

        if (error) throw error

        setPost(data)
        setFormData({
          title: data.title || "",
          slug: data.slug || "",
          content: data.content || "",
          excerpt: data.excerpt || "",
          author: data.author || "",
          category: data.category || "",
        })
      } catch (error) {
        console.error("Error fetching post:", error)
        setError(error instanceof Error ? error.message : "Failed to load post")
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [params.id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-")
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    setError(null)

    try {
      const { error } = await supabase
        .from("posts")
        .update({
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          excerpt: formData.excerpt,
          author: formData.author,
          category: formData.category,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) throw error

      setResult({
        success: true,
        message: "Post updated successfully!",
      })
    } catch (error) {
      console.error("Error updating post:", error)
      setError(error instanceof Error ? error.message : "Failed to update post")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando artículo...</p>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>No se encontró el artículo solicitado.</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push("/admin/blog")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al listado
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => router.push("/admin/blog")} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-primary">Editar Artículo</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result?.success && (
        <Alert className="bg-green-50 border-green-200 text-green-800 mb-6">
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleTitleChange}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug (URL)</Label>
            <Input id="slug" name="slug" value={formData.slug} onChange={handleChange} required className="mt-1" />
            <p className="text-sm text-gray-500 mt-1">
              Identificador único para la URL del artículo (sin espacios ni caracteres especiales)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="author">Autor</Label>
              <Input id="author" name="author" value={formData.author} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Input id="category" name="category" value={formData.category} onChange={handleChange} className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="excerpt">Extracto</Label>
            <Textarea
              id="excerpt"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              className="mt-1 h-24"
            />
            <p className="text-sm text-gray-500 mt-1">Breve resumen del artículo (opcional)</p>
          </div>

          <div>
            <Label htmlFor="content">Contenido</Label>
            <Textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              className="mt-1 min-h-[300px]"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="bg-primary hover:bg-secondary" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

