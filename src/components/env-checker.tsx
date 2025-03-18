"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function EnvChecker() {
  const [envStatus, setEnvStatus] = useState<{
    supabaseUrl: boolean
    supabaseAnonKey: boolean
  }>({
    supabaseUrl: false,
    supabaseAnonKey: false,
  })

  useEffect(() => {
    setEnvStatus({
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  }, [])

  if (envStatus.supabaseUrl && envStatus.supabaseAnonKey) {
    return null
  }

  return (
    <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 mb-4">
      <AlertDescription>
        <p className="font-bold">Environment Variable Status:</p>
        <ul className="list-disc pl-5 mt-2">
          <li>NEXT_PUBLIC_SUPABASE_URL: {envStatus.supabaseUrl ? "✅ Loaded" : "❌ Missing"}</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY: {envStatus.supabaseAnonKey ? "✅ Loaded" : "❌ Missing"}</li>
        </ul>
        <p className="mt-2">
          If variables are missing, please check your environment configuration or try refreshing the page.
        </p>
      </AlertDescription>
    </Alert>
  )
}

