import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { addUserToNewsletter } from "@/app/actions/newsletter"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/dashboard"

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error && data?.user) {
        // Check if user profile exists
        const { data: profile, error: profileError } = await supabase
          .from("miembros")
          .select("id")
          .eq("id", data.user.id)
          .single()

        // If profile doesn't exist, create it
        if ((profileError || !profile) && data.user.email) {
          const { error: insertError } = await supabase.from("miembros").insert({
            id: data.user.id, // This links to auth.users(id)
            user_uuid: data.user.id, // This links to users(id)
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email.split("@")[0] || "",
            role: "user",
            created_at: new Date().toISOString(),
          })

          if (insertError) {
            console.error("Error creating profile in callback:", insertError)
          }
          
          // Check if the user opted in for newsletter (stored in user metadata)
          const subscribeNewsletter = data.user.user_metadata?.subscribeToNewsletter === true
          
          if (subscribeNewsletter && data.user.email) {
            try {
              await addUserToNewsletter(
                data.user.email, 
                data.user.user_metadata?.name || ""
              )
            } catch (newsletterError) {
              console.error("Error subscribing user to newsletter in callback:", newsletterError)
            }
          }
        }
      }
    } catch (err) {
      console.error("Exception in auth callback:", err)
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(next, request.url))
}
