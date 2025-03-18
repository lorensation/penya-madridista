"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase-browser"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [envReady, setEnvReady] = useState(false)
  const router = useRouter()

  // Check if environment variables are loaded
  useEffect(() => {
    const checkEnv = () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (url && key) {
        setEnvReady(true)
      } else {
        console.warn("Supabase environment variables not loaded yet")
        // Try again in a second
        setTimeout(checkEnv, 1000)
      }
    }

    checkEnv()
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Check if environment variables are loaded
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setError("Application is still initializing. Please try again in a moment.")
      setLoading(false)
      return
    }

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          // Use a simpler approach for the redirect URL
          emailRedirectTo: window.location.origin + "/api/auth/callback",
        },
      })

      if (signUpError) {
        throw signUpError
      }

      // We'll let the email verification process handle profile creation
      router.push("/auth/verify")
    } catch (error: any) {
      console.error("Registration error:", error)
      setError(error.message || "Failed to register")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!envReady && (
        <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
          <AlertDescription>
            Application is initializing. You may need to refresh the page if registration doesn't work.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !envReady}>
        {loading ? "Registering..." : "Register"}
      </Button>
    </form>
  )
}

