"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the form schema
const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Content is required"),
  image_url: z.string().optional(),
  published: z.boolean().default(false),
});

// Define the form values type
type BlogPostFormValues = z.infer<typeof formSchema>;

// Define the component props
interface BlogPostFormProps {
  initialData?: BlogPostFormValues & { id: string };
}

export function BlogPostForm({ initialData }: BlogPostFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!initialData;
  const { toast } = useToast();

  // Initialize the form with default values or initial data
  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      image_url: "",
      published: false,
    },
  });

  // Generate a slug from the title
  function generateSlug(title: string): string {
      return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-"); // Replace multiple hyphens with a single hyphen
    }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    form.setValue("title", title);
    form.setValue("slug", generateSlug(title));
  };

  const slug = generateSlug(form.getValues("title"));
  form.setValue("slug", slug);
  

  // Handle form submission
  async function onSubmit(values: BlogPostFormValues) {
    setIsLoading(true);

    try {
      if (isEditing) {
        // Update existing post - changed from blog_posts to posts
        const { error } = await supabase
          .from("posts")
          .update({
            title: values.title,
            slug: values.slug,
            excerpt: values.excerpt,
            content: values.content,
            image_url: values.image_url || null,
            published: values.published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id);

        if (error) throw error;

        toast({
          title: "Blog post updated",
          description: "Your blog post has been updated successfully.",
        });
      } else {
        // Create new post - changed from blog_posts to posts
        const { error } = await supabase
          .from("posts")
          .insert({
            title: values.title,
            slug: values.slug,
            excerpt: values.excerpt,
            content: values.content,
            image_url: values.image_url || null,
            published: values.published,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Add default values for required fields
            author: "Peña Lorenzo Sanz Web", // Default author
            category: "Blog", // Default category
          });

        if (error) throw error;

        toast({
          title: "Blog post created",
          description: "Your blog post has been created successfully.",
        });
      }

      // Redirect to blog list
      router.push("/admin/blog");
      router.refresh();
    } catch (error) {
      console.error("Error saving blog post:", error);
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Failed to save blog post. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter blog post title" 
                  {...field} 
                  onChange={handleTitleChange}
                />
              </FormControl>
              <FormDescription>
                The title of your blog post.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input placeholder="enter-blog-post-slug" {...field} />
              </FormControl>
              <FormDescription>
                The URL-friendly version of the title.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Brief summary of the blog post" 
                  className="resize-none h-20"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                A short summary that appears in blog listings.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Write your blog post content here..." 
                  className="resize-none h-64"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                The main content of your blog post.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="image_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Featured Image URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.jpg" {...field} />
              </FormControl>
              <FormDescription>
                URL to the featured image for this post.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="published"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value}
                  onChange={field.onChange}
                  className="h-4 w-4 mt-1"
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Published</FormLabel>
                <FormDescription>
                  Check this to make the post publicly visible.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push("/admin/blog")}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              "Saving..."
            ) : isEditing ? (
              "Update Post"
            ) : (
              "Create Post"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}