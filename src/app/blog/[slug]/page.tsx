import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Metadata } from "next"

// Updated type for the page props to use Promise-based params for Next.js 15+
type BlogPostProps = {
  params: Promise<{
    slug: string
  }>
}

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
      .limit(3)

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

export async function generateMetadata({ params }: BlogPostProps): Promise<Metadata> {
  // Await the params Promise to get the actual params object
  const resolvedParams = await params
  const post = await getBlogPost(resolvedParams.slug)

  if (!post) {
    return {
      title: "Post not found",
      description: "The requested blog post could not be found",
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      images: post.image_url ? [post.image_url] : [],
    },
  }
}

export default async function BlogPost({ params }: BlogPostProps) {
  // Await the params Promise to get the actual params object
  const resolvedParams = await params
  const post = await getBlogPost(resolvedParams.slug)

  if (!post) {
    notFound()
  }

  const relatedPosts = await getRelatedPosts(post.id, post.category)

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <article className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="relative h-96 w-full">
            <Image
              src={post.image_url || "/placeholder.svg?height=600&width=1200"}
              alt={post.title}
              fill
              priority
              className="object-cover"
            />
          </div>

          <div className="p-8">
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">{post.category}</span>
              <span className="mx-2">•</span>
              <span>
                {post.created_at ? new Date(post.created_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }) : ""}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-primary mb-4">{post.title}</h1>

            <div className="flex items-center mb-8">
              <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 overflow-hidden relative">
                <div className="flex items-center justify-center h-full text-gray-500">{post.author.charAt(0)}</div>
              </div>
              <span className="text-gray-700">Por {post.author}</span>
            </div>

            <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <Link href="/blog">
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">
                    ← Volver al Blog
                  </Button>
                </Link>

                <div className="flex space-x-4">
                  <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                    <span className="sr-only">Compartir en Facebook</span>
                  </Button>

                  <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                    </svg>
                    <span className="sr-only">Compartir en Twitter</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-primary mb-8 text-center">Artículos Relacionados</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <Card key={relatedPost.id} className="overflow-hidden">
                  <div className="relative h-48">
                    <Image
                      src={relatedPost.image_url || "/placeholder.svg?height=400&width=600"}
                      alt={relatedPost.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <CardContent className="p-6">
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <span>{relatedPost.category}</span>
                      <span className="mx-2">•</span>
                      <span>
                        {relatedPost.created_at ? new Date(relatedPost.created_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }) : ""}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-primary mb-2 line-clamp-2">{relatedPost.title}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">{relatedPost.excerpt}</p>

                    <Link href={`/blog/${relatedPost.slug}`}>
                      <Button
                        variant="outline"
                        className="text-sm border-primary text-primary hover:bg-primary hover:text-white"
                      >
                        Leer Más
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
