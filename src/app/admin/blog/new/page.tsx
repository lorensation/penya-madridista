"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save } from "lucide-react"
import type { FormResult } from "@/types/common"

export default function NewBlogPostPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    author: "",
    category: "",
  })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<FormResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      slug: generateSlug(title),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setResult(null)
    setError(null)

    try {
      // Validate required fields
      if (!formData.title || !formData.slug || !formData.content) {
        throw new Error("Por favor completa los campos obligatorios")
      }

      // Check if slug already exists
      const { data: existingPost, error: checkError } = await supabase
        .from("posts")
        .select("id")
        .eq("slug", formData.slug)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingPost) {
        throw new Error("Ya existe un artículo con este slug. Por favor usa uno diferente.")
      }

      // Create the post
      const { error: insertError } = await supabase.from("posts").insert({
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt || null,
        author: formData.author || null,
        category: formData.category || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (insertError) throw insertError

      setResult({
        success: true,
        message: "¡Artículo creado con éxito!",
      })

      // Reset form after successful submission
      setFormData({
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        author: "",
        category: "",
      })

      // Redirect to blog list after a short delay
      setTimeout(() => {
        router.push("/admin/blog")
      }, 2000)
    } catch (error) {
      console.error("Error creating post:", error)
      setError(error instanceof Error ? error.message : "Error al crear el artículo")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => router.push("/admin/blog")} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold text-primary">Nuevo Artículo</h1>
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
            <Label htmlFor="title">Título *</Label>
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
            <Label htmlFor="slug">Slug (URL) *</Label>
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
            <Label htmlFor="content">Contenido *</Label>
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
            <Button type="submit" className="transition-all bg-black text-white hover:bg-white hover:text-primary hover:border hover:border-black" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Publicar Artículo
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

