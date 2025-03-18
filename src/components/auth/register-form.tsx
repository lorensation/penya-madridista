"use client"

import type React from "react"

import { useState } from "react"
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
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Sign up with Supabase Auth
      const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      // Create user profile using server action
      // This will be handled by a server action in a separate file

      router.push("/auth/verify")
    } catch (error: any) {
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
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </Button>
    </form>
  )
}

