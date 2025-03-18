import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Calendar, User } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"

async function getBlogPost(slug: string) {
  try {
    const { data, error } = await supabase.from("posts").select("*").eq("slug", slug).single()

    if (error || !data) {
      console.error("Error fetching blog post:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error fetching blog post:", error)
    return null
  }
}

async function getRelatedPosts(currentPostId: string, category: string) {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("category", category)
      .neq("id", currentPostId)
      .limit(2)

    if (error) {
      console.error("Error fetching related posts:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error fetching related posts:", error)
    return []
  }
}

export default async function BlogPost({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = await getRelatedPosts(post.id, post.category)

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/blog" className="inline-flex items-center text-primary hover:text-secondary mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Blog
          </Link>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative h-96">
              <Image
                src={post.image_url || "/placeholder.svg?height=600&width=1200"}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
            <div className="p-8">
              <div className="flex flex-wrap items-center text-sm text-gray-500 mb-4">
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">{post.category}</span>
                <span className="flex items-center ml-4">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(post.created_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center ml-4">
                  <User className="h-4 w-4 mr-1" />
                  {post.author}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6">{post.title}</h1>

              <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />

              {relatedPosts.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <h2 className="text-2xl font-bold text-primary mb-6">Artículos Relacionados</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {relatedPosts.map((relatedPost) => (
                      <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                        <div className="group bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="relative h-48">
                            <Image
                              src={relatedPost.image_url || "/placeholder.svg?height=200&width=300"}
                              alt={relatedPost.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-bold text-primary mb-2 group-hover:text-secondary transition-colors">
                              {relatedPost.title}
                            </h3>
                            <p className="text-gray-600 text-sm line-clamp-2">{relatedPost.excerpt}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

