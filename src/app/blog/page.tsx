import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

async function getBlogPosts() {
  try {
    const { data, error } = await supabase.from("posts").select("*").eq("published", true).order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching blog posts:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching blog posts:", error)
    return []
  }
}

export default async function Blog() {
  const blogPosts = await getBlogPosts()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">Blog</h1>
          <p className="text-lg text-gray-600">
            Noticias, historias y eventos relacionados con la Peña Lorenzo Sanz y el Real Madrid.
          </p>
        </div>

        {blogPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No hay artículos publicados aún.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="relative h-48">
                  <Image
                    src={post.image_url || "/placeholder.svg?height=400&width=600"}
                    alt={post.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <span>{post.category}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Date(post.created_at).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-primary mb-2 line-clamp-2">{post.title}</h2>
                  <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Por {post.author}</span>
                    <Link href={`/blog/${post.slug}`}>
                      <Button
                        variant="outline"
                        className="text-sm border-primary text-primary hover:bg-primary hover:text-white"
                      >
                        Leer Más
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {blogPosts.length > 0 && (
          <div className="mt-12 text-center">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
              Cargar Más Artículos
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

