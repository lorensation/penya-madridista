import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { addUserToNewsletter } from "@/app/actions/newsletter"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const tokenHash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const next = requestUrl.searchParams.get("next") || "/dashboard"

  const supabase = await createServerSupabaseClient()
  let authUser = null

  // Support token_hash + type flow (from Supabase email templates using verifyOtp)
  if (tokenHash && type) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "email" | "signup" | "recovery" | "invite" | "magiclink" | "email_change",
      })

      if (error) {
        console.error("Error verifying OTP:", error)
      } else {
        authUser = data?.user || null
      }
    } catch (err) {
      console.error("Exception in OTP verification:", err)
    }
  }
  // Support code flow (PKCE / standard OAuth)
  else if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error exchanging code for session:", error)
      } else {
        authUser = data?.user || null
      }
    } catch (err) {
      console.error("Exception in code exchange:", err)
    }
  }

  // Post-auth profile creation (runs for both flows)
  if (authUser) {
    try {
      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from("miembros")
        .select("id")
        .eq("user_uuid", authUser.id)
        .maybeSingle()

      // If profile doesn't exist, create it
      if ((profileError || !profile) && authUser.email) {
        const { error: insertError } = await supabase.from("miembros").insert({
          id: authUser.id,
          user_uuid: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email!.split("@")[0] || "",
          role: "user",
          created_at: new Date().toISOString(),
          es_socio_realmadrid: false,
          fecha_nacimiento: "1990-01-01",
          socio_carnet_madridista: false,
          telefono: 0,
        })

        if (insertError) {
          console.error("Error creating profile in callback:", insertError)
        }
        
        // Check if the user opted in for newsletter (stored in user metadata)
        const subscribeNewsletter = authUser.user_metadata?.subscribeToNewsletter === true
        
        if (subscribeNewsletter && authUser.email) {
          try {
            const subscribed = await addUserToNewsletter(
              authUser.email, 
              authUser.user_metadata?.name || ""
            )
            
            if (!subscribed) {
              console.log("User wanted to subscribe to newsletter but couldn't be subscribed")
            }
          } catch (newsletterError) {
            console.error("Error in newsletter subscription during auth callback:", newsletterError)
          }
        }
      }
    } catch (err) {
      console.error("Exception in post-auth profile setup:", err)
    }
  }

  // Normalize base URL to avoid double-slash issues
  const baseUrl = requestUrl.origin
  const redirectPath = next.startsWith("/") ? next : `/${next}`
  return NextResponse.redirect(new URL(redirectPath, baseUrl))
}
