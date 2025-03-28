import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { BlogPostForm } from "@/components/blog/blog-post-form";
import type { Metadata } from "next";

// Simple function to get blog post data
async function getBlogPost(id: string) {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("Error fetching blog post:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error fetching blog post:", error);
    return null;
  }
}

// Metadata generation function with Promise params
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  // Await the params Promise
  const resolvedParams = await params;
  const post = await getBlogPost(resolvedParams.id);

  if (!post) {
    return {
      title: "Edit Post | Admin",
      description: "Edit a blog post",
    };
  }

  return {
    title: `Edit: ${post.title} | Admin`,
    description: `Edit the blog post: ${post.title}`,
  };
}

// Page component with Promise params
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Await the params Promise
  const resolvedParams = await params;
  const supabase = createServerSupabaseClient();
  
  // Check if user is authenticated and is an admin
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }
  
  // Check if user is an admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }
  
  // Fetch the blog post to edit
  const post = await getBlogPost(resolvedParams.id);
  
  if (!post) {
    redirect("/admin/blog");
  }
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Edit Blog Post</h1>
      <BlogPostForm initialData={post} />
    </div>
  );
}