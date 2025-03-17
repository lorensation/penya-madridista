"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save } from "lucide-react"

export default function EditBlogPost({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    author: "",
    category: "",
    imageUrl: "",
  })
  const [originalSlug, setOriginalSlug] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase.from("posts").select("*").eq("id", params.id).single()

        if (error) throw error

        if (!data) {
          throw new Error("Artículo no encontrado")
        }

        setFormData({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt || "",
          content: data.content,
          author: data.author,
          category: data.category,
          imageUrl: data.image_url || "/placeholder.svg?height=600&width=1200",
        })
        setOriginalSlug(data.slug)
        setLoading(false)
      } catch (error: any) {
        console.error("Error fetching post:", error)
        setError(error.message || "Failed to load post")
        setLoading(false)
      }
    }

    fetchPost()
  }, [params.id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    // Auto-generate slug from title only if slug hasn't been manually edited
    if (name === "title" && formData.slug === originalSlug) {
      const slug = value
        .toLowerCase()
        .replace(/[^\w\s]/gi, "")
        .replace(/\s+/g, "-")

      setFormData((prev) => ({
        ...prev,
        [name]: value,
        slug,
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.title || !formData.slug || !formData.content || !formData.author || !formData.category) {
        throw new Error("Por favor, completa todos los campos obligatorios")
      }

      // Check if slug already exists (only if changed)
      if (formData.slug !== originalSlug) {
        const { data: existingPost, error: slugCheckError } = await supabase
          .from("posts")
          .select("id")
          .eq("slug", formData.slug)
          .single()

        if (slugCheckError && slugCheckError.code !== "PGRST116") {
          throw slugCheckError
        }

        if (existingPost) {
          throw new Error(
            "Ya existe un artículo con este slug. Por favor, elige otro título o modifica el slug manualmente.",
          )
        }
      }

      // Update post
      const { error: updateError } = await supabase
        .from("posts")
        .update({
          title: formData.title,
          slug: formData.slug,
          excerpt: formData.excerpt,
          content: formData.content,
          author: formData.author,
          category: formData.category,
          image_url: formData.imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (updateError) throw updateError

      // Redirect to blog list
      router.push("/admin/blog")
    } catch (error: any) {
      console.error("Error updating post:", error)
      setError(error.message || "Failed to update post")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando artículo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <Link href="/admin/blog" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">Editar Artículo</h1>
          <p className="text-gray-600">Modifica los detalles del artículo</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug <span className="text-red-500">*</span>
              </Label>
              <Input id="slug" name="slug" value={formData.slug} onChange={handleChange} required />
              <p className="text-xs text-gray-500">Identificador único para la URL del artículo</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excerpt">Extracto</Label>
            <Textarea id="excerpt" name="excerpt" value={formData.excerpt} onChange={handleChange} rows={2} />
            <p className="text-xs text-gray-500">Breve descripción que aparecerá en la lista de artículos</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">
              Contenido <span className="text-red-500">*</span>
            </Label>
            <Textarea id="content" name="content" value={formData.content} onChange={handleChange} rows={15} required />
            <p className="text-xs text-gray-500">Puedes usar HTML para dar formato al contenido</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="author">
                Autor <span className="text-red-500">*</span>
              </Label>
              <Input id="author" name="author" value={formData.author} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">
                Categoría <span className="text-red-500">*</span>
              </Label>
              <Input id="category" name="category" value={formData.category} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL de la imagen</Label>
              <Input id="imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleChange} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="bg-primary hover:bg-secondary" disabled={saving}>
              {saving ? (
                <>Guardando...</>
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

