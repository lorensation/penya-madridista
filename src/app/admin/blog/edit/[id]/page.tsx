import React from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { BlogPostForm } from "@/components/blog/blog-post-form";
import type { Metadata } from "next";

// Simple function to get blog post data
async function getBlogPost(id: string) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Using posts table
    const { data, error } = await supabase
      .from("posts")
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

// Updated type for the page props to use Promise-based params for Next.js 15+
type BlogEditProps = {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: BlogEditProps): Promise<Metadata> {
  // Await the params Promise to get the actual params object
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

export default async function Page({ params }: BlogEditProps) {
  // Await the params Promise to get the actual params object
  const resolvedParams = await params;
  const id = resolvedParams.id;
  
  if (!id) {
    redirect("/admin/blog");
  }
  
  const supabase = createServerSupabaseClient();
  
  // Check if user is authenticated and is an admin
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }
  
  // Check if user is an admin
  const { data: profile } = await supabase
    .from("miembros")
    .select("role")
    .eq("user_uuid", user.id)
    .single();
  
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }
  
  // Fetch the blog post to edit
  const post = await getBlogPost(id);
  
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